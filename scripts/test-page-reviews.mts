import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type { PageReview } from "@prisma/client";
import {
  activeManualChatStateValues,
  createPageReviewSchema,
  deletePageReviewSchema,
  hasMaterialPageReviewChanges,
  isActiveManualChatState,
  normalizePageReviewInput,
  normalizePageReviewPatch,
  pageReviewPrismaConflictCode,
  pageReviewToApi,
  patchPageReviewSchema,
  semanticChangedReviewFields,
} from "../lib/page-reviews.ts";

assert.equal(
  pageReviewPrismaConflictCode({ code: "P2034" }),
  "PAGE_REVIEW_VERSION_CONFLICT",
  "a serializable transaction race maps to a reloadable version conflict",
);
assert.equal(
  pageReviewPrismaConflictCode({ code: "P2002" }),
  "PAGE_REVIEW_UNIQUE_CONFLICT",
  "a unique-owner race remains a distinct conflict",
);
assert.equal(pageReviewPrismaConflictCode({ code: "P2025" }), null);
import {
  parseCsvRows,
  parsePageReviewInventory,
} from "../lib/page-review-inventory.ts";

const minimal = createPageReviewSchema.parse({
  pageId: "fly-fishing-reports__idaho__lochsa-river",
  canonicalUrl:
    "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river/",
  pageFamily: "river_report",
  indexPolicy: "index",
});
assert.equal(minimal.reviewStatus, "unreviewed");
assert.equal(minimal.priority, "none");
assert.equal(minimal.keyword.status, "undecided");
assert.equal(minimal.manualChatState, "awaiting_user_selection");
assert.equal(minimal.serp.competition, "unclear");
assert.equal(minimal.serp.evidenceState, "missing");
assert.equal(minimal.eeat.evidenceState, "missing");
assert.equal(minimal.keywordPlanner.evidenceState, "missing");
assert.equal(minimal.keywordPlanner.paidAdvertiserCompetition, null);
assert.equal(minimal.googleTrends.evidenceState, "missing");
assert.equal(minimal.googleTrends.method, null);
assert.equal(minimal.measurementPlan.evidenceState, "missing");
assert.equal(minimal.measurementPlan.gsc.clicks, null);
assert.equal(minimal.measurementPlan.ga4.screenPageViews, null);
assert.deepEqual(minimal.gates.day56, {
  status: "not_due",
  dueAt: null,
  reviewedAt: null,
  evidence: null,
  decision: null,
  rationale: null,
  nextAction: null,
});

const normalized = normalizePageReviewInput(minimal, "bluestreamfly.com");
assert.equal(
  normalized.canonicalUrl,
  "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river",
);
assert.equal(normalized.keywordOwnership, "UNDECIDED");
assert.equal(normalized.serpCompetition, "UNCLEAR");
assert.equal(normalized.serpEvidenceState, "MISSING");
assert.equal(normalized.eeatEvidenceState, "MISSING");
assert.equal(normalized.keywordPlannerEvidenceState, "MISSING");
assert.equal(normalized.keywordPlannerEvidenceDetails, null);
assert.equal(normalized.googleTrendsEvidenceState, "MISSING");
assert.equal(normalized.googleTrendsEvidenceDetails, null);
assert.equal(normalized.measurementPlanEvidenceState, "MISSING");
assert.equal(normalized.measurementPlanDetails, null);

const normalizedSameSiteLinks = normalizePageReviewInput(
  createPageReviewSchema.parse({
    pageId: "www-canonical-test",
    canonicalUrl: "https://www.bluestreamfly.com/current-page",
    pageFamily: "other",
    indexPolicy: "index",
    keyword: {
      status: "another_canonical",
      primaryQuery: "shared query",
      ownerCanonical: "https://www.bluestreamfly.com/owning-page",
    },
    topic: {
      parentPage: "https://www.bluestreamfly.com/parent-page",
    },
  }),
  "bluestreamfly.com",
);
assert.equal(
  normalizedSameSiteLinks.canonicalUrl,
  "https://bluestreamfly.com/current-page",
);
assert.equal(
  normalizedSameSiteLinks.keywordOwnerCanonical,
  "https://bluestreamfly.com/owning-page",
);
assert.equal(
  normalizedSameSiteLinks.parentPage,
  "https://bluestreamfly.com/parent-page",
);

const current = {
  id: "review-1",
  siteId: "site-1",
  ...normalized,
  secondaryKeywords: null,
  clusterGaps: null,
  serpFeatures: null,
  serpResults: null,
  eeatEvidence: null,
  eeatGaps: null,
  eeatEvidenceDetails: null,
  version: 1,
  deletedAt: null,
  createdAt: new Date("2026-08-14T12:00:00.000Z"),
  updatedAt: new Date("2026-08-14T12:00:00.000Z"),
} as unknown as PageReview;
assert.equal(
  hasMaterialPageReviewChanges(normalized, current),
  false,
  "empty JSON arrays and database nulls are the same semantic review state",
);
assert.equal(
  hasMaterialPageReviewChanges(
    { ...normalized, currentOffer: "A current river report" },
    current,
  ),
  true,
  "a content change is material",
);

const currentApi = pageReviewToApi(current);
assert.equal(currentApi.serp.competition, "unclear");
assert.equal(currentApi.serp.evidenceState, "missing");
assert.equal(currentApi.eeat.evidenceState, "missing");
assert.equal(currentApi.keywordPlanner.evidenceState, "missing");
assert.equal(currentApi.googleTrends.evidenceState, "missing");
assert.equal(currentApi.measurementPlan.evidenceState, "missing");
assert.equal(currentApi.measurementPlan.gsc.clicks, null);
const fullWorkboardPriorityPatch = patchPageReviewSchema.parse({
  expectedVersion: current.version,
  reviewStatus: currentApi.reviewStatus,
  priority: "p1",
  keyword: currentApi.keyword,
  topic: currentApi.topic,
  intent: currentApi.intent,
  keywordPlanner: currentApi.keywordPlanner,
  googleTrends: currentApi.googleTrends,
  measurementPlan: currentApi.measurementPlan,
  serp: currentApi.serp,
  offer: currentApi.offer,
  eeat: currentApi.eeat,
  decision: currentApi.decision,
  gates: currentApi.gates,
  manualReview: currentApi.manualReview,
  manualChatState: currentApi.manualChatState,
  userDecisionReference: currentApi.userDecisionReference,
  changeNote: "Raise this page's priority.",
});
const normalizedPriorityPatch = normalizePageReviewPatch(
  fullWorkboardPriorityPatch,
  current,
  "bluestreamfly.com",
);
assert.deepEqual(
  semanticChangedReviewFields(normalizedPriorityPatch, current),
  ["priority"],
  "a full workboard PATCH records only the one semantic field that changed",
);

assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keyword: {
      status: "not_applicable",
      primaryQuery: null,
      ownerCanonical: null,
      notApplicableReason: null,
      secondaryQueries: [],
    },
  }).success,
  false,
  "not_applicable requires a reason",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keyword: {
      status: "not_applicable",
      primaryQuery: "privacy policy",
      ownerCanonical: null,
      notApplicableReason: "Intentional legal page",
      secondaryQueries: [],
    },
  }).success,
  false,
  "not_applicable cannot claim a primary query",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keyword: {
      status: "this_page",
      primaryQuery: "  Lochsa   River Fishing Report ",
      ownerCanonical: null,
      notApplicableReason: null,
      secondaryQueries: [],
    },
  }).success,
  true,
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keyword: {
      status: "another_canonical",
      primaryQuery: "lochsa river fishing report",
      ownerCanonical: null,
      notApplicableReason: null,
      secondaryQueries: [],
    },
  }).success,
  false,
  "another_canonical requires the owning URL",
);

assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    serp: {
      snapshotAt: "2026-08-14T12:00:00.000Z",
      query: "lochsa river fishing report",
      method: "manual_google",
      evidenceSummary: null,
    },
  }).success,
  false,
  "a SERP snapshot requires its dated evidence summary",
);

