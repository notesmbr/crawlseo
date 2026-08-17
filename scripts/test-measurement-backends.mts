import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildGa4CanonicalReportRequest,
  fetchGa4CanonicalDailyMetrics,
  Ga4DataApiError,
  getGa4DataCapability,
  parseGa4CanonicalReport,
} from "../lib/google/ga4-data-client.ts";
import {
  fetchPageSpeed,
  PageSpeedClientError,
  parsePageSpeedFieldVitals,
} from "../lib/google/pagespeed-client.ts";
import {
  normalizeCanonicalForSite,
  parseDateOnly,
} from "../lib/measurement/canonical.ts";
import {
  freshnessFromLatestDate,
  safeMeasurementError,
} from "../lib/measurement/run-ledger.ts";

const canonical = "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river";
assert.equal(
  normalizeCanonicalForSite(`${canonical}/?utm_source=test#conditions`, "bluestreamfly.com"),
  canonical,
);
assert.equal(normalizeCanonicalForSite("/", "www.bluestreamfly.com"), "https://bluestreamfly.com/");
assert.throws(
  () => normalizeCanonicalForSite("https://example.com/private", "bluestreamfly.com"),
  /belong to this site/,
);
assert.equal(parseDateOnly("2026-08-13", "date").toISOString(), "2026-08-13T00:00:00.000Z");

assert.deepEqual(getGa4DataCapability({}), {
  available: false,
  mode: "service_account_adc",
  propertyConfigured: false,
  credentialsConfigured: false,
  missingConfiguration: [
    "GOOGLE_GA4_PROPERTY_ID",
    "GOOGLE_GA4_APPLICATION_CREDENTIALS, GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_GA4_CLIENT_EMAIL plus GOOGLE_GA4_PRIVATE_KEY",
  ],
});
assert.equal(
  getGa4DataCapability({
    GOOGLE_GA4_PROPERTY_ID: "properties/406382194",
    GOOGLE_GA4_APPLICATION_CREDENTIALS: "/run/secrets/ga4.json",
  }).available,
  true,
);
const inlineGa4Capability = getGa4DataCapability({
  GOOGLE_GA4_PROPERTY_ID: "406382194",
  GOOGLE_GA4_CLIENT_EMAIL: "crawlseo@example.iam.gserviceaccount.com",
  GOOGLE_GA4_PRIVATE_KEY: "private-key-is-never-returned",
});
assert.equal(inlineGa4Capability.available, true);
assert.doesNotMatch(JSON.stringify(inlineGa4Capability), /private-key-is-never-returned/);

const ga4Request = buildGa4CanonicalReportRequest({
  canonicalPath: "/fly-fishing-reports/idaho/lochsa-river",
  startDate: "2026-07-17",
  endDate: "2026-08-13",
});
assert.deepEqual(
  ga4Request.dimensions.map((dimension) => dimension.name),
  ["date", "landingPage"],
);
assert.deepEqual(
  ga4Request.metrics.map((metric) => metric.name),
  ["screenPageViews", "sessions", "engagedSessions", "activeUsers", "keyEvents"],
);
const ga4RequestText = JSON.stringify(ga4Request);
assert.match(ga4RequestText, /Organic Search/);
assert.doesNotMatch(
  ga4RequestText,
  /clientId|userId|userPseudoId|fullPageUrl|eventName|email|latitude|longitude/i,
);

const ga4Response = {
  rowCount: 1,
  dimensionHeaders: [{ name: "date" }, { name: "landingPage" }],
  metricHeaders: [
    { name: "screenPageViews" },
    { name: "sessions" },
    { name: "engagedSessions" },
    { name: "activeUsers" },
    { name: "keyEvents" },
  ],
  rows: [
    {
      dimensionValues: [
        { value: "20260813" },
        { value: "/fly-fishing-reports/idaho/lochsa-river" },
      ],
      metricValues: [
        { value: "14" },
        { value: "10" },
        { value: "8" },
        { value: "9" },
        { value: "2.5" },
      ],
    },
  ],
};
assert.deepEqual(parseGa4CanonicalReport(ga4Response), [
  {
    date: "2026-08-13",
    landingPage: "/fly-fishing-reports/idaho/lochsa-river",
    screenPageViews: 14,
    sessions: 10,
    engagedSessions: 8,
    activeUsers: 9,
    keyEvents: 2.5,
  },
]);

