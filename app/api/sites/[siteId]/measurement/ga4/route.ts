import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Ga4DataApiError,
  getGa4DataCapability,
} from "@/lib/google/ga4-data-client";
import {
  dateOnly,
  normalizeCanonicalForSite,
  parseDateOnly,
} from "@/lib/measurement/canonical";
import { measurementRunToApi } from "@/lib/measurement/run-ledger";
import { importGa4CanonicalMetrics } from "@/lib/workers/ga4-sync";

function defaultWindow() {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  return { startDate: dateOnly(start), endDate: dateOnly(end) };
}

async function authorizedSite(siteId: string, userId: string) {
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  return site && site.userId === userId ? site : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { siteId } = await params;
  const site = await authorizedSite(siteId, session.user.id);
  if (!site) return Response.json({ error: "Not found" }, { status: 404 });

  const url = new URL(request.url);
  let canonicalUrl: string | null = null;
  try {
    if (url.searchParams.get("canonical")) {
      canonicalUrl = normalizeCanonicalForSite(
        url.searchParams.get("canonical")!,
        site.domain,
      );
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid canonical." },
      { status: 400 },
    );
  }

  const [latestRun, metrics] = await Promise.all([
    db.measurementSyncRun.findFirst({
      where: { siteId, source: "GA4", ...(canonicalUrl ? { canonicalUrl } : {}) },
      orderBy: [{ startedAt: "desc" }],
    }),
    canonicalUrl
      ? db.ga4PageMetric.findMany({
          where: { siteId, canonicalUrl, trafficScope: "ORGANIC_SEARCH" },
          orderBy: { date: "desc" },
          take: 400,
        })
      : Promise.resolve([]),
  ]);

  return Response.json(
    {
      capability: getGa4DataCapability(),
      canonicalUrl,
      trafficScope: "organic_search",
      latestRun: measurementRunToApi(latestRun),
      metrics: metrics.map((metric) => ({
        date: metric.date.toISOString().slice(0, 10),
        screenPageViews: metric.screenPageViews,
        sessions: metric.sessions,
        engagedSessions: metric.engagedSessions,
        activeUsers: metric.activeUsers,
        keyEvents: metric.keyEvents,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { siteId } = await params;
  const site = await authorizedSite(siteId, session.user.id);
  if (!site) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: { canonicalUrl?: unknown; startDate?: unknown; endDate?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.canonicalUrl !== "string") {
    return Response.json({ error: "canonicalUrl is required." }, { status: 400 });
  }
  const defaults = defaultWindow();
  const startDate = typeof body.startDate === "string" ? body.startDate : defaults.startDate;
  const endDate = typeof body.endDate === "string" ? body.endDate : defaults.endDate;
  let canonicalUrl: string;
  try {
    canonicalUrl = normalizeCanonicalForSite(body.canonicalUrl, site.domain);
    const start = parseDateOnly(startDate, "startDate");
    const end = parseDateOnly(endDate, "endDate");
    if (start > end) throw new Error("startDate must not be after endDate.");
    if ((end.getTime() - start.getTime()) / 86_400_000 > 366) {
      throw new Error("The GA4 import window cannot exceed 367 days.");
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid date window." },
      { status: 400 },
    );
  }

  try {
    const result = await importGa4CanonicalMetrics({
      userId: session.user.id,
      siteId,
      canonicalUrl,
      startDate,
      endDate,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Ga4DataApiError) {
      return Response.json(
        { error: error.message, code: error.code, capability: getGa4DataCapability() },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("GA4 aggregate import failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "GA4 aggregate import failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