const serpSnapshot = {
  snapshotAt: "2026-08-14T12:00:00.000Z",
  query: "lochsa river fishing report",
  locale: "United States",
  device: "desktop" as const,
  method: "manual_google" as const,
  evidenceSummary: "Manual signed-out result review.",
  features: [],
  competitionSummary: "Five directly competing results were reviewed.",
};
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    serp: { evidenceState: "not_applicable" },
  }).success,
  true,
  "not_applicable SERP evidence permits an empty snapshot",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    serp: { evidenceState: "verified" },
  }).success,
  false,
  "verified SERP evidence requires a dated supported snapshot",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    serp: {
      ...serpSnapshot,
      competition: "high",
      evidenceState: "partial",
    },
  }).success,
  true,
  "partial SERP evidence is complete when its dated limitation is documented",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    serp: { competition: "low" },
  }).success,
  false,
  "a structured competition finding requires snapshot evidence",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    serp: {
      ...serpSnapshot,
      results: [
        { position: 1, url: "https://example.com/one" },
        { position: 1, url: "https://example.com/two" },
      ],
    },
  }).success,
  false,
  "SERP result positions must be unique",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    serp: {
      ...serpSnapshot,
      results: [{ position: 6, url: "https://example.com/six" }],
    },
  }).success,
  false,
  "SERP results are limited to accepted positions 1 through 5",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    serp: {
      ...serpSnapshot,
      results: Array.from({ length: 6 }, (_, index) => ({
        position: Math.min(index + 1, 5),
        url: `https://example.com/${index + 1}`,
      })),
    },
  }).success,
  false,
  "the API accepts at most five SERP rows",
);

const evidenceReview = createPageReviewSchema.parse({
  ...minimal,
  eeat: {
    evidence: ["Direct official source"],
    gaps: ["No current local observation"],
    details: [
      {
        evidence: "The regulation link is direct to the state agency.",
        source: "https://idfg.idaho.gov/fish/rules",
        checkedAt: "2026-08-14T12:00:00.000Z",
        reviewer: "BlueStreamFly river review team",
        limitation: "This does not confirm same-day access conditions.",
      },
    ],
    evidenceState: "partial",
  },
});
assert.equal(evidenceReview.eeat.details.length, 1);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    eeat: {
      evidence: [],
      gaps: [],
      details: [
        {
          evidence: "A claim",
          source: "A source",
          checkedAt: "not-a-date",
          reviewer: "A reviewer",
          limitation: "A limitation",
        },
      ],
    },
  }).success,
  false,
  "structured E-E-A-T evidence requires a real check date",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    eeat: { evidenceState: "verified" },
  }).success,
  false,
  "verified E-E-A-T evidence requires a structured evidence detail",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    eeat: { evidenceState: "not_applicable" },
  }).success,
  true,
  "not_applicable E-E-A-T evidence permits an empty detail list",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    offer: { differentiationEvidenceState: "verified" },
  }).success,
  false,
  "verified differentiation requires all three offer comparisons",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    offer: {
      competitorOffer: "Competitors offer static reports.",
      currentOffer: "BlueStreamFly combines current trip-planning evidence.",
      differentiation: "The report shows source-backed current conditions.",
      differentiationEvidenceState: "partial",
    },
  }).success,
  true,
  "partial differentiation is valid when the supporting offers are documented",
);

for (const draftState of ["researching", "awaiting_user_decision"] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...minimal,
      manualChatState: draftState,
      eeat: {
        evidence: ["Draft evidence may be saved before approval."],
        gaps: [],
        details: [],
      },
    }).success,
    true,
    `${draftState} may save draft evidence without an approval reference`,
  );
}

const keywordPlannerEvidence = {
  evidenceState: "partial" as const,
  query: "Lochsa River Fishing Report",
  checkedAt: "2026-08-15T12:00:00.000Z",
  method: "manual_google_ads_ui" as const,
  sourceUrl: "https://ads.google.com/aw/keywordplanner/home",
  geoTarget: "United States",
  language: "English",
  network: "google_search" as const,
  averageMonthlySearches: 10,
  monthlySearches: [
    { year: 2026, month: 6, searches: 10 },
    { year: 2026, month: 7, searches: 20 },
  ],
  paidAdvertiserCompetition: "low" as const,
  paidAdvertiserCompetitionIndex: 18,
  lowTopOfPageBidMicros: 120_000,
  highTopOfPageBidMicros: 430_000,
  limitation:
    "Keyword Planner reports paid-ad demand estimates, not organic ranking difficulty.",
  notApplicableReason: null,
};

const googleTrendsEvidence = {
  evidenceState: "partial" as const,
  query: "Lochsa River Fishing Report",
  checkedAt: "2026-08-15T12:05:00.000Z",
  method: "manual_google_trends" as const,
  sourceUrl:
    "https://trends.google.com/trends/explore?geo=US&q=lochsa%20river%20fishing%20report",
  geo: "United States",
  timeframe: "Past 5 years",
  comparisonQueries: ["lochsa fishing report", "Lochsa  River report"],
  direction: "seasonal" as const,
  finding: "Interest is sparse and seasonal, with the largest signal in summer.",
  limitation:
    "Google Trends shows relative interest and may suppress very low-volume terms.",
  notApplicableReason: null,
};

const measurementPlanEvidence = {
  evidenceState: "partial" as const,
  baselineCanonical:
    "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river",
  baselineAsOf: "2026-08-13",
  windowStart: "2026-07-17",
  windowEnd: "2026-08-13",
  gsc: {
    evidenceState: "verified" as const,
    checkedAt: "2026-08-15T13:00:00.000Z",
    method: "crawlseo_gsc_import" as const,
    sourceUrl:
      "https://search.google.com/search-console/performance/search-analytics",
    clicks: 8,
    impressions: 220,
    ctr: 0.0364,
    position: 13.2,
    limitation: null,
    notApplicableReason: null,
  },
  ga4: {
    evidenceState: "partial" as const,
    checkedAt: "2026-08-15T13:05:00.000Z",
    method: "manual_ga4_report" as const,
    sourceUrl: "https://analytics.google.com/analytics/web/",
    screenPageViews: 14,
    sessions: 11,
    engagedSessions: 7,
    activeUsers: 9,
    keyEvents: 2,
    limitation:
      "GA4 collection began recently, so this window is shorter than the GSC history.",
    notApplicableReason: null,
  },
  hypothesis:
    "Clearer answer-first guidance should increase organic clicks because the result and page will match the trip-planning need more closely.",
  primaryKpi: {
    source: "gsc" as const,
    metric: "clicks" as const,
    direction: "increase" as const,
    evaluationWindowDays: 28,
    successCriteria:
      "Compare the next finalized 28 days with this prior 28-day window; treat thin data as inconclusive.",
  },
  conversionGoal: {
    eventName: "official_source_click",
    description: "The visitor opens a useful official source before fishing.",
    notApplicableReason: null,
  },
  comparisonWindows: [
    {
      label: "Prior 28 days",
      windowStart: "2026-06-19",
      windowEnd: "2026-07-16",
      metrics: {
        clicks: 25,
        impressions: 181,
        ctr: 0.1381,
        position: 14.48,
      },
      limitation: "GSC page totals include anonymized query traffic.",
    },
  ],
  guardrails: [
    "GSC CTR must not decline materially while clicks rise.",
    "Official source accuracy and canonical indexability must remain intact.",
  ],
  limitation:
    "The GA4 comparison window is short and GSC data can lag several days.",
  notApplicableReason: null,
};

const normalizedMeasurementPlan = normalizePageReviewInput(
  createPageReviewSchema.parse({
    ...minimal,
    measurementPlan: measurementPlanEvidence,
  }),
  "bluestreamfly.com",
);
assert.equal(normalizedMeasurementPlan.measurementPlanEvidenceState, "PARTIAL");
assert.equal(
  (
    normalizedMeasurementPlan.measurementPlanDetails as {
      gsc: { clicks: number | null };
      ga4: { screenPageViews: number | null };
    }
  ).gsc.clicks,
  8,
);
assert.deepEqual(
  semanticChangedReviewFields(normalizedMeasurementPlan, current),
  ["measurementPlan"],
  "measurement planning produces one distinct revision change group",
);
const measurementPlanApi = pageReviewToApi({
  ...current,
  ...normalizedMeasurementPlan,
} as PageReview);
assert.equal(measurementPlanApi.measurementPlan.baselineAsOf, "2026-08-13");
assert.equal(measurementPlanApi.measurementPlan.gsc.ctr, 0.0364);
assert.equal(
  measurementPlanApi.measurementPlan.primaryKpi.metric,
  "clicks",
);
assert.equal(
  measurementPlanApi.measurementPlan.comparisonWindows[0]?.metrics.clicks,
  25,
);
const partialUnknownMeasurement = createPageReviewSchema.parse({
  ...minimal,
  measurementPlan: {
    ...measurementPlanEvidence,
    gsc: {
      ...measurementPlanEvidence.gsc,
      evidenceState: "partial",
      impressions: null,
      ctr: null,
      position: null,
      limitation:
        "The exact page row returned clicks, but the remaining aggregate fields were unavailable.",
    },
  },
});
assert.equal(
  partialUnknownMeasurement.measurementPlan.gsc.impressions,
  null,
  "an unavailable source value remains null instead of becoming zero",
);