const observedGa4Requests: Array<{ url: string; init?: RequestInit }> = [];
const ga4Rows = await fetchGa4CanonicalDailyMetrics(
  {
    canonicalPath: "/fly-fishing-reports/idaho/lochsa-river",
    startDate: "2026-08-13",
    endDate: "2026-08-13",
  },
  {
    environment: {
      GOOGLE_GA4_PROPERTY_ID: "406382194",
      GOOGLE_GA4_APPLICATION_CREDENTIALS: "/unused/in-mocked-test.json",
    },
    accessTokenProvider: async () => "test-access-token",
    fetchImpl: async (input, init) => {
      observedGa4Requests.push({ url: String(input), init });
      return new Response(JSON.stringify(ga4Response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
);
assert.equal(ga4Rows.length, 1);
assert.match(observedGa4Requests[0]?.url ?? "", /analyticsdata\.googleapis\.com/);
assert.equal(
  new Headers(observedGa4Requests[0]?.init?.headers).get("Authorization"),
  "Bearer test-access-token",
);
await assert.rejects(
  fetchGa4CanonicalDailyMetrics(
    {
      canonicalPath: "/fly-fishing-reports/idaho/lochsa-river",
      startDate: "2026-08-13",
      endDate: "2026-08-13",
    },
    {
      environment: {
        GOOGLE_GA4_PROPERTY_ID: "406382194",
        GOOGLE_APPLICATION_CREDENTIALS: "/unused/in-mocked-test.json",
      },
      accessTokenProvider: async () => "test-access-token",
      fetchImpl: async () => new Response("quota body must not escape", { status: 429 }),
    },
  ),
  (error: unknown) =>
    error instanceof Ga4DataApiError &&
    error.code === "GA4_DATA_RATE_LIMITED" &&
    !error.message.includes("quota body must not escape"),
);

assert.deepEqual(
  parsePageSpeedFieldVitals({
    loadingExperience: {
      overall_category: "AVERAGE",
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2400 },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 7 },
        INTERACTION_TO_NEXT_PAINT: { percentile: 180 },
      },
    },
    originLoadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 2200 } } },
  }),
  {
    fieldDataState: "URL_LEVEL",
    fieldDataCategory: "AVERAGE",
    originFieldDataAvailable: true,
    vitals: { lcp: 2.4, cls: 0.07, inp: 180 },
  },
);
assert.deepEqual(parsePageSpeedFieldVitals({}), {
  fieldDataState: "NO_URL_LEVEL_DATA",
  fieldDataCategory: undefined,
  originFieldDataAvailable: false,
  vitals: {},
});
await assert.rejects(
  fetchPageSpeed(canonical, "MOBILE", {
    environment: {},
    fetchImpl: async () => new Response("provider detail", { status: 429 }),
  }),
  (error: unknown) =>
    error instanceof PageSpeedClientError &&
    error.code === "PAGESPEED_QUOTA_EXHAUSTED" &&
    !error.message.includes("provider detail"),
);

assert.equal(
  freshnessFromLatestDate("GSC", new Date("2026-08-13T00:00:00.000Z"), new Date("2026-08-17T12:00:00.000Z")),
  "CURRENT",
);
assert.equal(
  freshnessFromLatestDate("GA4", new Date("2026-08-13T00:00:00.000Z"), new Date("2026-08-17T12:00:00.000Z")),
  "STALE",
);
assert.equal(freshnessFromLatestDate("GA4", null), "NO_DATA");
assert.deepEqual(
  safeMeasurementError(
    new Error("provider response contained a credential"),
    "GA4_IMPORT_FAILED",
    "Google Analytics aggregate import failed.",
  ),
  {
    code: "GA4_IMPORT_FAILED",
    message: "Google Analytics aggregate import failed.",
  },
);

const schema = readFileSync("prisma/schema.prisma", "utf8");
const ga4Model = schema.match(/model Ga4PageMetric \{[\s\S]*?\n\}/)?.[0] ?? "";
assert.match(ga4Model, /canonicalUrl\s+String/);
for (const metric of [
  "screenPageViews",
  "sessions",
  "engagedSessions",
  "activeUsers",
  "keyEvents",
]) {
  assert.match(ga4Model, new RegExp(`\\b${metric}\\b`));
}
assert.doesNotMatch(ga4Model, /client|visitor|userPseudo|eventPayload|ipAddress|email/i);
assert.match(schema, /model MeasurementSyncRun \{[\s\S]*?freshnessState/);
assert.match(schema, /evidenceState\s+VitalsEvidenceState @default\(MISSING\)/);

const migration = readFileSync(
  "prisma/migrations/20260817130000_add_measurement_backends/migration.sql",
  "utf8",
);
assert.match(migration, /CREATE TABLE "MeasurementSyncRun"/);
assert.match(migration, /CREATE TABLE "Ga4PageMetric"/);
assert.match(migration, /ADD COLUMN "evidenceState" "VitalsEvidenceState"/);

const gscWorker = readFileSync("lib/workers/gsc-sync.ts", "utf8");
const gscRoute = readFileSync("app/api/gsc/sync/route.ts", "utf8");
assert.match(gscWorker, /measurementSyncRun\.create/);
assert.match(gscWorker, /keywordsFetched: keywords\.length/);
assert.match(gscWorker, /rowsFetched/);
assert.match(gscWorker, /freshnessState/);
assert.match(gscRoute, /syncGSCDataForSite/);
assert.match(gscRoute, /GSC_NOT_CONNECTED/);

const healthRoute = readFileSync(
  "app/api/sites/[siteId]/measurement/health/route.ts",
  "utf8",
);
for (const source of ["gsc", "ga4", "pageSpeed"]) assert.match(healthRoute, new RegExp(`${source}:`));
assert.match(healthRoute, /lastSuccess/);
assert.match(healthRoute, /lastFailure/);
assert.doesNotMatch(
  healthRoute,
  /credentialJson|privateKey|private_key|googleTokens\s*:\s*site\.user/i,
);

const technicalRoute = readFileSync(
  "app/api/sites/[siteId]/technical-snapshot/route.ts",
  "utf8",
);
for (const source of ["auditPages", "issues", "auditLink", "vitalsReport"]) {
  assert.match(technicalRoute, new RegExp(source));
}
assert.doesNotMatch(
  technicalRoute,
  /db\.[A-Za-z]+\.(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\(/,
);

const ga4Route = readFileSync(
  "app/api/sites/[siteId]/measurement/ga4/route.ts",
  "utf8",
);
const pageSpeedRoute = readFileSync(
  "app/api/sites/[siteId]/measurement/pagespeed/route.ts",
  "utf8",
);
assert.match(ga4Route, /export async function POST/);
assert.match(pageSpeedRoute, /export async function POST/);
assert.doesNotMatch(`${ga4Route}\n${pageSpeedRoute}`, /cron|schedule|setInterval/i);

console.log(
  "PASS measurement backends: canonical GA4 aggregates, GSC ledger, honest PageSpeed states, and read-only technical snapshots",
);
