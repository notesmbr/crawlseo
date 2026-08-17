import type {
  MeasurementFreshnessState,
  MeasurementSource,
  MeasurementSyncRun,
} from "@prisma/client";

type CodedError = Error & { code?: unknown };

export function safeMeasurementError(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
) {
  const coded = error instanceof Error ? (error as CodedError) : null;
  const rawCode = typeof coded?.code === "string" ? coded.code : fallbackCode;
  const code = rawCode.replace(/[^A-Z0-9_]/gi, "_").toUpperCase().slice(0, 80);

  // Only errors created by our measurement clients are allowed to persist their
  // already-sanitized message. Unknown provider/runtime errors stay generic so
  // credentials, response bodies, and request URLs cannot leak into the ledger.
  const safeNames = new Set([
    "Ga4DataApiError",
    "PageSpeedClientError",
    "ReauthRequiredError",
  ]);
  const message =
    coded && safeNames.has(coded.name)
      ? coded.message.replace(/[\r\n\t]+/g, " ").slice(0, 500)
      : fallbackMessage;

  return { code, message };
}

export function freshnessFromLatestDate(
  source: MeasurementSource,
  latestDataDate: Date | null,
  now = new Date(),
): MeasurementFreshnessState {
  if (!latestDataDate) return "NO_DATA";
  const lagDays = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(
        latestDataDate.getUTCFullYear(),
        latestDataDate.getUTCMonth(),
        latestDataDate.getUTCDate(),
      )) /
      86_400_000,
  );
  const allowedLag = source === "GSC" ? 4 : source === "GA4" ? 2 : 31;
  return lagDays <= allowedLag ? "CURRENT" : "STALE";
}

export function measurementRunToApi(run: MeasurementSyncRun | null) {
  if (!run) return null;
  return {
    id: run.id,
    source: run.source.toLowerCase(),
    status: run.status.toLowerCase(),
    canonicalUrl: run.canonicalUrl,
    windowStart: run.windowStart?.toISOString().slice(0, 10) ?? null,
    windowEnd: run.windowEnd?.toISOString().slice(0, 10) ?? null,
    rowsFetched: run.rowsFetched,
    rowsWritten: run.rowsWritten,
    latestDataDate: run.latestDataDate?.toISOString().slice(0, 10) ?? null,
    freshness: run.freshnessState.toLowerCase(),
    errorCode: run.errorCode,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
  };
}