const normalizedDemandEvidence = normalizePageReviewInput(
  createPageReviewSchema.parse({
    ...minimal,
    keywordPlanner: keywordPlannerEvidence,
    googleTrends: googleTrendsEvidence,
  }),
  "bluestreamfly.com",
);
assert.equal(normalizedDemandEvidence.keywordPlannerEvidenceState, "PARTIAL");
assert.equal(normalizedDemandEvidence.googleTrendsEvidenceState, "PARTIAL");
assert.deepEqual(
  (
    normalizedDemandEvidence.keywordPlannerEvidenceDetails as {
      monthlySearches: Array<{ year: number; month: number }>;
    }
  ).monthlySearches.map(({ year, month }) => [year, month]),
  [
    [2026, 7],
    [2026, 6],
  ],
  "Keyword Planner monthly evidence is serialized in a stable newest-first order",
);
assert.deepEqual(
  (
    normalizedDemandEvidence.googleTrendsEvidenceDetails as {
      comparisonQueries: string[];
    }
  ).comparisonQueries,
  ["lochsa fishing report", "lochsa river report"],
  "Google Trends comparison queries are normalized and deduplicated",
);
assert.deepEqual(
  semanticChangedReviewFields(normalizedDemandEvidence, current),
  ["keywordPlanner", "googleTrends"],
  "demand evidence produces distinct revision change groups",
);
const demandEvidenceApi = pageReviewToApi({
  ...current,
  ...normalizedDemandEvidence,
} as PageReview);
assert.equal(
  demandEvidenceApi.keywordPlanner.paidAdvertiserCompetition,
  "low",
);
assert.equal(
  demandEvidenceApi.keywordPlanner.query,
  "lochsa river fishing report",
);
assert.equal(
  demandEvidenceApi.googleTrends.query,
  "lochsa river fishing report",
);

assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keywordPlanner: {
      ...keywordPlannerEvidence,
      organicDifficulty: "low",
    },
  }).success,
  false,
  "Keyword Planner evidence rejects an organic-difficulty field instead of confusing it with paid advertiser competition",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keywordPlanner: {
      ...keywordPlannerEvidence,
      evidenceState: "partial",
      limitation: "too short",
    },
  }).success,
  false,
  "partial Keyword Planner evidence requires a clear limitation",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keywordPlanner: {
      ...keywordPlannerEvidence,
      averageMonthlySearches: null,
      paidAdvertiserCompetition: null,
      limitation:
        "Google withheld these metrics for the low-volume query; missing is unknown, not zero.",
    },
  }).success,
  true,
  "partial Keyword Planner evidence preserves withheld demand metrics as unknown instead of zero",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keywordPlanner: {
      ...keywordPlannerEvidence,
      evidenceState: "verified",
      averageMonthlySearches: null,
    },
  }).success,
  false,
  "verified Keyword Planner evidence requires an average monthly search estimate",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keywordPlanner: {
      ...keywordPlannerEvidence,
      evidenceState: "verified",
      paidAdvertiserCompetition: null,
    },
  }).success,
  false,
  "verified Keyword Planner evidence requires paid advertiser competition",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    googleTrends: {
      ...googleTrendsEvidence,
      evidenceState: "partial",
      limitation: null,
    },
  }).success,
  false,
  "partial Google Trends evidence requires a clear limitation",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    googleTrends: {
      ...googleTrendsEvidence,
      method: "google_trends_api_alpha",
    },
  }).success,
  true,
  "the official Google Trends API alpha method is reserved without claiming general availability",
);
for (const evidenceName of ["keywordPlanner", "googleTrends"] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...minimal,
      [evidenceName]: { evidenceState: "not_applicable" },
    }).success,
    false,
    `${evidenceName} not_applicable evidence requires a reason`,
  );
  assert.equal(
    createPageReviewSchema.safeParse({
      ...minimal,
      [evidenceName]: {
        query: "unfinished draft query",
      },
    }).success,
    true,
    `${evidenceName} drafts remain flexible before approval`,
  );
}
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    keywordPlanner: {
      ...keywordPlannerEvidence,
      sourceUrl: "https://example.com/keyword-data",
    },
  }).success,
  false,
  "Keyword Planner evidence must point to an official Google source",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    googleTrends: {
      ...googleTrendsEvidence,
      sourceUrl: "https://example.com/trends-data",
    },
  }).success,
  false,
  "Google Trends evidence must point to an official Google source",
);

const approvedReviewInput = {
  ...minimal,
  keyword: {
    ...minimal.keyword,
    status: "this_page" as const,
    primaryQuery: "lochsa river fishing report",
  },
  topic: {
    ...minimal.topic,
    cluster: "Idaho river reports",
    clusterGaps: ["No additional gap observed after this review."],
    maintenanceOwner: "BlueStreamFly site team",
    editorialOwner: "BlueStreamFly review team",
  },
  intent: {
    searchIntent: "local_trip_planning" as const,
    jobToBeDone: "Decide whether the Lochsa River is worth fishing now.",
  },
  keywordPlanner: keywordPlannerEvidence,
  googleTrends: googleTrendsEvidence,
  measurementPlan: measurementPlanEvidence,
  serp: {
    ...minimal.serp,
    snapshotAt: "2026-08-14T12:00:00.000Z",
    query: "lochsa river fishing report",
    locale: "Hollidaysburg, Pennsylvania",
    device: "desktop" as const,
    method: "manual_google" as const,
    competition: "medium" as const,
    evidenceState: "partial" as const,
    evidenceSummary: "Signed-out manual result review; results vary by place and time.",
    competitionSummary: "One current shop report and several official or utility pages.",
    results: [
      {
        position: 1,
        url: "https://example.com/lochsa-report",
        title: "Lochsa River Fishing Report",
        offer: "A current regional fishing report.",
        evidence: "Dated conditions and named publisher.",
        gap: "No combined access and rules check.",
      },
    ],
  },
  offer: {
    competitorOffer: "Current report plus separate official data.",
    currentOffer: "One trip-planning report with official links.",
    differentiation: "Combines the trip decision with direct source checks.",
    differentiationEvidenceState: "partial" as const,
  },
  eeat: {
    evidence: ["Direct official sources are linked."],
    gaps: ["No named local field reviewer."],
    evidenceState: "partial" as const,
    details: [
      {
        evidence: "The state fishing-rules source is linked.",
        source: "https://idfg.idaho.gov/fish/rules",
        checkedAt: "2026-08-14T12:00:00.000Z",
        reviewer: "BlueStreamFly review team",
        limitation: "This proves the source link, not on-river experience.",
      },
    ],
  },
  decision: {
    ...minimal.decision,
    state: "change_recommended" as const,
    rationale: "A bounded clarity change would better answer the reviewed intent.",
    proposedChange: "Clarify the answer-first trip guidance.",
    performanceState: "impressions_without_result" as const,
    scopeClass: "focused" as const,
    scopeRationale: "One answer-first module is the only verified gap.",
    demonstratedWins: [],
    preservedElements: ["The canonical URL and verified official-source links."],
    intentionallyChangedElements: [],
    blastRadius: "page_local" as const,
    affectedPageFamily: null,
    affectedCanonicalCount: 1,
    blastRadiusNote: "Only this canonical's answer-first copy changes.",
    experimentState: "none" as const,
    experimentId: null,
    experimentFrozenUntil: null,
    experimentExceptionReason: null,
    rollbackTrigger: "Rollback if the canonical loses relevant impressions without a user benefit.",
    changeState: "planned" as const,
  },
  manualReview: {
    ...minimal.manualReview,
    firstReviewedAt: "2026-08-14T12:00:00.000Z",
    lastReviewedAt: "2026-08-14T13:00:00.000Z",
    nextReviewAt: "2026-08-21T13:00:00.000Z",
  },
};

