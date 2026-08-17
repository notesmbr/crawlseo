import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getPageSpeedCapability,
  PageSpeedClientError,
} from "@/lib/google/pagespeed-client";
import { normalizeCanonicalForSite } from "@/lib/measurement/canonical";
import { measurementRunToApi } from "@/lib/measurement/run-ledger";
import { syncVitalsForCanonical } from "@/lib/workers/vitals-sync";

async function authorizedSite(siteId: string, userId: string) {
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  return site && site.userId === userId ? site : null;
}

function reportToApi(report: Awaited<ReturnType<typeof db.vitalsReport.findFirst>>) {
  if (!report) return null;
  return {
    id: report.id,
    canonicalUrl: report.url,
    device: report.device.toLowerCase(),
    evidenceState: report.evidenceState.toLowerCase(),
    source: report.source.toLowerCase(),
    checkedAt: report.date.toISOString(),
    analysisAt: report.analysisAt?.toISOString() ?? null,
    fieldDataCategory: report.fieldDataCategory,
    originFieldDataAvailable: report.originFieldDataAvailable,
    lcp: report.lcp,
    cls: report.cls,
    inp: report.inp,
    performanceScore: report.perfScore,
    speedIndex: report.speedIndex,
    ttfb: report.ttfb,
    errorCode: report.errorCode,
    errorMessage: report.errorMessage,
  };
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

  const rawCanonical = new URL(request.url).searchParams.get("canonical");
  if (!rawCanonical) {
    return Response.json(
      { capability: getPageSpeedCapability(), canonicalUrl: null, evidenceState: "missing" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  let canonicalUrl: string;
  try {
    canonicalUrl = normalizeCanonicalForSite(rawCanonical, site.domain);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid canonical." },
      { status: 400 },
    );
  }

  const [mobile, desktop, latestRun] = await Promise.all([
    db.vitalsReport.findFirst({
      where: { siteId, url: canonicalUrl, device: "MOBILE" },
      orderBy: { date: "desc" },
    }),
    db.vitalsReport.findFirst({
      where: { siteId, url: canonicalUrl, device: "DESKTOP" },
      orderBy: { date: "desc" },
    }),
    db.measurementSyncRun.findFirst({
      where: { siteId, canonicalUrl, source: "PAGESPEED" },
      orderBy: { startedAt: "desc" },
    }),
  ]);
  return Response.json(
    {
      capability: getPageSpeedCapability(),
      canonicalUrl,
      evidenceState: mobile?.evidenceState.toLowerCase() ?? "missing",
      mobile: reportToApi(mobile),
      desktop: reportToApi(desktop),
      latestRun: measurementRunToApi(latestRun),
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
  if (!(await authorizedSite(siteId, session.user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  let body: { canonicalUrl?: unknown; device?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.canonicalUrl !== "string") {
    return Response.json({ error: "canonicalUrl is required." }, { status: 400 });
  }
  const device = body.device === undefined ? "MOBILE" : body.device;
  if (device !== "MOBILE" && device !== "DESKTOP") {
    return Response.json({ error: "device must be MOBILE or DESKTOP." }, { status: 400 });
  }

  try {
    const result = await syncVitalsForCanonical({
      userId: session.user.id,
      siteId,
      canonicalUrl: body.canonicalUrl,
      device,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PageSpeedClientError) {
      return Response.json(
        { error: error.message, code: error.code, capability: getPageSpeedCapability() },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("PageSpeed canonical check failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "PageSpeed canonical check failed." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
