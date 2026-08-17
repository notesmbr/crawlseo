import { db } from "@/lib/db";
import {
  fetchPageSpeed,
  PageSpeedClientError,
} from "@/lib/google/pagespeed-client";
import { getTopPages } from "@/lib/seo-metrics";
import { normalizeCanonicalForSite } from "@/lib/measurement/canonical";
import {
  freshnessFromLatestDate,
  measurementRunToApi,
  safeMeasurementError,
} from "@/lib/measurement/run-ledger";

export async function syncVitalsForCanonical(input: {
  userId: string;
  siteId: string;
  canonicalUrl: string;
  device?: "MOBILE" | "DESKTOP";
}) {
  const site = await db.site.findUnique({
    where: { id: input.siteId },
    select: { userId: true, domain: true },
  });
  if (!site || site.userId !== input.userId) {
    throw new Error("Site not found or unauthorized");
  }
  const canonicalUrl = normalizeCanonicalForSite(input.canonicalUrl, site.domain);
  const device = input.device ?? "MOBILE";
  const run = await db.measurementSyncRun.create({
    data: {
      siteId: input.siteId,
      source: "PAGESPEED",
      status: "RUNNING",
      canonicalUrl,
    },
  });

  try {
    const result = await fetchPageSpeed(canonicalUrl, device);
    const analysisAtCandidate = new Date(result.fetchTime);
    const analysisAt = Number.isNaN(analysisAtCandidate.getTime())
      ? new Date()
      : analysisAtCandidate;
    const evidenceState =
      result.fieldDataState === "URL_LEVEL"
        ? ("AVAILABLE" as const)
        : ("NO_URL_LEVEL_DATA" as const);
    const { report, completedRun } = await db.$transaction(async (tx) => {
      const storedReport = await tx.vitalsReport.create({
        data: {
          siteId: input.siteId,
          syncRunId: run.id,
          url: canonicalUrl,
          device,
          evidenceState,
          source: "PAGESPEED_INSIGHTS",
          analysisAt,
          fieldDataCategory: result.fieldDataCategory ?? null,
          originFieldDataAvailable: result.originFieldDataAvailable,
          lcp: result.vitals.lcp,
          cls: result.vitals.cls,
          inp: result.vitals.inp,
          perfScore: result.metrics.perfScore,
          speedIndex: result.metrics.speedIndex,
          ttfb: result.metrics.ttfb,
        },
      });
      const storedRun = await tx.measurementSyncRun.update({
        where: { id: run.id },
        data: {
          status: evidenceState === "AVAILABLE" ? "SUCCESS" : "PARTIAL",
          rowsFetched: 1,
          rowsWritten: 1,
          latestDataDate: analysisAt,
          freshnessState: freshnessFromLatestDate("PAGESPEED", analysisAt),
          errorCode:
            evidenceState === "NO_URL_LEVEL_DATA"
              ? "NO_URL_LEVEL_FIELD_DATA"
              : null,
          errorMessage:
            evidenceState === "NO_URL_LEVEL_DATA"
              ? "PageSpeed returned lab data but no URL-level Chrome UX field data."
              : null,
          finishedAt: new Date(),
        },
      });
      return { report: storedReport, completedRun: storedRun };
    });
    return {
      canonicalUrl,
      device: device.toLowerCase(),
      evidenceState: evidenceState.toLowerCase(),
      report: {
        id: report.id,
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
      },
      run: measurementRunToApi(completedRun),
    };
  } catch (error) {
    const safe = safeMeasurementError(
      error,
      "PAGESPEED_CHECK_FAILED",
      "PageSpeed Insights check failed.",
    );
    const evidenceState =
      error instanceof PageSpeedClientError &&
      error.code === "PAGESPEED_QUOTA_EXHAUSTED"
        ? ("QUOTA_EXHAUSTED" as const)
        : ("FAILED" as const);
    await db.$transaction(async (tx) => {
      await tx.vitalsReport.create({
        data: {
          siteId: input.siteId,
          syncRunId: run.id,
          url: canonicalUrl,
          device,
          evidenceState,
          source: "PAGESPEED_INSIGHTS",
          errorCode: safe.code,
          errorMessage: safe.message,
        },
      });
      await tx.measurementSyncRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          rowsWritten: 1,
          freshnessState: "UNKNOWN",
          errorCode: safe.code,
          errorMessage: safe.message,
          finishedAt: new Date(),
        },
      });
    });
    throw error;
  }
}

export async function syncVitalsForSite(
  userId: string,
  siteId: string,
  limit = 5
) {
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });

  if (!site || site.userId !== userId) {
    throw new Error("Site not found or unauthorized");
  }

  const pages = await getTopPages(siteId, 28, limit);
  let urls = pages.map((p) => p.url);

  // Fallback to homepage
  if (urls.length === 0) {
    urls = [`https://${site.domain}`];
  }

  const normalized = urls.map((u) =>
    u.startsWith("http") ? u : `https://${site.domain}${u.startsWith("/") ? "" : "/"}${u}`
  );

  let inserted = 0;
  const results = [];

  for (const url of normalized.slice(0, limit)) {
    try {
      // Prefer mobile (ranking signal)
      const mobile = await fetchPageSpeed(url, "MOBILE");
      const analysisAtCandidate = new Date(mobile.fetchTime);
      const analysisAt = Number.isNaN(analysisAtCandidate.getTime())
        ? new Date()
        : analysisAtCandidate;
      await db.vitalsReport.create({
        data: {
          siteId,
          url,
          device: "MOBILE",
          evidenceState:
            mobile.fieldDataState === "URL_LEVEL"
              ? "AVAILABLE"
              : "NO_URL_LEVEL_DATA",
          source: "PAGESPEED_INSIGHTS",
          analysisAt,
          fieldDataCategory: mobile.fieldDataCategory ?? null,
          originFieldDataAvailable: mobile.originFieldDataAvailable,
          lcp: mobile.vitals.lcp,
          cls: mobile.vitals.cls,
          inp: mobile.vitals.inp,
          perfScore: mobile.metrics.perfScore,
          speedIndex: mobile.metrics.speedIndex,
          ttfb: mobile.metrics.ttfb,
        },
      });
      inserted++;
      results.push({
        url,
        device: "MOBILE",
        perfScore: mobile.metrics.perfScore,
        lcp: mobile.vitals.lcp,
        cls: mobile.vitals.cls,
      });
    } catch (err) {
      results.push({
        url,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  return { inserted, results };
}