const approvedWithoutMeasurementPlan = {
  ...approvedReviewInput,
} as Partial<typeof approvedReviewInput>;

const sharedRiverTemplateDecision = {
  ...approvedReviewInput.decision,
  scopeClass: "comprehensive" as const,
  scopeRationale:
    "The verified source and safety presentation defects are shared by the river-report template.",
  proposedChange:
    "Repair the shared river-report safety and source modules while preserving river-specific content.",
  blastRadius: "shared_template" as const,
  affectedPageFamily: "river_report" as const,
  affectedCanonicalCount: 459,
  blastRadiusNote:
    "Shared river-report decision, safety, and official-source modules change across all 459 river reports.",
  rollbackTrigger:
    "Rollback if representative river reports lose safety guidance, source links, or indexability.",
};
assert.equal(
  createPageReviewSchema.safeParse({
    ...approvedReviewInput,
    manualChatState: "approved_to_implement",
    userDecisionReference: "User approved the shared river-template repair",
    decision: sharedRiverTemplateDecision,
  }).success,
  true,
  "a river-report review may approve one shared-template change for the full river family",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...approvedReviewInput,
    manualChatState: "approved_to_implement",
    userDecisionReference: "User approved the mixed river repair",
    decision: {
      ...sharedRiverTemplateDecision,
      blastRadius: "mixed",
      blastRadiusNote:
        "Repair the shared safety and source modules on all river reports, then refresh Lochsa-specific access and rules evidence.",
    },
  }).success,
  true,
  "one river review can preserve both shared-template and page-local work as a mixed blast radius",
);
for (const invalidDecision of [
  { ...sharedRiverTemplateDecision, affectedPageFamily: "state_hub" },
  { ...sharedRiverTemplateDecision, affectedCanonicalCount: 1 },
  { ...sharedRiverTemplateDecision, blastRadiusNote: null },
]) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...approvedReviewInput,
      manualChatState: "approved_to_implement",
      userDecisionReference: "User approved the shared river-template repair",
      decision: invalidDecision,
    }).success,
    false,
    "a shared river-template change must name the river family, a multi-page cohort, and shared behavior",
  );
}
delete approvedWithoutMeasurementPlan.measurementPlan;
assert.equal(
  createPageReviewSchema.safeParse({
    ...approvedWithoutMeasurementPlan,
    manualChatState: "approved_to_record",
    userDecisionReference: "User approved the evidence record in task 123",
    decision: {
      ...approvedReviewInput.decision,
      state: "no_change",
      proposedChange: null,
      scopeClass: "not_applicable",
      scopeRationale: null,
      blastRadius: "not_applicable",
      affectedCanonicalCount: null,
      blastRadiusNote: null,
      rollbackTrigger: null,
      changeState: "not_planned",
    },
  }).success,
  true,
  "approval to record may precede a measurement plan because it does not authorize implementation",
);
const missingPlanImplementation = createPageReviewSchema.safeParse({
  ...approvedWithoutMeasurementPlan,
  manualChatState: "approved_to_implement",
  userDecisionReference: "User approved implementation in task 123",
});
assert.equal(
  missingPlanImplementation.success,
  false,
  "implementation approval needs a credible measurement plan",
);
if (!missingPlanImplementation.success) {
  assert.ok(
    missingPlanImplementation.error.issues.some(
      (issue) =>
        issue.path.join(".") === "measurementPlan.evidenceState" &&
        issue.message.includes("measurement plan"),
    ),
  );
}
assert.equal(
  createPageReviewSchema.safeParse({
    ...approvedReviewInput,
    manualChatState: "approved_to_implement",
    userDecisionReference: "User approved implementation in task 123",
    measurementPlan: {
      ...measurementPlanEvidence,
      baselineCanonical: "https://bluestreamfly.com/a-different-page",
    },
  }).success,
  false,
  "implementation baselines must use the reviewed page's exact canonical",
);
const missingGa4Implementation = createPageReviewSchema.safeParse({
  ...approvedReviewInput,
  manualChatState: "approved_to_implement",
  userDecisionReference: "User approved implementation in task 123",
  measurementPlan: {
    ...measurementPlanEvidence,
    ga4: { evidenceState: "missing" },
  },
});
assert.equal(
  missingGa4Implementation.success,
  false,
  "implementation needs an honest exact-canonical baseline state for both GSC and GA4",
);
if (!missingGa4Implementation.success) {
  assert.ok(
    missingGa4Implementation.error.issues.some(
      (issue) => issue.path.join(".") === "measurementPlan.ga4.evidenceState",
    ),
  );
}

for (const approvedState of [
  "approved_to_record",
  "approved_to_implement",
  "monitoring",
  "complete",
] as const) {
  const result = createPageReviewSchema.safeParse({
    ...minimal,
    manualChatState: approvedState,
    userDecisionReference: "   ",
  });
  assert.equal(result.success, false, `${approvedState} requires a decision reference`);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.path.join(".") === "userDecisionReference" &&
          issue.message.includes("required for approved, monitoring, or complete"),
      ),
    );
  }
}

assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    manualChatState: "awaiting_user_decision",
    userDecisionReference: "User chose the change in task 123",
    decision: {
      ...minimal.decision,
      state: "change_recommended",
      changeState: "planned",
    },
  }).success,
  false,
  "planned work requires implementation approval, not only a pending user decision",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...approvedReviewInput,
    manualChatState: "approved_to_implement",
    userDecisionReference: "User chose the change in task 123",
    decision: {
      ...approvedReviewInput.decision,
      state: "change_recommended",
      changeState: "planned",
    },
  }).success,
  true,
  "planned work is valid after explicit implementation approval",
);

for (const completedChangeState of ["shipped", "verified", "reverted"] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...approvedReviewInput,
      manualChatState: "approved_to_implement",
      userDecisionReference: "User approved implementation in task 123",
      decision: {
        ...approvedReviewInput.decision,
        state: "change_recommended",
        changeState: completedChangeState,
        changeId: null,
        changedAt: null,
      },
    }).success,
    false,
    `${completedChangeState} requires a change ID and timestamp`,
  );
  assert.equal(
    createPageReviewSchema.safeParse({
      ...approvedReviewInput,
      manualChatState: "approved_to_implement",
      userDecisionReference: "User approved implementation in task 123",
      decision: {
        ...approvedReviewInput.decision,
        state: "change_recommended",
        changeState: completedChangeState,
        changeId: "commit-abc123",
        changedAt: "2026-08-14T14:00:00.000Z",
      },
    }).success,
    true,
  );
}

assert.equal(
  createPageReviewSchema.safeParse({
    ...approvedReviewInput,
    reviewStatus: "monitoring",
    manualChatState: "monitoring",
    userDecisionReference: "User approved implementation in task 123",
    decision: {
      ...approvedReviewInput.decision,
      state: "change_recommended",
      changeState: "shipped",
      changeId: "commit-monitoring-123",
      changedAt: "2026-08-14T14:00:00.000Z",
    },
    gates: {
      day7: { ...minimal.gates.day7, dueAt: "2026-08-21T13:00:00.000Z" },
      day28: { ...minimal.gates.day28, dueAt: "2026-09-11T13:00:00.000Z" },
      day56: { ...minimal.gates.day56, dueAt: "2026-10-09T13:00:00.000Z" },
    },
  }).success,
  true,
  "monitoring preserves an approved shipped change while freeing the active slot",
);
for (const unfinishedChangeState of ["planned", "in_progress"] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...approvedReviewInput,
      reviewStatus: "monitoring",
      manualChatState: "monitoring",
      userDecisionReference: "User approved implementation in task 123",
      decision: {
        ...approvedReviewInput.decision,
        state: "change_recommended",
        changeState: unfinishedChangeState,
      },
      gates: {
        day7: { ...minimal.gates.day7, dueAt: "2026-08-21T13:00:00.000Z" },
        day28: { ...minimal.gates.day28, dueAt: "2026-09-11T13:00:00.000Z" },
        day56: { ...minimal.gates.day56, dueAt: "2026-10-09T13:00:00.000Z" },
      },
    }).success,
    false,
    `monitoring rejects unfinished changeState ${unfinishedChangeState}`,
  );
}

