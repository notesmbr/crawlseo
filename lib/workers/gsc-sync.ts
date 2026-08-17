import { db } from "@/lib/db";
import { fetchSearchAnalytics, fetchPageAnalytics } from "@/lib/google";
import { replaceKeywordRows } from "@/lib/keyword-storage";
import { getDateRange } from "@/lib/date-utils";
import { freshnessFromLatestDate, safeMeasurementError } from "@/lib/measurement/run-ledger";

interface SyncResult {
  success: boolean;
  keywordsFetched: number;
  keywordsInserted: number;
  pagesInserted: number;
  startDate: string;
  endDate: string;
  runId?: string;
  latestDataDate?: string | null;
  freshness?: string;
  errorCode?: string;
  error?: string;
}

function latestDate(values: Array<{ date: string }>) {
  return values.reduce<Date | null>((latest, value) => {
    const date = new Date(`${value.date}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || (latest && latest >= date) ? latest : date;
  }, null);
}

/**
 * Syncs GSC data for a specific site
 * Fetches last 28 days of keywords and pages data
 */
export async function syncGSCDataForSite(
  userId: string,
  siteId: string,
  daysBack: number = 28
): Promise<SyncResult> {
  let runId: string | null = null;
  let requestedStart = "";
  let requestedEnd = "";
  try {
    // Verify site belongs to user
    const site = await db.site.findUnique({
      where: { id: siteId },
      select: { userId: true, gscProperty: true },
    });

    if (!site) {
      throw new Error("Site not found");
    }

    if (site.userId !== userId) {
      throw new Error("Unauthorized: Site does not belong to user");
    }

    // Get date range
    const { start, end } = getDateRange(daysBack);
    requestedStart = start;
    requestedEnd = end;
    const windowStart = new Date(`${start}T00:00:00.000Z`);
    const windowEnd = new Date(`${end}T00:00:00.000Z`);
    const run = await db.measurementSyncRun.create({
      data: {
        siteId,
        source: "GSC",
        status: "RUNNING",
        windowStart,
        windowEnd,
      },
    });
    runId = run.id;

    // A manual sync attempt is still a real run when the connection is
    // missing. Creating the ledger row first makes that failure visible in
    // measurement health instead of silently disappearing.
    if (!site.gscProperty) {
      throw new Error("Site does not have GSC property connected");
    }

    console.log(`[GSC Sync] Starting sync for site ${siteId}`);
    console.log(`[GSC Sync] Date range: ${start} to ${end}`);

    // Fetch keywords and pages in parallel
    const [keywords, pages] = await Promise.all([
      fetchSearchAnalytics(
        userId,
        site.gscProperty,
        start,
        end,
        ["query", "page", "date", "device", "country"]
      ),
      fetchPageAnalytics(userId, site.gscProperty, start, end),
    ]);

    console.log(
      `[GSC Sync] Fetched ${keywords.length} keyword records and ${pages.length} page records`
    );

    // Replace the requested window atomically so stale source-grain rows do not
    // survive a re-sync and every page/device/country slice is preserved.
    const keywordsInserted = await replaceKeywordRows(
      siteId,
      start,
      end,
      keywords,
    );

    // Insert/update pages
    let pagesInserted = 0;
    let pagesFailed = 0;
    for (const page of pages) {
      if (!page.page) continue;

      try {
        const date = new Date(page.date);
        date.setHours(0, 0, 0, 0); // Normalize to start of day

        await db.page.upsert({
          where: {
            siteId_url_date: {
              siteId,
              url: page.page,
              date,
            },
          },
          create: {
            siteId,
            url: page.page,
            date,
            clicks: page.clicks,
            impressions: page.impressions,
            ctr: page.ctr,
            position: page.position,
          },
          update: {
            clicks: page.clicks,
            impressions: page.impressions,
            ctr: page.ctr,
            position: page.position,
          },
        });

        pagesInserted++;
      } catch {
        pagesFailed++;
      }
    }

    console.log(
      `[GSC Sync] Sync completed: ${keywordsInserted} keywords, ${pagesInserted} pages`
    );

    const latestDataDate = latestDate([...keywords, ...pages]);
    const freshnessState = freshnessFromLatestDate("GSC", latestDataDate);
    const completedRun = await db.measurementSyncRun.update({
      where: { id: run.id },
      data: {
        status: pagesFailed ? "PARTIAL" : "SUCCESS",
        rowsFetched: keywords.length + pages.length,
        rowsWritten: keywordsInserted + pagesInserted,
        latestDataDate,
        freshnessState,
        errorCode: pagesFailed ? "GSC_PAGE_ROWS_PARTIAL" : null,
        errorMessage: pagesFailed
          ? `${pagesFailed} page aggregate row${pagesFailed === 1 ? "" : "s"} could not be stored.`
          : null,
        finishedAt: new Date(),
      },
    });

    return {
      success: true,
      keywordsFetched: keywords.length,
      keywordsInserted,
      pagesInserted,
      startDate: start,
      endDate: end,
      runId: completedRun.id,
      latestDataDate: completedRun.latestDataDate?.toISOString().slice(0, 10) ?? null,
      freshness: completedRun.freshnessState.toLowerCase(),
    };
  } catch (error) {
    const missingConnection =
      error instanceof Error &&
      error.message === "Site does not have GSC property connected";
    const errorCode = error instanceof Error && error.name === "ReauthRequiredError"
      ? "REAUTH_REQUIRED"
      : missingConnection
        ? "GSC_NOT_CONNECTED"
        : "GSC_SYNC_FAILED";
    const safe = safeMeasurementError(
      error,
      errorCode,
      missingConnection
        ? "Site does not have GSC property connected."
        : "Search Console synchronization failed.",
    );
    if (runId) {
      await db.measurementSyncRun.update({
        where: { id: runId },
        data: {
          status: "FAILED",
          freshnessState: "UNKNOWN",
          errorCode: safe.code,
          errorMessage: safe.message,
          finishedAt: new Date(),
        },
      }).catch(() => undefined);
    }
    console.error("[GSC Sync] Sync failed", { code: safe.code });

    return {
      success: false,
      keywordsFetched: 0,
      keywordsInserted: 0,
      pagesInserted: 0,
      startDate: requestedStart,
      endDate: requestedEnd,
      runId: runId ?? undefined,
      freshness: "unknown",
      errorCode: safe.code,
      error: safe.message,
    };
  }
}

/**
 * Syncs GSC data for all sites of a user
 */
export async function syncAllUserSites(userId: string): Promise<
  Array<{
    siteId: string;
    domain: string;
    result: SyncResult;
  }>
> {
  const sites = await db.site.findMany({
    where: { userId },
    select: { id: true, domain: true },
  });

  const results = [];

  for (const site of sites) {
    const result = await syncGSCDataForSite(userId, site.id);
    results.push({
      siteId: site.id,
      domain: site.domain,
      result,
    });
  }

  return results;
}
