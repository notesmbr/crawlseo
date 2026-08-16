import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildGoogleAdsKeywordIdeasRequest,
  generateGoogleAdsKeywordIdeas,
  getGoogleAdsKeywordPlannerCapability,
  GoogleAdsKeywordPlannerError,
  readGoogleAdsKeywordPlannerConfig,
  redactGoogleAdsSecrets,
} from "../lib/google/google-ads-keyword-planner.ts";

const environment = {
  GOOGLE_APPLICATION_CREDENTIALS: "/private/google-ads-service-account.json",
  GOOGLE_ADS_DEVELOPER_TOKEN: "developer-token-secret",
  GOOGLE_ADS_CUSTOMER_ID: "123-456-7890",
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: "098-765-4321",
  GOOGLE_ADS_API_VERSION: "v25",
  GOOGLE_ADS_LANGUAGE_CONSTANT_ID: "1000",
  GOOGLE_ADS_GEO_TARGET_CONSTANT_IDS: "2840, 21132",
};

assert.deepEqual(getGoogleAdsKeywordPlannerCapability({}), {
  provider: "google_ads_keyword_planner",
  configured: false,
  manualOnly: true,
  status: "missing_configuration",
});
assert.deepEqual(getGoogleAdsKeywordPlannerCapability(environment), {
  provider: "google_ads_keyword_planner",
  configured: true,
  manualOnly: true,
  status: "ready",
});
assert.equal(
  getGoogleAdsKeywordPlannerCapability({
    ...environment,
    GOOGLE_ADS_CUSTOMER_ID: "invalid",
  }).status,
  "invalid_configuration",
);

const config = readGoogleAdsKeywordPlannerConfig(environment);
assert.equal(config.customerId, "1234567890");
assert.equal(config.loginCustomerId, "0987654321");
assert.deepEqual(config.geoTargetConstantIds, ["2840", "21132"]);
assert.deepEqual(
  buildGoogleAdsKeywordIdeasRequest(
    "fishing creek fly fishing report",
    "https://bluestreamfly.com/fly-fishing-reports/pennsylvania/fishing-creek",
    config,
  ),
  {
    language: "languageConstants/1000",
    geoTargetConstants: [
      "geoTargetConstants/2840",
      "geoTargetConstants/21132",
    ],
    includeAdultKeywords: false,
    keywordPlanNetwork: "GOOGLE_SEARCH",
    pageSize: 25,
    keywordAndUrlSeed: {
      keywords: ["fishing creek fly fishing report"],
      url: "https://bluestreamfly.com/fly-fishing-reports/pennsylvania/fishing-creek",
    },
  },
);

let capturedUrl = "";
let capturedInit: RequestInit | undefined;
const successFetch: typeof fetch = async (input, init) => {
  capturedUrl = String(input);
  capturedInit = init;
  return new Response(
    JSON.stringify({
      results: [
        {
          text: "fishing creek fly fishing report",
          closeVariants: ["fishing creek fishing report"],
          keywordIdeaMetrics: {
            avgMonthlySearches: "90",
            competition: "LOW",
            competitionIndex: "14",
            lowTopOfPageBidMicros: "420000",
            highTopOfPageBidMicros: "1750000",
            monthlySearchVolumes: [
              { year: "2026", month: "JULY", monthlySearches: "120" },
              { year: "2026", month: "JUNE", monthlySearches: "70" },
            ],
          },
        },
      ],
    }),
    {
      status: 200,
      headers: { "request-id": "google-request-1" },
    },
  );
};

const result = await generateGoogleAdsKeywordIdeas(
  {
    query: "  fishing creek fly fishing report  ",
    pageUrl:
      "https://bluestreamfly.com/fly-fishing-reports/pennsylvania/fishing-creek",
  },
  {
    environment,
    fetchImpl: successFetch,
    getAccessToken: async () => "access-token-secret",
    now: () => new Date("2026-08-15T12:00:00.000Z"),
  },
);

assert.equal(
  capturedUrl,
  "https://googleads.googleapis.com/v25/customers/1234567890:generateKeywordIdeas",
);
assert.equal(capturedInit?.method, "POST");
const headers = capturedInit?.headers as Record<string, string>;
assert.equal(headers.Authorization, "Bearer access-token-secret");
assert.equal(headers["developer-token"], "developer-token-secret");
assert.equal(headers["login-customer-id"], "0987654321");
assert.doesNotMatch(String(capturedInit?.body), /developer-token-secret|access-token-secret/);
assert.equal(result.source, "google_ads_keyword_planner");
assert.equal(result.checkedAt, "2026-08-15T12:00:00.000Z");
assert.equal(result.requestId, "google-request-1");
assert.deepEqual(result.targeting, {
  languageConstantId: "1000",
  geoTargetConstantIds: ["2840", "21132"],
  network: "GOOGLE_SEARCH",
});
assert.deepEqual(result.keywords[0], {
  keyword: "fishing creek fly fishing report",
  averageMonthlySearches: 90,
  monthlySearchVolumes: [
    { year: 2026, month: "june", searches: 70 },
    { year: 2026, month: "july", searches: 120 },
  ],
  advertiserCompetition: "low",
  advertiserCompetitionIndex: 14,
  lowTopOfPageBidMicros: 420000,
  highTopOfPageBidMicros: 1750000,
  closeVariants: ["fishing creek fishing report"],
});

const rateLimitedFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({
      error: {
        status: "RESOURCE_EXHAUSTED",
        message: "developer-token-secret should never be returned",
      },
    }),
    {
      status: 429,
      headers: { "request-id": "rate-request", "retry-after": "3" },
    },
  );
await assert.rejects(
  generateGoogleAdsKeywordIdeas(
    { query: "river report" },
    {
      environment,
      fetchImpl: rateLimitedFetch,
      getAccessToken: async () => "access-token-secret",
    },
  ),
  (error: unknown) => {
    assert.ok(error instanceof GoogleAdsKeywordPlannerError);
    assert.equal(error.code, "GOOGLE_KEYWORD_PLANNER_RATE_LIMITED");
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterSeconds, 3);
    assert.doesNotMatch(error.message, /developer-token-secret|access-token-secret/);
    return true;
  },
);

const forbiddenFetch: typeof fetch = async () =>
  new Response(
    JSON.stringify({
      error: {
        status: "PERMISSION_DENIED",
        message: "developer-token-secret /private/google-ads-service-account.json",
      },
    }),
    { status: 403, headers: { "request-id": "auth-request" } },
  );
await assert.rejects(
  generateGoogleAdsKeywordIdeas(
    { query: "river report" },
    {
      environment,
      fetchImpl: forbiddenFetch,
      getAccessToken: async () => "access-token-secret",
    },
  ),
  (error: unknown) => {
    assert.ok(error instanceof GoogleAdsKeywordPlannerError);
    assert.equal(error.code, "GOOGLE_KEYWORD_PLANNER_AUTH_FAILED");
    assert.equal(error.status, 503);
    assert.doesNotMatch(
      error.message,
      /developer-token-secret|access-token-secret|google-ads-service-account/,
    );
    return true;
  },
);

const redacted = redactGoogleAdsSecrets(
  "Authorization: Bearer access-token-secret; developer-token=developer-token-secret; /private/google-ads-service-account.json",
  config,
);
assert.doesNotMatch(
  redacted,
  /access-token-secret|developer-token-secret|google-ads-service-account/,
);

const routeSource = readFileSync(
  new URL("../app/api/sites/[siteId]/keyword-research/route.ts", import.meta.url),
  "utf8",
);
const pageSource = readFileSync(
  new URL(
    "../app/(dashboard)/sites/[siteId]/keyword-research/page.tsx",
    import.meta.url,
  ),
  "utf8",
);
const clientSource = readFileSync(
  new URL("../components/research/keyword-research-client.tsx", import.meta.url),
  "utf8",
);
const authSource = readFileSync(new URL("../lib/auth.ts", import.meta.url), "utf8");

assert.match(routeSource, /export async function GET/);
assert.match(routeSource, /export async function POST/);
assert.match(routeSource, /const session = await auth\(\)/);
assert.match(routeSource, /site && site\.userId === userId/);
assert.match(routeSource, /pageUrlForSite\(input\.pageUrl, site\.domain\)/);
assert.doesNotMatch(routeSource, /dataforseo/i);
assert.doesNotMatch(routeSource, /db\.(savedKeyword|pageReview)\.(create|update|upsert)/);

assert.match(pageSource, /resolvedSearchParams\.query/);
assert.match(pageSource, /resolvedSearchParams\.pageUrl/);
assert.match(pageSource, /initialQuery=\{initialQuery\}/);
assert.match(pageSource, /initialPageUrl=\{initialPageUrl\}/);
assert.doesNotMatch(pageSource, /apiKey|dataforseo/i);

assert.match(clientSource, /useState\(initialQuery\)/);
assert.match(clientSource, /useState\(initialPageUrl\)/);
assert.match(clientSource, /method: "POST"/);
assert.match(clientSource, /pageUrl: pageUrl\.trim\(\) \|\| null/);
assert.doesNotMatch(clientSource, /useEffect/);
assert.doesNotMatch(clientSource, /saved-keywords|handleSave|ownerPage|dataforseo/i);
assert.match(clientSource, /nothing here assigns ownership or saves automatically/i);

assert.match(authSource, /webmasters\.readonly/);
assert.doesNotMatch(authSource, /auth\/adwords/);

console.log("Google-only keyword research checks passed.");