const terminalGates = {
  day7: {
    status: "recorded" as const,
    dueAt: "2026-08-21T13:00:00.000Z",
    reviewedAt: "2026-08-21T14:00:00.000Z",
    evidence: "Search Console and GA4 evidence reviewed.",
    decision: "Keep monitoring.",
    rationale: "The first-week signal is directional only.",
    nextAction: "Return at day 28.",
  },
  day28: {
    status: "missed" as const,
    dueAt: "2026-09-11T13:00:00.000Z",
    reviewedAt: "2026-09-12T13:00:00.000Z",
    evidence: "The scheduled review was not completed on its due date.",
    decision: "Record the miss without inferring an outcome.",
    rationale: "No timely comparison was made.",
    nextAction: "Use the day-56 gate for the final review.",
  },
  day56: {
    status: "not_applicable" as const,
    dueAt: null,
    reviewedAt: "2026-10-09T13:00:00.000Z",
    evidence: null,
    decision: "No day-56 measurement applies.",
    rationale: "This non-keyword utility review had no live content change.",
    nextAction: "Recheck on the maintenance date.",
  },
};
const completeReviewInput = {
  ...minimal,
  reviewStatus: "complete" as const,
  keyword: {
    ...minimal.keyword,
    status: "not_applicable" as const,
    notApplicableReason: "This utility page has no search-query owner.",
  },
  topic: {
    ...minimal.topic,
    cluster: "River report support pages",
    clusterGaps: ["No additional gap found; reviewed as not applicable."],
    maintenanceOwner: "BlueStreamFly site team",
    editorialOwner: "BlueStreamFly review team",
  },
  intent: {
    searchIntent: "informational" as const,
    jobToBeDone: "Help a visitor make a clear river-planning decision.",
  },
  keywordPlanner: {
    ...minimal.keywordPlanner,
    evidenceState: "not_applicable" as const,
    notApplicableReason:
      "This utility page does not own an organic search query.",
  },
  googleTrends: {
    ...minimal.googleTrends,
    evidenceState: "not_applicable" as const,
    notApplicableReason:
      "This utility page does not own an organic search query.",
  },
  serp: { ...minimal.serp, evidenceState: "not_applicable" as const },
  offer: {
    ...minimal.offer,
    differentiationEvidenceState: "not_applicable" as const,
  },
  eeat: { ...minimal.eeat, evidenceState: "not_applicable" as const },
  decision: {
    ...minimal.decision,
    state: "no_change" as const,
    rationale: "No page change is needed for this non-keyword utility review.",
    performanceState: "insufficient_observation" as const,
    scopeClass: "not_applicable" as const,
    blastRadius: "not_applicable" as const,
    experimentState: "none" as const,
  },
  gates: terminalGates,
  manualReview: {
    ...minimal.manualReview,
    firstReviewedAt: "2026-08-14T12:00:00.000Z",
    lastReviewedAt: "2026-08-14T13:00:00.000Z",
    nextReviewAt: "2027-08-14T13:00:00.000Z",
  },
  manualChatState: "complete" as const,
  userDecisionReference: "User accepted the final review in task 123",
};
assert.equal(
  createPageReviewSchema.safeParse({
    ...completeReviewInput,
    decision: { ...completeReviewInput.decision, state: "pending" },
  }).success,
  false,
  "complete fails closed while the decision is pending",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...completeReviewInput,
    gates: minimal.gates,
  }).success,
  false,
  "complete fails closed while any follow-up gate is still open",
);
assert.equal(
  createPageReviewSchema.safeParse(completeReviewInput).success,
  true,
  "complete allows an optional parent and NONE priority when the evidence contract is complete",
);

