import type { VitalsReport } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeCanonicalForSite } from "@/lib/measurement/canonical";

function vitalsToApi(report: VitalsReport | null) {
  if (!report) return null;
  return {
    id: report.id,
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
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  if (!site || site.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const rawCanonical = new URL(request.url).searchParams.get("canonical");
  if (!rawCanonical) {
    return Response.json({ error: "canonical is required." }, { status: 400 });
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

  const crawl = await db.crawl.findFirst({
    where: {
      siteId,
      status: "COMPLETED",
    },
    orderBy: [
      { finishedAt: { sort: "desc", nulls: "last" } },
      { startedAt: { sort: "desc", nulls: "last" } },
    ],
    include: {
      auditPages: { where: { url: canonicalUrl }, take: 1 },
      issues: { where: { url: canonicalUrl } },
    },
  });
  const [links, mobileVitals, desktopVitals] = await Promise.all([
    crawl
      ? db.auditLink.findMany({
          where: {
            crawlId: crawl.id,
            isInternal: true,
            OR: [{ sourceUrl: canonicalUrl }, { targetUrl: canonicalUrl }],
          },
          select: {
            sourceUrl: true,
            targetUrl: true,
            anchorText: true,
            isNofollow: true,
            statusCode: true,
          },
          take: 5000,
        })
      : Promise.resolve([]),
    db.vitalsReport.findFirst({
      where: { siteId, url: canonicalUrl, device: "MOBILE" },
      orderBy: { date: "desc" },
    }),
    db.vitalsReport.findFirst({
      where: { siteId, url: canonicalUrl, device: "DESKTOP" },
      orderBy: { date: "desc" },
    }),
  ]);

  const inbound = links.filter((link) => link.targetUrl === canonicalUrl);
  const outbound = links.filter((link) => link.sourceUrl === canonicalUrl);
  const auditPage = crawl?.auditPages[0] ?? null;
  const crawlEvidence = auditPage ? "verified" : "missing";
  const vitalState = mobileVitals?.evidenceState ?? "MISSING";
  const evidenceState =
    crawlEvidence === "missing"
      ? "missing"
      : vitalState === "AVAILABLE"
        ? "verified"
        : "partial";

  return Response.json(
    {
      canonicalUrl,
      checkedAt: new Date().toISOString(),
      evidenceState,
      crawl: crawl && auditPage
        ? {
            id: crawl.id,
            startedAt: crawl.startedAt?.toISOString() ?? null,
            finishedAt: crawl.finishedAt?.toISOString() ?? null,
            status: crawl.status.toLowerCase(),
            healthScore: crawl.healthScore,
            pagesFound: crawl.pagesFound,
            verifiedIssuesFound: crawl.verifiedIssuesFound,
            page: {
              statusCode: auditPage.statusCode,
              redirectUrl: auditPage.redirectUrl,
              title: auditPage.title,
              description: auditPage.description,
              canonical: auditPage.canonical,
              robotsMeta: auditPage.robotsMeta,
              indexable: auditPage.indexable,
              h1Count: auditPage.h1Count,
              wordCount: auditPage.wordCount,
              imageCount: auditPage.imageCount,
              imagesMissingAlt: auditPage.imagesMissingAlt,
              internalLinks: auditPage.internalLinks,
              externalLinks: auditPage.externalLinks,
              hasSchema: auditPage.hasSchema,
              contentScore: auditPage.contentScore,
              responseTimeMs: auditPage.responseTimeMs,
              byteSize: auditPage.byteSize,
            },
          }
        : null,
      crawlIssues: (crawl?.issues ?? []).map((issue) => ({
        id: issue.id,
        type: issue.type.toLowerCase(),
        severity: issue.severity.toLowerCase(),
        message: issue.message,
        isNew: issue.isNew,
        isActionable: issue.isActionable,
        isVerified: issue.isVerified,
        suppressedReason: issue.suppressedReason,
      })),
      internalLinks: {
        inboundCount: inbound.length,
        inboundSourceCount: new Set(inbound.map((link) => link.sourceUrl)).size,
        outboundCount: outbound.length,
        outboundTargetCount: new Set(outbound.map((link) => link.targetUrl)).size,
        nofollowInboundCount: inbound.filter((link) => link.isNofollow).length,
        nofollowOutboundCount: outbound.filter((link) => link.isNofollow).length,
        brokenOutboundCount: outbound.filter(
          (link) => link.statusCode !== null && link.statusCode >= 400,
        ).length,
        inbound: inbound.slice(0, 100),
        outbound: outbound.slice(0, 100),
        truncated: inbound.length > 100 || outbound.length > 100,
      },
      vitals: {
        evidenceState: vitalState.toLowerCase(),
        mobile: vitalsToApi(mobileVitals),
        desktop: vitalsToApi(desktopVitals),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
