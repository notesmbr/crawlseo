import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { runSiteCrawl } from "@/lib/crawler/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

type RunMode = "baseline" | "weekly" | "post_deploy";

function unauthorized() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function validAutomationToken(request: Request) {
  const configured =
    process.env.CRAWLSEO_AUTOMATION_TOKEN?.trim() || process.env.APP_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!configured || !supplied) return false;
  const configuredBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);

  return (
    configuredBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(configuredBuffer, suppliedBuffer)
  );
}

function normalizedDomain(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  if (!validAutomationToken(request)) return unauthorized();

  let body: {
    domain?: string;
    mode?: RunMode;
    maxPages?: number;
    sitemapOnly?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const domain = normalizedDomain(body.domain ?? "bluestreamfly.com");
  const mode = body.mode ?? "weekly";
  const maxPages = Math.max(1, Math.min(body.maxPages ?? 1_000, 2_000));

  if (!domain || !["baseline", "weekly", "post_deploy"].includes(mode)) {
    return Response.json({ error: "Invalid crawl request" }, { status: 400 });
  }

  const sites = await db.site.findMany({ select: { id: true, domain: true } });
  const site = sites.find((candidate) => normalizedDomain(candidate.domain) === domain);
  if (!site) {
    return Response.json({ error: `Site not configured: ${domain}` }, { status: 404 });
  }

  const running = await db.crawl.findFirst({
    where: { siteId: site.id, status: { in: ["PENDING", "RUNNING"] } },
    select: { id: true },
  });
  if (running) {
    return Response.json(
      { error: "A crawl is already running", crawlId: running.id },
      { status: 409 },
    );
  }

  const crawl = await db.crawl.create({
    data: { siteId: site.id, status: "PENDING", maxPages },
  });

  try {
    const result = await runSiteCrawl(site.id, site.domain, maxPages, crawl.id, {
      sitemapOnly: body.sitemapOnly ?? false,
    });
    let baselineVerifiedAt: string | null = null;

    if (mode === "baseline") {
      const verifiedAt = new Date();
      await db.$transaction([
        db.crawl.updateMany({
          where: { siteId: site.id, isBaseline: true },
          data: { isBaseline: false, baselineVerifiedAt: null },
        }),
        db.crawl.update({
          where: { id: crawl.id },
          data: {
            isBaseline: true,
            baselineVerifiedAt: verifiedAt,
            newIssuesFound: 0,
            verifiedIssuesFound: 0,
          },
        }),
        db.crawlIssue.updateMany({
          where: { crawlId: crawl.id },
          data: {
            isNew: false,
            isVerified: false,
            suppressedReason: "known_baseline",
          },
        }),
        db.site.update({
          where: { id: site.id },
          data: {
            crawlBaselineId: crawl.id,
            crawlBaselineVerifiedAt: verifiedAt,
          },
        }),
      ]);
      baselineVerifiedAt = verifiedAt.toISOString();
    } else if (result.baselineCrawlId) {
      const baseline = await db.site.findUnique({
        where: { id: site.id },
        select: { crawlBaselineVerifiedAt: true },
      });
      baselineVerifiedAt = baseline?.crawlBaselineVerifiedAt?.toISOString() ?? null;
    }

    const findings =
      mode === "baseline"
        ? []
        : await db.crawlIssue.findMany({
            where: {
              crawlId: crawl.id,
              isNew: true,
              isActionable: true,
              isVerified: true,
            },
            orderBy: [{ severity: "asc" }, { type: "asc" }, { url: "asc" }],
            select: {
              fingerprint: true,
              url: true,
              type: true,
              severity: true,
              message: true,
              details: true,
            },
          });

    return Response.json(
      {
        ok: true,
        mode,
        domain,
        baselineVerifiedAt,
        healthScoreInformational: true,
        ...result,
        newIssuesFound: mode === "baseline" ? 0 : result.newIssuesFound,
        verifiedIssuesFound: findings.length,
        findings,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Crawl failed", crawlId: crawl.id },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