const completeSerpResults = Array.from({ length: 5 }, (_, index) => ({
  position: index + 1,
  url: `https://competitor-${index + 1}.example/result`,
  title: `Competing result ${index + 1}`,
  offer: "A current river report and trip-planning advice.",
  evidence: "The result was reviewed manually in a signed-out search.",
  gap: "It does not explain the source freshness in plain language.",
}));
const growthCompleteReviewInput = {
  ...completeReviewInput,
  keyword: {
    ...minimal.keyword,
    status: "this_page" as const,
    primaryQuery: "lochsa river fishing report",
  },
  keywordPlanner: keywordPlannerEvidence,
  googleTrends: googleTrendsEvidence,
  measurementPlan: measurementPlanEvidence,
  serp: {
    ...minimal.serp,
    ...serpSnapshot,
    competition: "high" as const,
    evidenceState: "verified" as const,
    results: completeSerpResults,
  },
  offer: {
    competitorOffer: "Competitors provide current conditions and fly suggestions.",
    currentOffer: "BlueStreamFly provides a source-backed river planning report.",
    differentiation: "The page explains freshness, confidence, and official sources.",
    differentiationEvidenceState: "partial" as const,
  },
  eeat: {
    evidence: ["The report names and links its official sources."],
    gaps: ["A same-day local observation is not always available."],
    details: [
      {
        evidence: "The regulation link is direct to the state agency.",
        source: "https://idfg.idaho.gov/fish/rules",
        checkedAt: "2026-08-14T12:00:00.000Z",
        reviewer: "BlueStreamFly river review team",
        limitation: "This does not confirm same-day access conditions.",
      },
    ],
    evidenceState: "partial" as const,
  },
};
assert.equal(
  createPageReviewSchema.safeParse(growthCompleteReviewInput).success,
  true,
  "an indexable keyword-targeted page completes with Google demand, SERP, offer, and E-E-A-T evidence",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    keyword: {
      ...growthCompleteReviewInput.keyword,
      status: "another_canonical",
      ownerCanonical:
        "https://bluestreamfly.com/fly-fishing-reports/idaho",
    },
  }).success,
  true,
  "an indexable another-canonical record still carries query-matched Google demand evidence",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    serp: {
      ...growthCompleteReviewInput.serp,
      results: completeSerpResults.slice(0, 4),
    },
  }).success,
  false,
  "verified SERP evidence requires exactly five complete results at completion",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    serp: {
      ...growthCompleteReviewInput.serp,
      results: completeSerpResults.map((result, index) =>
        index === 0 ? { ...result, gap: null } : result,
      ),
    },
  }).success,
  false,
  "a verified SERP row missing an offer-evidence field is not complete",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    serp: {
      ...growthCompleteReviewInput.serp,
      evidenceState: "partial",
      evidenceSummary:
        "Only one complete result was available; rankings can vary by location.",
      results: completeSerpResults.slice(0, 1),
    },
  }).success,
  true,
  "partial SERP evidence permits one complete result when its limitation is documented",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    serp: {
      ...growthCompleteReviewInput.serp,
      evidenceState: "partial",
      evidenceSummary:
        "Only an incomplete result was available; rankings can vary by location.",
      results: [{ ...completeSerpResults[0], evidence: null }],
    },
  }).success,
  false,
  "partial SERP evidence still requires at least one complete result",
);
for (const [expectedPath, override] of [
  [
    "serp.evidenceState",
    { serp: { ...minimal.serp, evidenceState: "not_applicable" as const } },
  ],
  [
    "offer.differentiationEvidenceState",
    {
      offer: {
        ...minimal.offer,
        differentiationEvidenceState: "not_applicable" as const,
      },
    },
  ],
  [
    "eeat.evidenceState",
    { eeat: { ...minimal.eeat, evidenceState: "not_applicable" as const } },
  ],
] as const) {
  const result = createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    ...override,
  });
  assert.equal(
    result.success,
    false,
    `an indexable keyword-targeted page cannot complete with ${expectedPath}=not_applicable`,
  );
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.path.join(".") === expectedPath &&
          issue.message.includes(
            "cannot be not_applicable for an indexable keyword-targeted page",
          ),
      ),
      `the growth-page N/A error points to ${expectedPath}`,
    );
  }
}
for (const [expectedPath, override] of [
  [
    "keywordPlanner.evidenceState",
    {
      keywordPlanner: {
        ...minimal.keywordPlanner,
        evidenceState: "not_applicable" as const,
        notApplicableReason: "No demand check was recorded for this page.",
      },
    },
  ],
  [
    "googleTrends.evidenceState",
    {
      googleTrends: {
        ...minimal.googleTrends,
        evidenceState: "not_applicable" as const,
        notApplicableReason: "No trend check was recorded for this page.",
      },
    },
  ],
] as const) {
  const result = createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    ...override,
  });
  assert.equal(
    result.success,
    false,
    `an indexable keyword-targeted page cannot complete with ${expectedPath}=not_applicable`,
  );
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) =>
          issue.path.join(".") === expectedPath &&
          issue.message.includes("must be verified or partial"),
      ),
      `the demand-evidence N/A error points to ${expectedPath}`,
    );
  }
}
for (const field of ["locale", "device"] as const) {
  const result = createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    serp: { ...growthCompleteReviewInput.serp, [field]: null },
  });
  assert.equal(result.success, false, `complete growth SERP requires ${field}`);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) => issue.path.join(".") === `serp.${field}`,
      ),
    );
  }
}
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    indexPolicy: "noindex",
    keyword: {
      ...growthCompleteReviewInput.keyword,
      status: "not_applicable",
      primaryQuery: null,
      ownerCanonical: null,
      notApplicableReason:
        "This noindex utility page is not a search-result owner.",
    },
    keywordPlanner: {
      ...minimal.keywordPlanner,
      evidenceState: "not_applicable",
      notApplicableReason:
        "This noindex page is not being evaluated as a search-result owner.",
    },
    googleTrends: {
      ...minimal.googleTrends,
      evidenceState: "not_applicable",
      notApplicableReason:
        "This noindex page is not being evaluated as a search-result owner.",
    },
    serp: { ...minimal.serp, evidenceState: "not_applicable" },
    offer: {
      ...minimal.offer,
      differentiationEvidenceState: "not_applicable",
    },
    eeat: { ...minimal.eeat, evidenceState: "not_applicable" },
  }).success,
  true,
  "a non-index page may document demand, SERP, offer, and E-E-A-T evidence as not applicable",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...completeReviewInput,
    indexPolicy: "noindex",
    keyword: {
      ...minimal.keyword,
      status: "another_canonical",
      primaryQuery: "lochsa river fishing report",
      ownerCanonical:
        "https://bluestreamfly.com/fly-fishing-reports/idaho",
    },
  }).success,
  true,
  "a non-index supporting page may use reasoned not-applicable demand evidence while another canonical owns the query",
);
for (const indexPolicy of ["noindex", "redirect", "remove"] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...growthCompleteReviewInput,
      indexPolicy,
    }).success,
    false,
    `${indexPolicy} pages cannot reserve a THIS_PAGE keyword owner`,
  );
}
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    serp: {
      ...growthCompleteReviewInput.serp,
      query: "a different river report query",
    },
  }).success,
  false,
  "completion compares the live SERP for the approved primary query",
);
for (const evidenceName of ["keywordPlanner", "googleTrends"] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...growthCompleteReviewInput,
      [evidenceName]: {
        ...growthCompleteReviewInput[evidenceName],
        query: "a different river report query",
      },
    }).success,
    false,
    `${evidenceName} evidence must check the approved primary query`,
  );
  assert.equal(
    createPageReviewSchema.safeParse({
      ...growthCompleteReviewInput,
      [evidenceName]: {
        ...growthCompleteReviewInput[evidenceName],
        query: "  LOCHSA   river fishing REPORT  ",
      },
    }).success,
    true,
    `${evidenceName} compares a normalized exact query`,
  );
}
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    serp: {
      ...growthCompleteReviewInput.serp,
      competitionSummary: null,
    },
  }).success,
  false,
  "a structured competition level requires its explanation",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...growthCompleteReviewInput,
    eeat: { ...growthCompleteReviewInput.eeat, gaps: [] },
  }).success,
  false,
  "approved E-E-A-T evidence records a gap or an honest no-gap finding",
);
const incompleteMinimumCases: Array<[string, unknown]> = [
  [
    "indexPolicy",
    { ...completeReviewInput, indexPolicy: "undecided" },
  ],
  [
    "keyword.status",
    { ...completeReviewInput, keyword: minimal.keyword },
  ],
  [
    "topic.cluster",
    {
      ...completeReviewInput,
      topic: { ...completeReviewInput.topic, cluster: null },
    },
  ],
  [
    "topic.maintenanceOwner",
    {
      ...completeReviewInput,
      topic: { ...completeReviewInput.topic, maintenanceOwner: null },
    },
  ],
  [
    "topic.editorialOwner",
    {
      ...completeReviewInput,
      topic: { ...completeReviewInput.topic, editorialOwner: null },
    },
  ],
  [
    "topic.clusterGaps",
    {
      ...completeReviewInput,
      topic: { ...completeReviewInput.topic, clusterGaps: [] },
    },
  ],
  [
    "intent.searchIntent",
    {
      ...completeReviewInput,
      intent: { ...completeReviewInput.intent, searchIntent: "unknown" },
    },
  ],
  [
    "intent.jobToBeDone",
    {
      ...completeReviewInput,
      intent: { ...completeReviewInput.intent, jobToBeDone: null },
    },
  ],
  [
    "manualReview.firstReviewedAt",
    {
      ...completeReviewInput,
      manualReview: {
        ...completeReviewInput.manualReview,
        firstReviewedAt: null,
      },
    },
  ],
  [
    "manualReview.lastReviewedAt",
    {
      ...completeReviewInput,
      manualReview: {
        ...completeReviewInput.manualReview,
        lastReviewedAt: null,
      },
    },
  ],
  [
    "manualReview.nextReviewAt",
    {
      ...completeReviewInput,
      manualReview: {
        ...completeReviewInput.manualReview,
        nextReviewAt: null,
      },
    },
  ],
  [
    "decision.rationale",
    {
      ...completeReviewInput,
      decision: { ...completeReviewInput.decision, rationale: null },
    },
  ],
  [
    "serp.evidenceState",
    {
      ...completeReviewInput,
      serp: { ...completeReviewInput.serp, evidenceState: "missing" },
    },
  ],
  [
    "offer.differentiationEvidenceState",
    {
      ...completeReviewInput,
      offer: {
        ...completeReviewInput.offer,
        differentiationEvidenceState: "missing",
      },
    },
  ],
  [
    "eeat.evidenceState",
    {
      ...completeReviewInput,
      eeat: { ...completeReviewInput.eeat, evidenceState: "missing" },
    },
  ],
  [
    "keywordPlanner.evidenceState",
    {
      ...completeReviewInput,
      keywordPlanner: {
        ...completeReviewInput.keywordPlanner,
        evidenceState: "missing",
        notApplicableReason: null,
      },
    },
  ],
  [
    "googleTrends.evidenceState",
    {
      ...completeReviewInput,
      googleTrends: {
        ...completeReviewInput.googleTrends,
        evidenceState: "missing",
        notApplicableReason: null,
      },
    },
  ],
];
for (const [expectedPath, input] of incompleteMinimumCases) {
  const result = createPageReviewSchema.safeParse(input);
  assert.equal(result.success, false, `COMPLETE rejects missing ${expectedPath}`);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) => issue.path.join(".") === expectedPath,
      ),
      `COMPLETE reports ${expectedPath}`,
    );
  }
}
for (const field of [
  "reviewedAt",
  "decision",
  "rationale",
  "nextAction",
] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...completeReviewInput,
      gates: {
        ...completeReviewInput.gates,
        day7: { ...completeReviewInput.gates.day7, [field]: null },
      },
    }).success,
    false,
    `a terminal gate cannot omit ${field}`,
  );
}
for (const field of ["dueAt", "evidence"] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...completeReviewInput,
      gates: {
        ...completeReviewInput.gates,
        day7: { ...completeReviewInput.gates.day7, [field]: null },
      },
    }).success,
    false,
    `a recorded gate cannot omit ${field}`,
  );
}
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    manualChatState: "approved_to_record",
    userDecisionReference: "User reviewed the record in this task.",
  }).success,
  false,
  "a decision reference alone cannot approve an empty seeded record",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...approvedReviewInput,
    manualChatState: "approved_to_implement",
    userDecisionReference: "User approved implementation in this task.",
    decision: {
      ...approvedReviewInput.decision,
      proposedChange: null,
    },
  }).success,
  false,
  "implementation approval requires the bounded proposed change",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    reviewStatus: "monitoring",
    manualChatState: "monitoring",
    userDecisionReference: "User reviewed the record in this task.",
  }).success,
  false,
  "monitoring cannot release an untouched seeded review",
);
for (const state of [
  "expand",
  "revise",
  "iterate",
  "merge",
  "redirect",
  "noindex",
  "retire",
  "rollback",
] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...approvedReviewInput,
      reviewStatus: "monitoring",
      manualChatState: "monitoring",
      userDecisionReference: "User reviewed the record in this task.",
      decision: {
        ...approvedReviewInput.decision,
        state,
        changeState: "not_planned",
      },
      gates: {
        day7: { ...minimal.gates.day7, dueAt: "2026-08-21T13:00:00.000Z" },
        day28: { ...minimal.gates.day28, dueAt: "2026-09-11T13:00:00.000Z" },
        day56: { ...minimal.gates.day56, dueAt: "2026-10-09T13:00:00.000Z" },
      },
    }).success,
    false,
    `monitoring cannot treat unimplemented ${state} as no-change`,
  );
}
for (const nonterminalDecision of [
  "pending",
  "change_recommended",
  "blocked",
] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...completeReviewInput,
      decision: {
        ...completeReviewInput.decision,
        state: nonterminalDecision,
      },
    }).success,
    false,
    `${nonterminalDecision} is not a terminal COMPLETE decision`,
  );
}
for (const unfinishedChangeState of ["planned", "in_progress"] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({
      ...completeReviewInput,
      decision: {
        ...completeReviewInput.decision,
        state: "revise",
        changeState: unfinishedChangeState,
      },
    }).success,
    false,
    `complete rejects unfinished changeState ${unfinishedChangeState}`,
  );
}
assert.equal(
  createPageReviewSchema.safeParse({
    ...minimal,
    reviewStatus: "complete",
  }).success,
  false,
  "reviewStatus cannot claim completion while manualChatState remains open",
);
assert.equal(
  createPageReviewSchema.safeParse({
    ...completeReviewInput,
    reviewStatus: "unreviewed",
  }).success,
  false,
  "manualChatState cannot claim completion while reviewStatus remains open",
);
const reviewStatusOnlyCompletePatch = patchPageReviewSchema.parse({
  expectedVersion: 1,
  reviewStatus: "complete",
});
assert.throws(
  () =>
    normalizePageReviewPatch(
      reviewStatusOnlyCompletePatch,
      current,
      "bluestreamfly.com",
    ),
  /reviewStatus and manualChatState must both be complete/,
  "merged PATCH rejects status-only false completion",
);
const chatOnlyCompletePatch = patchPageReviewSchema.parse({
  expectedVersion: 1,
  manualChatState: "complete",
  userDecisionReference: "User accepted the final review in task 123",
  decision: { state: "no_change" },
  gates: terminalGates,
});
assert.throws(
  () =>
    normalizePageReviewPatch(chatOnlyCompletePatch, current, "bluestreamfly.com"),
  /reviewStatus and manualChatState must both be complete/,
  "merged PATCH rejects chat-only false completion",
);

