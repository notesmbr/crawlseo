import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  matchesPageReviewFilters,
  MANUAL_CHAT_STATE_OPTIONS,
  normalizePageReview,
  normalizePageReviewSummary,
  pageReviewDraftStorageKey,
  pageReviewPatchInput,
  isApprovedManualState,
  inspectPageReviewDraft,
  isActiveManualState,
  serializePageReviewDraft,
  shouldConfirmRouteNavigation,
  splitReviewLines,
  validatePageReview,
} from "../lib/page-review-workboard.ts";

const rawReview = {
  id: "review-1",
  siteId: "site-1",
  pageId: "fly-fishing-reports__idaho__lochsa-river",
  canonicalUrl: "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river",
  pageFamily: "river_report",
  indexPolicy: "index",
  reviewStatus: "researching",
  priority: "p1",
  keyword: {
    status: "this_page",
    ownerCanonical: null,
    primaryQuery: "lochsa river fishing report",
    notApplicableReason: null,
    secondaryQueries: ["lochsa fishing report"],
  },
  keywordPlanner: {
    evidenceState: "verified",
    query: "lochsa river fishing report",
    checkedAt: "2026-08-13T21:02:00.000Z",
    method: "google_ads_api",
    sourceUrl: "https://ads.google.com/aw/keywordplanner/home",
    geoTarget: "United States",
    language: "English",
    network: "google_search",
    averageMonthlySearches: 10,
    monthlySearches: [{ year: 2026, month: 7, searches: 10 }],
    paidAdvertiserCompetition: "low",
    paidAdvertiserCompetitionIndex: 12,
    lowTopOfPageBidMicros: 200000,
    highTopOfPageBidMicros: 900000,
    limitation: "Planner metrics are rounded and describe paid search demand.",
    notApplicableReason: null,
  },
  googleTrends: {
    evidenceState: "partial",
    query: "lochsa river fishing report",
    checkedAt: "2026-08-13T21:03:00.000Z",
    method: "manual_google_trends",
    sourceUrl: "https://trends.google.com/trends/explore?geo=US&q=lochsa%20river%20fishing%20report",
    geo: "United States",
    timeframe: "Past 5 years",
    comparisonQueries: ["lochsa fishing report"],
    direction: "insufficient_data",
    finding: "The exact query has too little Trends data for a reliable direction.",
    limitation: "Google Trends suppresses very low-interest series.",
    notApplicableReason: null,
  },
  measurementPlan: {
    evidenceState: "partial",
    baselineCanonical:
      "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river",
    baselineAsOf: "2026-08-13",
    windowStart: "2026-07-17",
    windowEnd: "2026-08-13",
    gsc: {
      evidenceState: "verified",
      checkedAt: "2026-08-15T13:00:00.000Z",
      method: "crawlseo_gsc_import",
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
      evidenceState: "partial",
      checkedAt: "2026-08-15T13:05:00.000Z",
      method: "manual_ga4_report",
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
      source: "gsc",
      metric: "clicks",
      direction: "increase",
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
  },
  topic: {
    cluster: "Idaho river reports",
    parentPage: "https://bluestreamfly.com/fly-fishing-reports/idaho",
    clusterGaps: ["Current local observation evidence"],
    maintenanceOwner: "River source review",
    editorialOwner: "BlueStreamFly river review team",
  },
  intent: {
    searchIntent: "local_trip_planning",
    jobToBeDone: "Decide whether the named river is worth fishing now.",
  },
  serp: {
    snapshotAt: "2026-08-13T21:04:00.000Z",
    query: "lochsa river fishing report",
    locale: "Hollidaysburg, Pennsylvania",
    device: "desktop",
    method: "manual_google",
    evidenceSummary: "Signed-out Google snapshot; results vary by location.",
    evidenceState: "partial",
    features: ["AI Overview", "People Also Ask"],
    competition: "medium",
    competitionSummary: "One current report, one official rules page, and mixed planning pages.",
    results: [
      {
        position: 1,
        url: "https://idfg.idaho.gov/example",
        title: "Lochsa River",
        offer: "Official rules",
        evidence: "State agency",
        gap: "No current fishing interpretation",
      },
    ],
  },
  offer: {
    competitorOffer: "Official rules, a current shop report, and flow data.",
    currentOffer: "Live flow, weather, access, rules, and trip guidance.",
    differentiation: "Combines trip decision data with direct official sources.",
    differentiationEvidenceState: "verified",
  },
  eeat: {
    evidence: ["Direct official sources"],
    gaps: ["No named local reviewer"],
    evidenceState: "verified",
    details: [
      {
        evidence: "The rules link resolves to the named state agency page.",
        source: "https://idfg.idaho.gov/fish/rules",
        checkedAt: "2026-08-13T21:04:00.000Z",
        reviewer: "BlueStreamFly river review team",
        limitation: "The source does not describe current on-river conditions.",
      },
    ],
  },
  decision: {
    state: "no_change",
    rationale: "The page already serves the intent.",
    proposedChange: null,
    performanceState: "impressions_without_result",
    scopeClass: "focused",
    scopeRationale: "One answer-first module is the only verified gap.",
    demonstratedWins: [],
    preservedElements: ["Canonical URL and official-source links"],
    intentionallyChangedElements: [],
    blastRadius: "page_local",
    affectedPageFamily: null,
    affectedCanonicalCount: 1,
    blastRadiusNote: "Only this canonical changes.",
    experimentState: "none",
    experimentId: null,
    experimentFrozenUntil: null,
    experimentExceptionReason: null,
    rollbackTrigger: "Rollback if relevant impressions decline without a user benefit.",
    changeState: "not_planned",
    changeId: null,
    changedAt: null,
  },
  gates: {
    day7: {
      status: "not_due",
      dueAt: null,
      reviewedAt: null,
      evidence: null,
      decision: null,
      rationale: null,
      nextAction: null,
    },
    day28: { status: "not_due" },
    day56: { status: "not_due" },
  },
  manualReview: {
    firstReviewedAt: "2026-08-13T21:04:00.000Z",
    lastReviewedAt: "2026-08-13T21:04:00.000Z",
    nextReviewAt: "2026-08-20T21:04:00.000Z",
    notes: "Manual review only.",
  },
  manualChatState: "researching",
  userDecisionReference: "Codex task 2026-08-13",
  version: 3,
  updatedAt: "2026-08-13T21:30:00.000Z",
};

const review = normalizePageReview(rawReview);
assert.equal(review.status, "researching");
assert.equal(review.editorialOwner, "BlueStreamFly river review team");
assert.equal(
  normalizePageReview({ pageFamily: "river_report", topic: {} }).editorialOwner,
  "BlueStreamFly River Review Team",
  "a new river review defaults to the transparent organizational owner",
);
assert.equal(
  normalizePageReview({ pageFamily: "article", topic: {} }).editorialOwner,
  "",
  "non-river reviews do not receive a fabricated contributor",
);
assert.equal(review.serpTopFive.length, 5, "editor always preserves five result positions");
assert.equal(review.serpTopFive[0]?.offer, "Official rules");
assert.equal(review.serpEvidenceState, "partial");
assert.equal(review.serpCompetition, "medium");
assert.equal(review.eeatEvidenceState, "verified");
assert.equal(review.keywordPlanner.averageMonthlySearches, "10");
assert.equal(review.keywordPlanner.monthlySearches[0]?.searches, 10);
assert.equal(review.googleTrends.direction, "insufficient_data");
assert.equal(review.measurementPlan.gsc.clicks, "8");
assert.equal(review.measurementPlan.ga4.screenPageViews, "14");
assert.equal(review.measurementPlan.primaryKpiMetric, "clicks");
assert.equal(review.measurementPlan.guardrails.split("\n").length, 2);
assert.equal(review.measurementPlan.comparisonWindows[0]?.clicks, "25");
assert.equal(review.eeatDetails[0]?.reviewer, "BlueStreamFly river review team");
assert.equal(review.day7.status, "not_due");
assert.equal(review.version, 3);

const draftKey = pageReviewDraftStorageKey("site-1", "review-1");
assert.equal(draftKey, "crawlseo:page-review-draft:site-1:review-1");
const unsavedReview = { ...review, manualNotes: "Unsaved browser note" };
const currentDraftRecovery = inspectPageReviewDraft(serializePageReviewDraft(unsavedReview), review);
assert.equal(currentDraftRecovery.status, "current");
assert.equal(
  currentDraftRecovery.status === "current" ? currentDraftRecovery.draft.manualNotes : null,
  "Unsaved browser note",
  "a same-version per-review browser draft is recoverable",
);
const staleDraft = JSON.parse(serializePageReviewDraft(unsavedReview));
staleDraft.baseVersion = review.version - 1;
const staleDraftRecovery = inspectPageReviewDraft(JSON.stringify(staleDraft), review);
assert.equal(staleDraftRecovery.status, "stale", "a stale-version browser draft is retained");
assert.equal(
  staleDraftRecovery.status === "stale" ? staleDraftRecovery.draft.manualNotes : null,
  "Unsaved browser note",
  "stale work remains available for explicit comparison or copy",
);
assert.equal(
  staleDraftRecovery.status === "stale" ? staleDraftRecovery.draft.version : null,
  review.version,
  "manual stale-draft restore keeps the current server version for optimistic saving",
);
assert.equal(inspectPageReviewDraft("not json", review).status, "invalid");
assert.equal(
  shouldConfirmRouteNavigation(
    "https://crawlseo.local/sites/site-1/page-reviews#review-serp",
    "https://crawlseo.local/sites/site-1/page-reviews#review-eeat",
  ),
  false,
  "same-page section navigation stays frictionless",
);
assert.equal(
  shouldConfirmRouteNavigation(
    "https://crawlseo.local/sites/site-1/page-reviews",
    "https://crawlseo.local/sites/site-1/pages",
  ),
  true,
);
assert.equal(
  shouldConfirmRouteNavigation(
    "https://crawlseo.local/sites/site-1/page-reviews",
    "https://bluestreamfly.com/",
  ),
  false,
  "the custom route guard only intercepts same-origin navigation",
);

const reviewWithRankGap = normalizePageReview({
  ...rawReview,
  serp: {
    ...rawReview.serp,
    results: [{ ...rawReview.serp.results[0], position: 2 }],
  },
});
assert.equal(reviewWithRankGap.serpTopFive[0]?.url, "", "an empty first rank stays empty");
assert.equal(
  reviewWithRankGap.serpTopFive[1]?.offer,
  "Official rules",
  "recorded evidence stays attached to its actual SERP position",
);
assert.ok(
  validatePageReview({
    ...review,
    serpTopFive: review.serpTopFive.map((result, index) =>
      index === 1 ? { ...result, position: 1 } : result,
    ),
  }).some((message) => message.includes("unique ranks 1 through 5")),
  "duplicate or shifted SERP positions cannot be saved",
);

const summary = normalizePageReviewSummary(rawReview);
assert.equal(summary.reviewStatus, "researching");
assert.equal(summary.topicCluster, "Idaho river reports");
assert.equal(summary.keywordStatus, "this_page");

assert.equal(
  matchesPageReviewFilters(summary, {
    query: "lochsa river",
    status: "researching",
    family: "river_report",
    priority: "p1",
    cluster: "Idaho river reports",
  }),
  true,
);
assert.equal(
  matchesPageReviewFilters(summary, {
    query: "",
    status: "complete",
    family: "",
    priority: "",
    cluster: "",
  }),
  false,
);

assert.deepEqual(validatePageReview(review), []);
assert.ok(
  validatePageReview({ ...review, parentPage: "fly-fishing-reports/idaho" }).some((message) =>
    message.includes("full same-site HTTPS URL"),
  ),
  "parent pages cannot be page IDs, relative paths, or sentinel text",
);
assert.equal(isApprovedManualState("researching"), false);
assert.equal(isApprovedManualState("approved_to_record"), true);
assert.equal(isApprovedManualState("monitoring"), true);
assert.equal(isActiveManualState("researching"), true);
assert.equal(isActiveManualState("monitoring"), false);
assert.ok(MANUAL_CHAT_STATE_OPTIONS.includes("monitoring"));

const researchDraft = {
  ...review,
  manualChatState: "awaiting_user_decision",
  userDecisionReference: "",
};
assert.deepEqual(
  validatePageReview(researchDraft),
  [],
  "research and awaiting-decision records remain saveable drafts without approval",
);
assert.deepEqual(
  validatePageReview({
    ...review,
    serpTopFive: review.serpTopFive.map((result, index) =>
      index === 0 ? { ...result, gap: "" } : result,
    ),
  }),
  [],
  "partial SERP rows may remain incomplete while the review is still a draft",
);

const approvedWithoutReference = {
  ...review,
  manualChatState: "approved_to_record",
  userDecisionReference: "",
};
assert.ok(
  validatePageReview(approvedWithoutReference).some((message) =>
    message.includes("user decision reference"),
  ),
  "approved records require the user's decision reference",
);

const unapprovedPlannedChange = {
  ...review,
  manualChatState: "awaiting_user_decision",
  userDecisionReference: "",
  decisionChangeState: "planned",
};
assert.ok(
  validatePageReview(unapprovedPlannedChange).some((message) =>
    message.includes("approval to implement"),
  ),
  "planned changes require implementation approval",
);

const approvedPlannedChange = {
  ...review,
  manualChatState: "approved_to_implement",
  userDecisionReference: "User approval in task 2026-08-13",
  decisionAction: "change_recommended",
  proposedChange: "Clarify the answer-first trip guidance.",
  decisionChangeState: "planned",
};
assert.deepEqual(validatePageReview(approvedPlannedChange), []);

const sharedRiverTemplateChange = {
  ...approvedPlannedChange,
  changeScope: "comprehensive",
  scopeRationale:
    "The verified safety and source defects live in the shared river-report template.",
  proposedChange:
    "Repair the shared river-report safety and official-source modules while preserving page facts.",
  changeBlastRadius: "shared_template",
  affectedPageFamily: "river_report",
  affectedCanonicalCount: "459",
  blastRadiusNote:
    "Shared river-report decision, safety, and official-source modules change across all 459 river reports.",
  rollbackTrigger:
    "Rollback if representative river reports lose safety guidance, source links, or indexability.",
};
assert.deepEqual(
  validatePageReview(sharedRiverTemplateChange),
  [],
  "the workboard accepts one shared-template repair for the complete river-report family",
);
assert.deepEqual(
  validatePageReview({
    ...sharedRiverTemplateChange,
    changeBlastRadius: "mixed",
    blastRadiusNote:
      "Repair shared safety and source modules on all river reports, then refresh Lochsa-specific access and rules evidence.",
  }),
  [],
  "the workboard can record shared river-template and page-local work together",
);
assert.ok(
  validatePageReview({
    ...sharedRiverTemplateChange,
    affectedPageFamily: "state_hub",
  }).some((message) => message.includes("every river_report page")),
  "a river-report template recommendation cannot target another page family",
);
assert.ok(
  validatePageReview({
    ...sharedRiverTemplateChange,
    affectedCanonicalCount: "1",
  }).some((message) => message.includes("more than one canonical")),
  "a shared template cannot masquerade as a page-local change",
);
assert.ok(
  validatePageReview({
    ...sharedRiverTemplateChange,
    blastRadiusNote: "",
  }).some((message) => message.includes("shared and page-local behavior")),
  "a shared-template recommendation must name the reusable surface being changed",
);

const emptyMeasurementPlan = normalizePageReview({
  ...rawReview,
  measurementPlan: { evidenceState: "missing" },
}).measurementPlan;
assert.equal(
  emptyMeasurementPlan.gsc.clicks,
  "",
  "a missing GSC value stays blank instead of becoming zero",
);
assert.deepEqual(
  validatePageReview({
    ...review,
    manualChatState: "approved_to_record",
    decisionAction: "no_change",
    changeScope: "not_applicable",
    changeBlastRadius: "not_applicable",
    affectedCanonicalCount: "",
    rollbackTrigger: "",
    decisionChangeState: "not_planned",
    measurementPlan: emptyMeasurementPlan,
  }),
  [],
  "approval to record does not authorize a change and may precede measurement planning",
);
assert.ok(
  validatePageReview({
    ...approvedPlannedChange,
    measurementPlan: emptyMeasurementPlan,
  }).some((message) => message.includes("measurement plan")),
  "approved implementation needs a credible measurement plan",
);
assert.ok(
  validatePageReview({
    ...approvedPlannedChange,
    measurementPlan: {
      ...approvedPlannedChange.measurementPlan,
      baselineCanonical: "https://bluestreamfly.com/a-different-page",
    },
  }).some((message) => message.includes("exact canonical")),
  "the baseline canonical must match the reviewed page before implementation",
);
assert.ok(
  validatePageReview({
    ...approvedPlannedChange,
    measurementPlan: {
      ...approvedPlannedChange.measurementPlan,
      gsc: { ...approvedPlannedChange.measurementPlan.gsc, clicks: "" },
    },
  }).some((message) => message.includes("known canonical baseline value")),
  "the selected KPI cannot silently turn an unknown baseline into zero",
);

assert.ok(
  validatePageReview({
    ...approvedPlannedChange,
    keywordPlanner: { ...approvedPlannedChange.keywordPlanner, query: "different query" },
  }).some((message) => message.includes("Keyword Planner query must match")),
  "approved keyword ownership keeps Planner evidence at the exact primary-query grain",
);
assert.ok(
  validatePageReview({
    ...approvedPlannedChange,
    googleTrends: {
      ...approvedPlannedChange.googleTrends,
      evidenceState: "partial",
      limitation: "",
    },
  }).some((message) => message.includes("Partial Google Trends evidence")),
  "partial Trends evidence needs an honest limitation",
);

const shippedWithoutProof = {
  ...approvedPlannedChange,
  decisionChangeState: "shipped",
  changeId: "",
  decisionChangedAt: "",
};
const shippedErrors = validatePageReview(shippedWithoutProof);
assert.ok(shippedErrors.some((message) => message.includes("change ID")));
assert.ok(shippedErrors.some((message) => message.includes("change date and time")));

const monitoringAfterShip = {
  ...review,
  status: "monitoring",
  manualChatState: "monitoring",
  userDecisionReference: "User approved implementation in task 2026-08-13",
  decisionAction: "change_recommended",
  proposedChange: "Clarify the answer-first trip guidance.",
  decisionChangeState: "shipped",
  changeId: "release-123",
  decisionChangedAt: "2026-08-13T22:00:00.000Z",
  day7: { ...review.day7, dueAt: "2026-08-20T21:04:00.000Z" },
  day28: { ...review.day28, dueAt: "2026-09-10T21:04:00.000Z" },
  day56: { ...review.day56, dueAt: "2026-10-08T21:04:00.000Z" },
};
assert.deepEqual(
  validatePageReview(monitoringAfterShip),
  [],
  "monitoring can hold an approved shipped change while outcome gates remain pending",
);
assert.ok(
  validatePageReview({ ...monitoringAfterShip, userDecisionReference: "" }).some((message) =>
    message.includes("user decision reference"),
  ),
  "monitoring remains an approved state with a decision reference",
);
assert.ok(
  validatePageReview({ ...monitoringAfterShip, decisionChangeState: "planned" }).some((message) =>
    message.includes("approval to implement"),
  ),
  "monitoring cannot conceal an implementation that is still only planned",
);

const incompleteCompletion = {
  ...review,
  status: "complete",
  manualChatState: "complete",
  userDecisionReference: "User approved completion in task 2026-08-13",
  decisionAction: "pending",
};
const completionErrors = validatePageReview(incompleteCompletion);
assert.ok(completionErrors.some((message) => message.includes("terminal outcome")));
assert.ok(completionErrors.some((message) => message.startsWith("day7.status")));
assert.ok(completionErrors.some((message) => message.startsWith("day28.status")));
assert.ok(completionErrors.some((message) => message.startsWith("day56.status")));

const validCompletion = {
  ...review,
  status: "complete",
  manualChatState: "complete",
  userDecisionReference: "User approved completion in task 2026-08-13",
  decisionAction: "no_change",
  changeScope: "not_applicable",
  changeBlastRadius: "not_applicable",
  affectedCanonicalCount: "",
  rollbackTrigger: "",
  day7: {
    status: "recorded",
    dueAt: "2026-08-20T21:04:00.000Z",
    reviewedAt: "2026-08-20T22:04:00.000Z",
    evidence: "Search Console and GA4 evidence reviewed.",
    decision: "Keep monitoring.",
    rationale: "The first-week signal is directional only.",
    nextAction: "Return at day 28.",
  },
  day28: {
    status: "missed",
    dueAt: "2026-09-10T21:04:00.000Z",
    reviewedAt: "2026-09-11T21:04:00.000Z",
    evidence: "The scheduled review was not completed on its due date.",
    decision: "Record the miss without inferring an outcome.",
    rationale: "No timely comparison was made.",
    nextAction: "Use the day-56 gate for the final review.",
  },
  day56: {
    status: "not_applicable",
    dueAt: "",
    reviewedAt: "2026-10-08T21:04:00.000Z",
    evidence: "",
    decision: "No day-56 measurement applies.",
    rationale: "No additional outcome window applies to this decision.",
    nextAction: "Recheck on the maintenance date.",
  },
};
assert.deepEqual(validatePageReview(validCompletion), []);
assert.ok(
  validatePageReview({ ...validCompletion, serpEvidenceState: "verified" }).some((message) =>
    message.includes("all five competitor rows"),
  ),
  "verified SERP evidence cannot rely on an incomplete top five",
);
const completeTopFive = validCompletion.serpTopFive.map((result, index) => ({
  ...result,
  url: `https://example.com/result-${index + 1}`,
  title: `Result ${index + 1}`,
  offer: `Observed offer ${index + 1}`,
  evidence: `Observed evidence ${index + 1}`,
  gap: `Observed gap ${index + 1}`,
}));
assert.deepEqual(
  validatePageReview({ ...validCompletion, serpEvidenceState: "verified", serpTopFive: completeTopFive }),
  [],
  "verified SERP evidence accepts five fully documented competitor rows",
);

for (const [field, message] of [
  ["indexPolicy", "index policy"],
  ["keywordOwner", "keyword ownership"],
  ["topicCluster", "topic cluster"],
  ["maintenanceOwner", "maintenance owner"],
  ["editorialOwner", "named contributor"],
  ["clusterGaps", "cluster gap"],
  ["primaryIntent", "search intent"],
  ["jobToBeDone", "job to be done"],
  ["firstReviewedAt", "first reviewed date"],
  ["lastReviewedAt", "last reviewed date"],
  ["nextReviewAt", "next review date"],
] as const) {
  const missingValue = field === "indexPolicy" ? "undecided" : field === "keywordOwner" ? "undecided" : field === "primaryIntent" ? "unknown" : "";
  assert.ok(
    validatePageReview({ ...validCompletion, [field]: missingValue }).some((error) =>
      error.toLowerCase().includes(message),
    ),
    `completion identifies missing ${field}`,
  );
}
assert.ok(
  validatePageReview({
    ...validCompletion,
    serpQuery: "a different river report query",
  }).some((message) => message.includes("must match the approved primary query")),
  "completion must inspect the approved primary query",
);
assert.ok(
  validatePageReview({
    ...validCompletion,
    serpCompetitionSummary: "",
  }).some((message) => message.includes("observed SERP competition")),
  "structured SERP competition requires an explanation",
);
assert.ok(
  validatePageReview({ ...validCompletion, eeatGaps: "" }).some((message) =>
    message.includes("E-E-A-T gap or an honest no-gap finding"),
  ),
  "E-E-A-T evidence requires a gap or an honest no-gap finding",
);
assert.ok(
  validatePageReview({ ...validCompletion, decisionProblem: "" }).some((message) =>
    message.includes("decision rationale"),
  ),
  "completion requires a recorded decision rationale",
);
for (const field of ["reviewedAt", "decision", "rationale", "nextAction"] as const) {
  assert.ok(
    validatePageReview({
      ...validCompletion,
      day7: { ...validCompletion.day7, [field]: "" },
    }).some((message) => message.startsWith(`day7.${field}`)),
    `a terminal gate cannot omit ${field}`,
  );
}
for (const field of ["dueAt", "evidence"] as const) {
  assert.ok(
    validatePageReview({
      ...validCompletion,
      day7: { ...validCompletion.day7, [field]: "" },
    }).some((message) => message.startsWith(`day7.${field}`)),
    `a recorded gate cannot omit ${field}`,
  );
}
for (const field of ["serpEvidenceState", "differentiationEvidenceState", "eeatEvidenceState"] as const) {
  assert.ok(
    validatePageReview({ ...validCompletion, [field]: "missing" }).some((message) =>
      message.includes("evidence state"),
    ),
    `completion rejects a missing ${field}`,
  );
}

const emptyEvidenceDraft = {
  ...review,
  serpSnapshotAt: "",
  serpQuery: "",
  serpLocation: "",
  serpDevice: "",
  serpMethod: "",
  serpEvidenceSummary: "",
  serpFeatures: "",
  serpCompetitionSummary: "",
  serpTopFive: review.serpTopFive.map((result) => ({ ...result, url: "", title: "", offer: "", evidence: "", gap: "" })),
};
assert.deepEqual(
  validatePageReview({ ...emptyEvidenceDraft, serpEvidenceState: "not_applicable", serpCompetition: "unclear" }),
  [],
  "not-applicable SERP evidence may remain empty",
);
assert.ok(
  validatePageReview({ ...emptyEvidenceDraft, serpEvidenceState: "partial", serpCompetition: "unclear" }).some(
    (message) => message.includes("snapshot time"),
  ),
  "partial SERP evidence requires the dated snapshot details",
);
assert.ok(
  validatePageReview({ ...emptyEvidenceDraft, serpEvidenceState: "missing", serpCompetition: "high" }).some(
    (message) => message.includes("snapshot time"),
  ),
  "a substantive competition level requires its snapshot evidence",
);
const incompleteOfferEvidence = validatePageReview({
  ...review,
  differentiationEvidenceState: "partial",
  competitorOffer: "",
  currentOffer: "",
  differentiation: "",
});
assert.equal(
  incompleteOfferEvidence.filter((message) => message.includes("offer evidence needs")).length,
  3,
  "partial offer evidence requires the competitor, current, and differentiation details",
);
assert.ok(
  validatePageReview({ ...review, eeatEvidenceState: "partial", eeatDetails: [] }).some((message) =>
    message.includes("at least one complete evidence detail"),
  ),
  "partial E-E-A-T evidence requires structured human-checked proof",
);
assert.deepEqual(
  validatePageReview({
    ...validCompletion,
    indexPolicy: "noindex",
    keywordOwner: "not_applicable",
    primaryQuery: "",
    ownerCanonical: "",
    notApplicableReason:
      "This noindex utility page is not a search-result owner.",
    serpEvidenceState: "not_applicable",
    serpCompetition: "unclear",
    serpSnapshotAt: "",
    serpQuery: "",
    serpLocation: "",
    serpDevice: "",
    serpMethod: "",
    serpEvidenceSummary: "",
    serpFeatures: "",
    serpCompetitionSummary: "",
    serpTopFive: emptyEvidenceDraft.serpTopFive,
    differentiationEvidenceState: "not_applicable",
    competitorOffer: "",
    currentOffer: "",
    differentiation: "",
    eeatEvidenceState: "not_applicable",
    eeatEvidence: "",
    eeatGaps: "",
    eeatDetails: [],
  }),
  [],
  "truthful not-applicable evidence states may complete without invented details",
);
for (const indexPolicy of ["noindex", "redirect", "remove"] as const) {
  assert.ok(
    validatePageReview({ ...validCompletion, indexPolicy }).some((message) =>
      message.includes("cannot remain the primary keyword owner"),
    ),
    `${indexPolicy} pages cannot reserve a THIS_PAGE keyword owner`,
  );
}
for (const [field, expectedPath] of [
  ["serpEvidenceState", "serp.evidenceState"],
  ["differentiationEvidenceState", "offer.differentiationEvidenceState"],
  ["eeatEvidenceState", "eeat.evidenceState"],
] as const) {
  assert.ok(
    validatePageReview({ ...validCompletion, [field]: "not_applicable" }).some((message) =>
      message.includes(`${expectedPath} cannot be not_applicable`),
    ),
    `${field} cannot be not applicable on an indexable keyword-targeted completion`,
  );
}
assert.ok(
  validatePageReview({ ...validCompletion, serpLocation: "" }).some((message) =>
    message.includes("SERP location"),
  ),
);
assert.ok(
  validatePageReview({ ...validCompletion, serpDevice: "" }).some((message) =>
    message.includes("SERP device"),
  ),
);

for (const decisionAction of ["pending", "change_recommended", "blocked"]) {
  assert.ok(
    validatePageReview({ ...validCompletion, decisionAction }).some((message) =>
      message.includes("terminal outcome"),
    ),
    `${decisionAction} cannot be treated as a completed decision`,
  );
}
for (const decisionAction of [
  "no_change",
  "inconclusive",
  "keep",
  "expand",
  "revise",
  "iterate",
  "merge",
  "redirect",
  "noindex",
  "retire",
  "rollback",
]) {
  assert.deepEqual(
    validatePageReview({ ...validCompletion, decisionAction }),
    [],
    `${decisionAction} is a valid terminal decision`,
  );
}
for (const decisionChangeState of ["planned", "in_progress"]) {
  assert.ok(
    validatePageReview({ ...validCompletion, decisionChangeState }).some((message) =>
      message.includes("must not be planned or in progress"),
    ),
    `${decisionChangeState} cannot be complete while implementation remains unfinished`,
  );
}

assert.ok(
  validatePageReview({ ...review, status: "complete", manualChatState: "researching" }).some(
    (message) => message.includes("must both be complete"),
  ),
  "review completion cannot hide an active manual review",
);
assert.ok(
  validatePageReview({
    ...validCompletion,
    status: "monitoring",
    manualChatState: "complete",
  }).some((message) => message.includes("must both be complete")),
  "manual completion cannot contradict the review status",
);

const patch = pageReviewPatchInput(review);
assert.equal(patch.expectedVersion, 3, "PATCH protects against stale manual edits");
assert.equal(patch.reviewStatus, "researching");
assert.equal(patch.keyword.status, "this_page");
assert.equal(patch.keyword.primaryQuery, "lochsa river fishing report");
assert.equal(patch.keywordPlanner.averageMonthlySearches, 10);
assert.equal(patch.keywordPlanner.paidAdvertiserCompetition, "low");
assert.deepEqual(patch.googleTrends.comparisonQueries, ["lochsa fishing report"]);
assert.equal(patch.measurementPlan.evidenceState, "partial");
assert.equal(patch.measurementPlan.baselineCanonical, review.canonicalUrl);
assert.equal(patch.measurementPlan.gsc.clicks, 8);
assert.equal(patch.measurementPlan.gsc.ctr, 0.0364);
assert.equal(patch.measurementPlan.ga4.screenPageViews, 14);
assert.equal(patch.measurementPlan.primaryKpi.metric, "clicks");
assert.equal(patch.measurementPlan.primaryKpi.evaluationWindowDays, 28);
assert.equal(patch.measurementPlan.conversionGoal.eventName, "official_source_click");
assert.equal(patch.measurementPlan.comparisonWindows[0]?.metrics.ctr, 0.1381);
assert.deepEqual(patch.measurementPlan.guardrails, [
  "GSC CTR must not decline materially while clicks rise.",
  "Official source accuracy and canonical indexability must remain intact.",
]);
assert.equal(patch.topic.editorialOwner, "BlueStreamFly river review team");
assert.deepEqual(patch.serp.features, ["AI Overview", "People Also Ask"]);
assert.equal(patch.serp.evidenceState, "partial");
assert.equal(patch.serp.competition, "medium");
assert.equal(patch.serp.results.length, 1, "blank editor rows do not enter the API payload");
assert.deepEqual(patch.topic.clusterGaps, ["Current local observation evidence"]);
assert.deepEqual(patch.eeat.evidence, ["Direct official sources"]);
assert.equal(patch.eeat.evidenceState, "verified");
assert.equal(patch.eeat.details.length, 1);
assert.equal(patch.eeat.details[0]?.checkedAt, "2026-08-13T21:04:00.000Z");
assert.equal(
  patch.eeat.details[0]?.limitation,
  "The source does not describe current on-river conditions.",
);
assert.equal(patch.gates.day7.status, "not_due");
assert.equal(patch.manualChatState, "researching");
assert.equal("pageId" in patch, false, "seed identity is not editable through the workboard PATCH");
assert.equal("canonicalUrl" in patch, false, "canonical identity is not editable through the workboard PATCH");
assert.deepEqual(
  splitReviewLines("Direct sources, named dates, and limits\nNo first-hand field note"),
  ["Direct sources, named dates, and limits", "No first-hand field note"],
  "prose evidence keeps commas inside a single list item",
);

const notApplicable = {
  ...review,
  keywordOwner: "not_applicable",
  primaryQuery: "",
  ownerCanonical: "",
  notApplicableReason: "Intentional legal page",
};
assert.deepEqual(validatePageReview(notApplicable), []);
assert.equal(pageReviewPatchInput(notApplicable).keyword.primaryQuery, null);

const invalidOtherOwner = {
  ...review,
  keywordOwner: "another_canonical",
  ownerCanonical: review.canonicalUrl,
};
assert.ok(
  validatePageReview(invalidOtherOwner).some((message) => message.includes("must differ")),
  "another-canonical ownership cannot point back to the same record",
);

const incompleteEeatEvidence = {
  ...review,
  eeatDetails: [
    {
      evidence: "A named official source is linked.",
      source: "",
      checkedAt: "",
      reviewer: "",
      limitation: "",
    },
  ],
};
assert.ok(
  validatePageReview(incompleteEeatEvidence).length >= 4,
  "partially entered E-E-A-T proof cannot be saved as complete evidence",
);

const workboardSource = readFileSync(
  new URL("../components/sites/page-reviews-workboard.tsx", import.meta.url),
  "utf8",
);
assert.match(workboardSource, /Manual only/);
assert.match(workboardSource, /page-reviews\?limit=1000&offset=0/);
assert.match(workboardSource, /page-reviews\/\$\{selectedId\}/);
assert.match(workboardSource, /beforeunload/, "dirty manual reviews warn before page exit");
assert.match(workboardSource, /sessionStorage\.setItem/);
assert.match(workboardSource, /sessionStorage\.removeItem/);
assert.match(workboardSource, /Draft recovery is best effort/);
assert.match(workboardSource, /Recovered unsaved changes from this browser/);
assert.match(workboardSource, /An older unsaved draft is still available/);
assert.match(workboardSource, /Restore for comparison/);
assert.match(workboardSource, /Discard older draft/);
assert.match(workboardSource, /recovery\?\.status === "invalid"\) clearSessionDraft/);
assert.match(workboardSource, /status: "monitoring", manualChatState: "monitoring"/);
assert.match(workboardSource, /popstate/);
assert.match(workboardSource, /Structured evidence details/);
assert.match(workboardSource, /label="SERP evidence state"/);
assert.match(workboardSource, /label="SERP competition level"/);
assert.match(workboardSource, /label="E-E-A-T evidence state"/);
assert.match(workboardSource, /Google demand checks/);
assert.match(workboardSource, /River-report rule:/);
assert.match(workboardSource, /target every current river report/);
assert.match(workboardSource, /shared structure, decision logic, safety presentation, source UX/);
assert.match(workboardSource, /River facts, rules, access, sources, hatch\/tactic content/);
assert.match(workboardSource, /label="Affected page family"/);
assert.match(workboardSource, /label="Affected canonical count"/);
assert.match(workboardSource, /label="Blast-radius details"/);
assert.match(workboardSource, /"shared_template", "mixed"/);
assert.match(workboardSource, /Google Keyword Planner/);
assert.match(workboardSource, /Check Planner now/);
assert.match(workboardSource, /method: "POST"/);
assert.match(workboardSource, /It did not choose ownership, approve, save, or publish anything/);
assert.match(workboardSource, /Open Google Trends/);
assert.match(workboardSource, /paid advertisers, not organic results/);
assert.match(workboardSource, /relative interest, not search volume/);
assert.match(workboardSource, /Nothing will be filled in automatically/);
assert.match(workboardSource, /Full canonical URL; leave blank when not applicable/);
assert.match(workboardSource, /Draft saved\. No content was scheduled or published\./);
assert.match(workboardSource, /Approved review saved\. No content was scheduled or published\./);
assert.match(workboardSource, /Review \/ chat/);
assert.match(workboardSource, /ManualStateChip value=\{review\.manualChatState\}/);
assert.match(workboardSource, /Active · /);
assert.match(workboardSource, /label="Page ID"[^\n]+readOnly/);
assert.match(workboardSource, /label="Canonical URL"[^\n]+readOnly copyable/);
assert.doesNotMatch(workboardSource, />Publish</, "workboard must not expose a publish action");
assert.doesNotMatch(workboardSource, />Schedule</, "workboard must not expose a schedule action");

console.log("Page review workboard tests passed.");
