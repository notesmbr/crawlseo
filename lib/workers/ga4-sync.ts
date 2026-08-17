import { MeasurementRunStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { fetchGa4CanonicalDailyMetrics } from "@/lib/google/ga4-data-client";
import {
  canonicalPath,
  normalizeCanonicalForSite,
  parseDateOnly,
} from "@/lib/measurement/canonical";
import {
  freshnessFromLatestDate,
  measurementRunToApi,
  safeMeasurementError,
} from "@/lib/measurement/run-ledger";

function latestDate(dates: Date[]) {
  return dates.reduce<Date | null>(
    (latest, date) => (!latest || date > latest ? date : latest),
    null,
  );
}

export async function importGa4CanonicalMetrics(input: {
  userId: string;
  siteId: string;
  canonicalUrl: string;
  startDate: string;
  endDate: string;
}) {
  const site = await db.site.findUnique({
    where: { id: input.siteId },
    select: { userId: true, domain: true },
  });
  if (!site || site.userId !== input.userId) {
    throw new Error("Site not found or unauthorized");
  }

  const canonicalUrl = normalizeCanonicalForSite(input.canonicalUrl, site.domain);
  const windowStart = parseDateOnly(input.startDate, "startDate");
  const windowEnd = parseDateOnly(input.endDate, "endDate");
  if (windowStart > windowEnd) throw new Error("startDate must not be after endDate.");
  if ((windowEnd.getTime() - windowStart.getTime()) / 86_400_000 > 366) {
    throw new Error("The GA4 import window cannot exceed 367 days.");
  }

  const run = await db.measurementSyncRun.create({
    data: {
      siteId: input.siteId,
      source: "GA4",
      status: "RUNNING",
      canonicalUrl,
      windowStart,
      windowEnd,
    },
  });

  try {
    const fetched = await fetchGa4CanonicalDailyMetrics({
      canonicalPath: canonicalPath(canonicalUrl),
      startDate: input.startDate,
      endDate: input.endDate,
    });
    const rowsByDate = new Map<
      string,
      {
        date: Date;
        screenPageViews: number;
        sessions: number;
        engagedSessions: number;
        activeUsers: number;
        keyEvents: number;
      }
    >();

    for (const row of fetched) {
      const returnedCanonical = normalizeCanonicalForSite(row.landingPage, site.domain);
      if (returnedCanonical !== canonicalUrl) {
        throw new Error("Google Analytics returned a different canonical landing page.");
      }
      const date = parseDateOnly(row.date, "GA4 date");
      const existing = rowsByDate.get(row.date);
      rowsByDate.set(row.date, {
        date,
        screenPageViews: (existing?.screenPageViews ?? 0) + row.screenPageViews,
        sessions: (existing?.sessions ?? 0) + row.sessions,
        engagedSessions: (existing?.engagedSessions ?? 0) + row.engagedSessions,
        activeUsers: (existing?.activeUsers ?? 0) + row.activeUsers,
        keyEvents: (existing?.keyEvents ?? 0) + row.keyEvents,
      });
    }

    const rows = [...rowsByDate.values()].sort(
      (first, second) => first.date.getTime() - second.date.getTime(),
    );
    const latestDataDate = latestDate(rows.map((row) => row.date));
    const freshnessState = freshnessFromLatestDate("GA4", latestDataDate);
    const finishedAt = new Date();

    const completed = await db.$transaction(async (tx) => {
      await tx.ga4PageMetric.deleteMany({
        where: {
          siteId: input.siteId,
          canonicalUrl,
          trafficScope: "ORGANIC_SEARCH",
          date: { gte: windowStart, lte: windowEnd },
        },
      });
      if (rows.length) {
        await tx.ga4PageMetric.createMany({
          data: rows.map((row) => ({
            siteId: input.siteId,
            syncRunId: run.id,
            canonicalUrl,
            date: row.date,
            trafficScope: "ORGANIC_SEARCH" as const,
            screenPageViews: row.screenPageViews,
            sessions: row.sessions,
            engagedSessions: row.engagedSessions,
            activeUsers: row.activeUsers,
            keyEvents: row.keyEvents,
          })),
        });
      }
      return tx.measurementSyncRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCESS",
          rowsFetched: fetched.length,
          rowsWritten: rows.length,
          latestDataDate,
          freshnessState,
          finishedAt,
        },
      });
    });

    return {
      canonicalUrl,
      trafficScope: "organic_search" as const,
      run: measurementRunToApi(completed),
      metrics: rows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        screenPageViews: row.screenPageViews,
        sessions: row.sessions,
        engagedSessions: row.engagedSessions,
        activeUsers: row.activeUsers,
        keyEvents: row.keyEvents,
      })),
    };
  } catch (error) {
    const safe = safeMeasurementError(
      error,
      "GA4_IMPORT_FAILED",
      "Google Analytics aggregate import failed.",
    );
    await db.measurementSyncRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED" satisfies MeasurementRunStatus,
        freshnessState: "UNKNOWN",
        errorCode: safe.code,
        errorMessage: safe.message,
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}