const unapprovedPlanPatch = patchPageReviewSchema.parse({
  expectedVersion: 1,
  decision: { changeState: "planned" },
});
assert.throws(
  () => normalizePageReviewPatch(unapprovedPlanPatch, current, "bluestreamfly.com"),
  /planned requires manualChatState approved_to_implement/,
  "partial PATCH is validated against the merged persisted workflow state",
);
const approvedPlanPatch = patchPageReviewSchema.parse({
  expectedVersion: 1,
  manualChatState: "approved_to_implement",
  userDecisionReference: "User approved implementation in task 123",
  decision: {
    ...approvedReviewInput.decision,
    changeState: "planned",
    state: "change_recommended",
  },
});
const reviewedDraftCurrent = {
  ...current,
  ...normalizePageReviewInput(
    createPageReviewSchema.parse({
      ...approvedReviewInput,
      manualChatState: "awaiting_user_decision",
      userDecisionReference: null,
      decision: {
        ...approvedReviewInput.decision,
        changeState: "not_planned",
      },
    }),
    "bluestreamfly.com",
  ),
} as unknown as PageReview;
assert.doesNotThrow(() =>
  normalizePageReviewPatch(
    approvedPlanPatch,
    reviewedDraftCurrent,
    "bluestreamfly.com",
  ),
);

const approvedMonitoringSource = normalizePageReviewInput(
  createPageReviewSchema.parse({
    ...approvedReviewInput,
    reviewStatus: "ready_to_change",
    manualChatState: "approved_to_implement",
    userDecisionReference: "User approved implementation in task 123",
    decision: {
      ...approvedReviewInput.decision,
      state: "change_recommended",
      rationale: "The current title does not match the query.",
      proposedChange: "Use the approved query in the title.",
      changeState: "shipped",
      changeId: "commit-monitoring-123",
      changedAt: "2026-08-14T14:00:00.000Z",
    },
    gates: {
      ...minimal.gates,
      day7: {
        ...minimal.gates.day7,
        status: "due",
        dueAt: "2026-08-21T14:00:00.000Z",
        evidence: "Waiting for the first Search Console check.",
        nextAction: "Record impressions and clicks.",
      },
      day28: {
        ...minimal.gates.day28,
        dueAt: "2026-09-11T14:00:00.000Z",
      },
      day56: {
        ...minimal.gates.day56,
        dueAt: "2026-10-09T14:00:00.000Z",
      },
    },
  }),
  "bluestreamfly.com",
);
const approvedMonitoringCurrent = {
  id: "review-monitoring",
  siteId: "site-1",
  ...approvedMonitoringSource,
  version: 4,
  deletedAt: null,
  createdAt: new Date("2026-08-14T12:00:00.000Z"),
  updatedAt: new Date("2026-08-14T14:00:00.000Z"),
} as unknown as PageReview;
const monitoringTransition = normalizePageReviewPatch(
  patchPageReviewSchema.parse({
    expectedVersion: 4,
    reviewStatus: "monitoring",
    manualChatState: "monitoring",
  }),
  approvedMonitoringCurrent,
  "bluestreamfly.com",
);
assert.equal(monitoringTransition.reviewStatus, "MONITORING");
assert.equal(monitoringTransition.manualChatState, "MONITORING");
assert.equal(
  monitoringTransition.userDecisionReference,
  approvedMonitoringSource.userDecisionReference,
);
const monitoringTransitionRecord = monitoringTransition as unknown as Record<
  string,
  unknown
>;
const approvedMonitoringSourceRecord =
  approvedMonitoringSource as unknown as Record<string, unknown>;
for (const preservedField of [
  "decisionState",
  "decisionRationale",
  "proposedChange",
  "changeState",
  "changeId",
  "changedAt",
  "day7State",
  "day7DueAt",
  "day7Evidence",
  "day7NextAction",
] as const) {
  assert.deepEqual(
    monitoringTransitionRecord[preservedField],
    approvedMonitoringSourceRecord[preservedField],
    `monitoring transition preserves ${preservedField}`,
  );
}
assert.deepEqual(
  semanticChangedReviewFields(
    monitoringTransition,
    approvedMonitoringCurrent,
  ),
  ["reviewStatus", "manualChatState"],
  "monitoring transition changes only the workflow status fields",
);

assert.deepEqual(activeManualChatStateValues, [
  "researching",
  "awaiting_user_decision",
  "approved_to_record",
  "approved_to_implement",
]);
assert.equal(
  isActiveManualChatState("MONITORING"),
  false,
  "monitoring releases the one-active-page slot",
);
for (const outcome of [
  "inconclusive",
  "iterate",
  "redirect",
  "noindex",
  "rollback",
] as const) {
  assert.equal(
    createPageReviewSchema.safeParse({ ...minimal, decision: { state: outcome } })
      .success,
    true,
    `documented ${outcome} outcome must be persistable`,
  );
}
assert.equal(
  patchPageReviewSchema.safeParse({
    priority: "p1",
  }).success,
  false,
  "PATCH requires expectedVersion",
);
assert.equal(
  patchPageReviewSchema.safeParse({ expectedVersion: 1, changeNote: "nothing" })
    .success,
  false,
  "metadata alone is not a material PATCH",
);
assert.equal(
  deletePageReviewSchema.safeParse({ changeNote: "remove duplicate" }).success,
  false,
  "DELETE requires expectedVersion",
);
assert.equal(
  deletePageReviewSchema.safeParse({ expectedVersion: 1 }).success,
  true,
);

