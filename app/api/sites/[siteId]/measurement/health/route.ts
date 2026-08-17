import type { MeasurementRunStatus, MeasurementSource } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGa4DataCapability } from "@/lib/google/ga4-data-client";
import { getPageSpeedCapability } from "@/lib/google/pagespeed-client";
import { measurementRunToApi } from "@/lib/measurement/run-ledger";

async function runHealth(siteId: string, source: MeasurementSource) {
  const latestForStatus = (status?: MeasurementRunStatus) =>
    db.measurementSyncRun.findFirst({
      where: { siteId, source, ...(status ? { status } : {}) },
      orderBy: { startedAt: "desc" },
    });
  const [latest, lastSuccess, lastPartial, lastFailure] = await Promise.all([
    latestForStatus(),
    latestForStatus("SUCCESS"),
    latestForStatus("PARTIAL"),
    latestForStatus("FAILED"),
  ]);
  return {
    latest: measurementRunToApi(latest),
    lastSuccess: measurementRunToApi(lastSuccess),
    lastPartial: measurementRunToApi(lastPartial),
    lastFailure: measurementRunToApi(lastFailure),
  };
}

function hasGoogleOauthTokens(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const tokens = value as Record<string, unknown>;
  return (
    typeof tokens.accessToken === "string" &&
    Boolean(tokens.accessToken) &&
    typeof tokens.refreshToken === "string" &&
    Boolean(tokens.refreshToken)
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { siteId } = await params;
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: {
      userId: true,
      gscProperty: true,
      user: { select: { googleTokens: true } },
    },
  });
  if (!site || site.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [gscRuns, ga4Runs, pageSpeedRuns, gscPages, gscKeywords, ga4Metrics, vitals] = await Promise.all([
    runHealth(siteId, "GSC"),
    runHealth(siteId, "GA4"),
    runHealth(siteId, "PAGESPEED"),
    db.page.aggregate({
      where: { siteId },
      _count: { _all: true },
      _max: { date: true },
    }),
    db.keyword.aggregate({
      where: { siteId },
      _count: { _all: true },
      _max: { date: true },
    }),
    db.ga4PageMetric.aggregate({
      where: { siteId, trafficScope: "ORGANIC_SEARCH" },
      _count: { _all: true },
      _max: { date: true },
    }),
    db.vitalsReport.aggregate({
      where: { siteId },
      _count: { _all: true },
      _max: { date: true },
    }),
  ]);

  const oauthConfigured = hasGoogleOauthTokens(site.user.googleTokens);
  const gscConfigured = Boolean(site.gscProperty && oauthConfigured);
  return Response.json(
    {
      checkedAt: new Date().toISOString(),
      sources: {
        gsc: {
          capability: {
            available: gscConfigured,
            propertyConfigured: Boolean(site.gscProperty),
            oauthConfigured,
            mode: "manual_oauth_sync",
          },
          runs: gscRuns,
          storedCoverage: {
            pageRows: gscPages._count._all,
            keywordRows: gscKeywords._count._all,
            latestPageDate: gscPages._max.date?.toISOString().slice(0, 10) ?? null,
            latestKeywordDate:
              gscKeywords._max.date?.toISOString().slice(0, 10) ?? null,
          },
        },
        ga4: {
          capability: getGa4DataCapability(),
          runs: ga4Runs,
          storedCoverage: {
            dailyCanonicalRows: ga4Metrics._count._all,
            latestDate: ga4Metrics._max.date?.toISOString().slice(0, 10) ?? null,
          },
        },
        pageSpeed: {
          capability: getPageSpeedCapability(),
          runs: pageSpeedRuns,
          storedCoverage: {
            reports: vitals._count._all,
            latestCheckedAt: vitals._max.date?.toISOString() ?? null,
          },
        },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
