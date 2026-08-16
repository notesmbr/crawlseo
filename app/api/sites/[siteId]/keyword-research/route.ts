import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchSuggestions } from "@/lib/google/autocomplete";
import {
  generateGoogleAdsKeywordIdeas,
  getGoogleAdsKeywordPlannerCapability,
  GoogleAdsKeywordPlannerError,
} from "@/lib/google/google-ads-keyword-planner";

async function authorizedSite(siteId: string, userId: string) {
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  return site && site.userId === userId ? site : null;
}

function normalizedHostname(value: string) {
  const candidate = value.includes("://") ? value : `https://${value}`;
  return new URL(candidate).hostname.toLowerCase().replace(/^www\./, "");
}

function pageUrlForSite(value: unknown, domain: string) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) {
    throw new Error("Page URL must be a valid URL on this site.");
  }
  const parsed = new URL(value);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    normalizedHostname(parsed.hostname) !== normalizedHostname(domain)
  ) {
    throw new Error("Page URL must be a valid URL on this site.");
  }
  return parsed.toString();
}

function queryValue(value: unknown) {
  if (typeof value !== "string") return null;
  const query = value.trim();
  return query && query.length <= 200 ? query : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;
    if (!(await authorizedSite(siteId, session.user.id))) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const query = queryValue(url.searchParams.get("q"));
    if (!query) {
      return Response.json(
        { error: "Enter a keyword between 1 and 200 characters." },
        { status: 400 },
      );
    }

    const suggestions = await fetchSuggestions(query);
    return Response.json(
      {
        source: "google_autocomplete",
        capability: getGoogleAdsKeywordPlannerCapability(),
        query,
        checkedAt: new Date().toISOString(),
        keywords: suggestions.map((keyword) => ({
          keyword,
          averageMonthlySearches: null,
          monthlySearchVolumes: [],
          advertiserCompetition: null,
          advertiserCompetitionIndex: null,
          lowTopOfPageBidMicros: null,
          highTopOfPageBidMicros: null,
          closeVariants: [],
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Google Autocomplete keyword research error:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      { error: "Google suggestions could not be checked." },
      { status: 502 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const capability = getGoogleAdsKeywordPlannerCapability();
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;
    const site = await authorizedSite(siteId, session.user.id);
    if (!site) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }
    if (!body || typeof body !== "object") {
      return Response.json(
        { error: "Request body must be a JSON object." },
        { status: 400 },
      );
    }

    const input = body as { query?: unknown; pageUrl?: unknown };
    const query = queryValue(input.query);
    if (!query) {
      return Response.json(
        { error: "Enter a keyword between 1 and 200 characters." },
        { status: 400 },
      );
    }

    let pageUrl: string | null;
    try {
      pageUrl = pageUrlForSite(input.pageUrl, site.domain);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid page URL." },
        { status: 400 },
      );
    }

    const result = await generateGoogleAdsKeywordIdeas({ query, pageUrl });
    return Response.json(
      { ...result, capability },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof GoogleAdsKeywordPlannerError) {
      console.error("Google Keyword Planner check failed", {
        code: error.code,
        requestId: error.requestId,
        status: error.status,
      });
      const headers: Record<string, string> = { "Cache-Control": "no-store" };
      if (error.retryAfterSeconds !== null) {
        headers["Retry-After"] = String(error.retryAfterSeconds);
      }
      return Response.json(
        {
          error: error.message,
          code: error.code,
          capability,
          requestId: error.requestId,
        },
        { status: error.status, headers },
      );
    }

    console.error(
      "Google Keyword Planner route error:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return Response.json(
      {
        error: "Google Keyword Planner could not complete this check.",
        code: "GOOGLE_KEYWORD_PLANNER_REQUEST_FAILED",
        capability,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