assert.deepEqual(
  parseCsvRows('a,b,c\n1,"two, too","three\nlines"\n'),
  [
    ["a", "b", "c"],
    ["1", "two, too", "three\nlines"],
  ],
  "inventory parser handles quoted commas and newlines",
);

const inventorySource = await readFile(
  "/Users/notesmbr/Documents/BlueStreamFly-remove-research/docs/seo/seo-page-inventory.csv",
  "utf8",
);
const inventory = parsePageReviewInventory(inventorySource);
assert.equal(inventory.length, 669);
assert.equal(new Set(inventory.map((entry) => entry.pageId)).size, 669);
assert.equal(new Set(inventory.map((entry) => entry.canonicalUrl)).size, 669);
assert.equal(
  inventory.filter((entry) => entry.pageFamily === "RIVER_REPORT").length,
  459,
);

const [
  schema,
  migration,
  decisionMigration,
  evidenceMigration,
  monitoringMigration,
  demandEvidenceMigration,
  collectionRoute,
  itemRoute,
  seedScript,
  packageSource,
] = await Promise.all([
    readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../prisma/migrations/20260814143000_add_manual_page_reviews/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../prisma/migrations/20260814170000_align_page_review_decisions/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../prisma/migrations/20260814183000_add_review_evidence_states_and_serp_competition/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../prisma/migrations/20260814190000_add_monitoring_manual_chat_state/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../prisma/migrations/20260815100000_add_google_demand_evidence/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../app/api/sites/[siteId]/page-reviews/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../app/api/sites/[siteId]/page-reviews/[reviewId]/route.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("./seed-page-reviews.mts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

assert.match(schema, /model PageReview \{/);
assert.match(schema, /eeatEvidenceDetails Json\?/);
assert.match(schema, /serpCompetition\s+SerpCompetition @default\(UNCLEAR\)/);
assert.match(schema, /serpEvidenceState\s+EvidenceState @default\(MISSING\)/);
assert.match(schema, /eeatEvidenceState\s+EvidenceState @default\(MISSING\)/);
assert.match(
  schema,
  /keywordPlannerEvidenceState\s+EvidenceState @default\(MISSING\)/,
);
assert.match(schema, /keywordPlannerEvidenceDetails\s+Json\?/);
assert.match(
  schema,
  /googleTrendsEvidenceState\s+EvidenceState @default\(MISSING\)/,
);
assert.match(schema, /googleTrendsEvidenceDetails\s+Json\?/);
assert.match(schema, /enum SerpCompetition \{/);
assert.match(schema, /enum ManualChatState \{[\s\S]*\bMONITORING\b[\s\S]*\bCOMPLETE\b/);
assert.match(schema, /userDecisionReference String\?/);
assert.match(schema, /P4/);
for (const outcome of [
  "INCONCLUSIVE",
  "ITERATE",
  "REDIRECT",
  "NOINDEX",
  "ROLLBACK",
]) {
  assert.match(schema, new RegExp(`\\b${outcome}\\b`));
  assert.match(
    decisionMigration,
    new RegExp(`ADD VALUE IF NOT EXISTS '${outcome}'`),
  );
}
assert.match(
  migration,
  /CREATE UNIQUE INDEX "PageReview_one_current_primary_keyword_owner"[\s\S]*"keywordOwnership" = 'THIS_PAGE'/,
  "a partial database unique index serializes concurrent primary-owner claims",
);
assert.doesNotMatch(
  migration,
  /"serpCompetition"|"serpEvidenceState"|"eeatEvidenceState"/,
  "the already-deployed base migration stays immutable",
);
assert.match(evidenceMigration, /CREATE TYPE "SerpCompetition"/);
assert.match(
  evidenceMigration,
  /ADD COLUMN "serpCompetition" "SerpCompetition" NOT NULL DEFAULT 'UNCLEAR'/,
);
assert.match(
  evidenceMigration,
  /ADD COLUMN "serpEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING'/,
);
assert.match(
  evidenceMigration,
  /ADD COLUMN "eeatEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING'/,
);
assert.match(
  monitoringMigration,
  /ALTER TYPE "ManualChatState" ADD VALUE IF NOT EXISTS 'MONITORING'/,
);
assert.match(
  demandEvidenceMigration,
  /ADD COLUMN "keywordPlannerEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING'/,
);
assert.match(
  demandEvidenceMigration,
  /ADD COLUMN "keywordPlannerEvidenceDetails" JSONB/,
);
assert.match(
  demandEvidenceMigration,
  /ADD COLUMN "googleTrendsEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING'/,
);
assert.match(
  demandEvidenceMigration,
  /ADD COLUMN "googleTrendsEvidenceDetails" JSONB/,
);
assert.match(
  migration,
  /CREATE UNIQUE INDEX "PageReview_one_active_manual_chat_per_site"[\s\S]*'APPROVED_TO_IMPLEMENT'/,
  "a partial database unique index serializes concurrent active-review claims",
);
const activeReviewIndex = migration.slice(
  migration.indexOf(
    'CREATE UNIQUE INDEX "PageReview_one_active_manual_chat_per_site"',
  ),
);
assert.doesNotMatch(
  activeReviewIndex,
  /'MONITORING'/,
  "monitoring intentionally remains outside the one-active-review index",
);
assert.match(
  migration,
  /CREATE UNIQUE INDEX "PageReview_one_current_canonical_per_site"/,
);
assert.match(collectionRoute, /if \(!session\?\.user\?\.id\)/);
assert.match(collectionRoute, /site\.userId !== session\.user\.id/);
assert.match(collectionRoute, /Request body must be valid JSON/);
assert.match(collectionRoute, /pageReviewRevision\.create/);
assert.match(itemRoute, /semanticChangedReviewFields/);
assert.match(itemRoute, /changedFields,/);
assert.match(itemRoute, /unchanged: true/);
assert.match(itemRoute, /version: \{ increment: 1 \}/);
assert.match(itemRoute, /pageReviewRevision\.create/);
assert.match(itemRoute, /TransactionIsolationLevel\.Serializable/);
assert.match(collectionRoute, /PAGE_REVIEW_VERSION_CONFLICT/);
assert.match(itemRoute, /PAGE_REVIEW_VERSION_CONFLICT/);
assert.match(seedScript, /DEFAULT_EXPECTED_PAGE_COUNT = 669/);
assert.match(seedScript, /DEFAULT_EXPECTED_APPROVED_OWNER_COUNT = 8/);
assert.match(seedScript, /reviewedAt: \{ not: null \}/);
assert.match(seedScript, /keywordOwnership: approval \? \("THIS_PAGE"/);
assert.match(seedScript, /serpCompetition: "UNCLEAR"/);
assert.match(seedScript, /serpEvidenceState: "MISSING"/);
assert.match(seedScript, /eeatEvidenceState: "MISSING"/);
assert.match(seedScript, /keywordPlannerEvidenceState: "MISSING"/);
assert.match(seedScript, /keywordPlannerEvidenceDetails: Prisma\.DbNull/);
assert.match(seedScript, /googleTrendsEvidenceState: "MISSING"/);
assert.match(seedScript, /googleTrendsEvidenceDetails: Prisma\.DbNull/);
assert.match(seedScript, /no synchronization or scheduling was installed/);
assert.match(packageSource, /"page-reviews:seed"/);

const summarySelect = collectionRoute.slice(
  collectionRoute.indexOf("const summarySelect"),
  collectionRoute.indexOf("function enumFilter"),
);
assert.doesNotMatch(summarySelect, /serpResults/);
assert.doesNotMatch(summarySelect, /eeatEvidence/);

console.log("Manual page-review backend checks passed.");
