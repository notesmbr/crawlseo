export const PAGE_REVIEW_STATUSES = [
  "unreviewed",
  "queued",
  "researching",
  "ready_no_change",
  "ready_to_change",
  "monitoring",
  "complete",
  "blocked",
] as const;

export const PAGE_REVIEW_PRIORITIES = ["none", "p0", "p1", "p2", "p3", "p4"] as const;

export const PERFORMANCE_STATE_OPTIONS = [
  "unassessed",
  "critical_defect",
  "no_or_near_zero_visibility",
  "impressions_without_result",
  "early_opportunity",
  "demonstrated_winner",
  "insufficient_observation",
] as const;

export const CHANGE_SCOPE_OPTIONS = [
  "undecided",
  "focused",
  "comprehensive",
  "not_applicable",
] as const;

export const CHANGE_BLAST_RADIUS_OPTIONS = [
  "undecided",
  "page_local",
  "shared_template",
  "mixed",
  "global_navigation",
  "source_sensitive",
  "not_applicable",
] as const;

export const EXPERIMENT_STATE_OPTIONS = [
  "unchecked",
  "none",
  "frozen",
  "approved_contamination",
] as const;

export const PAGE_FAMILIES = [
  "home",
  "report_directory",
  "state_report_hub",
  "river_report",
  "article_directory",
  "article",
  "fly_directory",
  "fly_family_guide",
  "fly_pattern_guide",
  "weekly_conditions_hub",
  "widget_landing_page",
  "trust_company",
  "trust_methodology",
  "legal",
  "support",
  "utility",
  "other",
] as const;

export const INDEX_POLICIES = [
  "index",
  "noindex",
  "redirect",
  "remove",
  "undecided",
] as const;

export const KEYWORD_OWNERSHIP_OPTIONS = [
  "this_page",
  "another_canonical",
  "undecided",
  "not_applicable",
] as const;

export const INTENT_OPTIONS = [
  "unknown",
  "informational",
  "local_trip_planning",
  "commercial_investigation",
  "transactional",
  "navigational",
  "safety_or_rules",
  "mixed",
  "not_applicable",
] as const;

export const SERP_DEVICE_OPTIONS = ["desktop", "mobile"] as const;
export const SERP_METHOD_OPTIONS = ["manual_google", "manual_other"] as const;
export const SERP_COMPETITION_OPTIONS = ["low", "medium", "high", "unclear"] as const;
export const DECISION_STATE_OPTIONS = [
  "pending",
  "no_change",
  "change_recommended",
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
  "blocked",
] as const;
export const CHANGE_STATE_OPTIONS = [
  "not_planned",
  "planned",
  "in_progress",
  "shipped",
  "verified",
  "reverted",
] as const;
export const EVIDENCE_STATE_OPTIONS = [
  "verified",
  "partial",
  "missing",
  "not_applicable",
] as const;
export const KEYWORD_PLANNER_METHOD_OPTIONS = [
  "google_ads_api",
  "manual_google_ads_ui",
] as const;
export const KEYWORD_PLANNER_NETWORK_OPTIONS = [
  "google_search",
  "google_search_and_partners",
] as const;
export const PAID_ADVERTISER_COMPETITION_OPTIONS = [
  "low",
  "medium",
  "high",
  "unknown",
] as const;
export const GOOGLE_TRENDS_METHOD_OPTIONS = [
  "manual_google_trends",
  "google_trends_api_alpha",
] as const;
export const GOOGLE_TRENDS_DIRECTION_OPTIONS = [
  "rising",
  "stable",
  "falling",
  "seasonal",
  "insufficient_data",
] as const;
export const GSC_BASELINE_METHOD_OPTIONS = [
  "crawlseo_gsc_import",
  "manual_search_console",
] as const;
export const GA4_BASELINE_METHOD_OPTIONS = [
  "ga4_data_api",
  "manual_ga4_report",
] as const;
export const MEASUREMENT_KPI_SOURCE_OPTIONS = ["gsc", "ga4"] as const;
export const GSC_KPI_METRIC_OPTIONS = [
  "clicks",
  "impressions",
  "ctr",
  "position",
] as const;
export const GA4_KPI_METRIC_OPTIONS = [
  "screenPageViews",
  "sessions",
  "engagedSessions",
  "activeUsers",
  "keyEvents",
] as const;
export const MEASUREMENT_KPI_DIRECTION_OPTIONS = [
  "increase",
  "decrease",
  "maintain",
] as const;
export const DIFFERENTIATION_EVIDENCE_OPTIONS = EVIDENCE_STATE_OPTIONS;
export const MANUAL_CHAT_STATE_OPTIONS = [
  "awaiting_user_selection",
  "researching",
  "awaiting_user_decision",
  "approved_to_record",
  "approved_to_implement",
  "monitoring",
  "complete",
] as const;
export const GATE_STATUS_OPTIONS = [
  "not_due",
  "due",
  "recorded",
  "missed",
  "not_applicable",
] as const;

export type PageReviewStatus = (typeof PAGE_REVIEW_STATUSES)[number];
export type PageReviewPriority = (typeof PAGE_REVIEW_PRIORITIES)[number];

const APPROVED_MANUAL_STATES = new Set([
  "approved_to_record",
  "approved_to_implement",
  "monitoring",
  "complete",
]);
const ACTIVE_MANUAL_STATES = new Set([
  "researching",
  "awaiting_user_decision",
  "approved_to_record",
  "approved_to_implement",
]);
const IMPLEMENTATION_MANUAL_STATES = new Set(["approved_to_implement", "complete"]);
const PLANNING_CHANGE_STATES = new Set(["planned", "in_progress"]);
const DELIVERED_CHANGE_STATES = new Set(["shipped", "verified", "reverted"]);
const POST_IMPLEMENTATION_MANUAL_STATES = new Set([
  "approved_to_implement",
  "monitoring",
  "complete",
]);
const TERMINAL_GATE_STATUSES = new Set(["recorded", "missed", "not_applicable"]);
const TERMINAL_DECISION_STATES = new Set([
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
]);
const IMPLEMENTATION_DECISION_STATES = new Set([
  "change_recommended",
  "expand",
  "revise",
  "iterate",
  "merge",
  "redirect",
  "noindex",
  "retire",
  "rollback",
]);
const MONITORING_NO_CHANGE_DECISIONS = new Set([
  "no_change",
  "keep",
  "inconclusive",
]);

function normalizedReviewQuery(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export type PageReviewSummary = {
  id: string;
  siteId: string;
  pageId: string;
  canonicalUrl: string;
  pageFamily: string;
  indexPolicy: string;
  reviewStatus: string;
  priority: string;
  topicCluster: string;
  maintenanceOwner: string;
  editorialOwner: string;
  manualChatState: string;
  keywordStatus: string;
  primaryQuery: string;
  keywordOwnerCanonical: string;
  firstReviewedAt: string;
  lastReviewedAt: string;
  nextReviewAt: string;
  version: number;
  updatedAt: string;
};

export type SerpCompetitor = {
  position: number;
  url: string;
  title: string;
  offer: string;
  evidence: string;
  gap: string;
};

export type ReviewGate = {
  status: string;
  dueAt: string;
  reviewedAt: string;
  evidence: string;
  decision: string;
  rationale: string;
  nextAction: string;
};

export type EeatEvidenceDetail = {
  evidence: string;
  source: string;
  checkedAt: string;
  reviewer: string;
  limitation: string;
};

export type KeywordPlannerMonthlySearch = {
  year: number;
  month: number;
  searches: number;
};

export type KeywordPlannerEvidence = {
  evidenceState: string;
  query: string;
  checkedAt: string;
  method: string;
  sourceUrl: string;
  geoTarget: string;
  language: string;
  network: string;
  averageMonthlySearches: string;
  monthlySearches: KeywordPlannerMonthlySearch[];
  paidAdvertiserCompetition: string;
  paidAdvertiserCompetitionIndex: string;
  lowTopOfPageBidMicros: string;
  highTopOfPageBidMicros: string;
  limitation: string;
  notApplicableReason: string;
};

export type GoogleTrendsEvidence = {
  evidenceState: string;
  query: string;
  checkedAt: string;
  method: string;
  sourceUrl: string;
  geo: string;
  timeframe: string;
  comparisonQueries: string;
  direction: string;
  finding: string;
  limitation: string;
  notApplicableReason: string;
};

export type GscBaselineEvidence = {
  evidenceState: string;
  checkedAt: string;
  method: string;
  sourceUrl: string;
  clicks: string;
  impressions: string;
  ctr: string;
  position: string;
  limitation: string;
  notApplicableReason: string;
};

export type Ga4BaselineEvidence = {
  evidenceState: string;
  checkedAt: string;
  method: string;
  sourceUrl: string;
  screenPageViews: string;
  sessions: string;
  engagedSessions: string;
  activeUsers: string;
  keyEvents: string;
  limitation: string;
  notApplicableReason: string;
};

export type MeasurementPlanEvidence = {
  evidenceState: string;
  baselineCanonical: string;
  baselineAsOf: string;
  windowStart: string;
  windowEnd: string;
  gsc: GscBaselineEvidence;
  ga4: Ga4BaselineEvidence;
  hypothesis: string;
  primaryKpiSource: string;
  primaryKpiMetric: string;
  primaryKpiDirection: string;
  evaluationWindowDays: string;
  successCriteria: string;
  conversionEventName: string;
  conversionDescription: string;
  conversionNotApplicableReason: string;
  comparisonWindows: MeasurementComparisonWindow[];
  guardrails: string;
  limitation: string;
  notApplicableReason: string;
};

export type MeasurementComparisonWindow = {
  label: string;
  windowStart: string;
  windowEnd: string;
  clicks: string;
  impressions: string;
  ctr: string;
  position: string;
  screenPageViews: string;
  sessions: string;
  engagedSessions: string;
  activeUsers: string;
  keyEvents: string;
  limitation: string;
};

export type PageReviewRecord = {
  id: string;
  siteId: string;
  pageId: string;
  canonicalUrl: string;
  pageFamily: string;
  indexPolicy: string;
  status: PageReviewStatus | string;
  priority: PageReviewPriority | string;
  keywordOwner: string;
  ownerCanonical: string;
  primaryQuery: string;
  secondaryQueries: string;
  notApplicableReason: string;
  keywordPlanner: KeywordPlannerEvidence;
  googleTrends: GoogleTrendsEvidence;
  measurementPlan: MeasurementPlanEvidence;
  topicCluster: string;
  parentPage: string;
  clusterGaps: string;
  maintenanceOwner: string;
  editorialOwner: string;
  primaryIntent: string;
  jobToBeDone: string;
  serpSnapshotAt: string;
  serpQuery: string;
  serpLocation: string;
  serpDevice: string;
  serpMethod: string;
  serpEvidenceSummary: string;
  serpEvidenceState: string;
  serpFeatures: string;
  serpCompetition: string;
  serpCompetitionSummary: string;
  serpTopFive: SerpCompetitor[];
  competitorOffer: string;
  currentOffer: string;
  differentiation: string;
  differentiationEvidenceState: string;
  eeatEvidence: string;
  eeatGaps: string;
  eeatEvidenceState: string;
  eeatDetails: EeatEvidenceDetail[];
  decisionAction: string;
  decisionProblem: string;
  proposedChange: string;
  performanceState: string;
  changeScope: string;
  scopeRationale: string;
  demonstratedWins: string;
  preservedElements: string;
  intentionallyChangedElements: string;
  changeBlastRadius: string;
  affectedPageFamily: string;
  affectedCanonicalCount: string;
  blastRadiusNote: string;
  experimentState: string;
  experimentId: string;
  experimentFrozenUntil: string;
  experimentExceptionReason: string;
  rollbackTrigger: string;
  decisionChangeState: string;
  changeId: string;
  decisionChangedAt: string;
  day7: ReviewGate;
  day28: ReviewGate;
  day56: ReviewGate;
  manualNotes: string;
  firstReviewedAt: string;
  lastReviewedAt: string;
  nextReviewAt: string;
  manualChatState: string;
  userDecisionReference: string;
  version: number;
  updatedAt: string;
};

export type PageReviewFilters = {
  query: string;
  status: string;
  family: string;
  priority: string;
  cluster: string;
};

export type StoredPageReviewDraft = {
  baseVersion: number;
  draft: PageReviewRecord;
};

export type PageReviewDraftRecovery =
  | { status: "current"; baseVersion: number; draft: PageReviewRecord }
  | { status: "stale"; baseVersion: number; draft: PageReviewRecord }
  | { status: "invalid" };

export function pageReviewDraftStorageKey(siteId: string, reviewId: string): string {
  return `crawlseo:page-review-draft:${siteId}:${reviewId}`;
}

export function serializePageReviewDraft(review: PageReviewRecord): string {
  return JSON.stringify({ baseVersion: review.version, draft: review } satisfies StoredPageReviewDraft);
}

export function inspectPageReviewDraft(
  storedValue: string,
  baseReview: PageReviewRecord,
): PageReviewDraftRecovery {
  try {
    const stored = JSON.parse(storedValue) as Partial<StoredPageReviewDraft>;
    const draft = stored.draft;
    if (
      typeof stored.baseVersion !== "number" ||
      !draft ||
      draft.id !== baseReview.id ||
      draft.siteId !== baseReview.siteId ||
      !Array.isArray(draft.serpTopFive) ||
      !Array.isArray(draft.eeatDetails) ||
      !draft.day7 ||
      !draft.day28 ||
      !draft.day56
    ) {
      return { status: "invalid" };
    }

    const legacyDraft = draft as PageReviewRecord & { smallestChange?: unknown };
    const draftMeasurement = object(draft.measurementPlan);
    const safeDraft = {
      ...baseReview,
      ...draft,
      measurementPlan: {
        ...baseReview.measurementPlan,
        ...draftMeasurement,
        gsc: {
          ...baseReview.measurementPlan.gsc,
          ...object(draftMeasurement.gsc),
        },
        ga4: {
          ...baseReview.measurementPlan.ga4,
          ...object(draftMeasurement.ga4),
        },
        comparisonWindows: Array.isArray(draftMeasurement.comparisonWindows)
          ? draftMeasurement.comparisonWindows
          : baseReview.measurementPlan.comparisonWindows,
      } as MeasurementPlanEvidence,
      proposedChange:
        typeof draft.proposedChange === "string"
          ? draft.proposedChange
          : typeof legacyDraft.smallestChange === "string"
            ? legacyDraft.smallestChange
            : baseReview.proposedChange,
      id: baseReview.id,
      siteId: baseReview.siteId,
      pageId: baseReview.pageId,
      canonicalUrl: baseReview.canonicalUrl,
      version: baseReview.version,
      updatedAt: baseReview.updatedAt,
    };
    return {
      status: stored.baseVersion === baseReview.version ? "current" : "stale",
      baseVersion: stored.baseVersion,
      draft: safeDraft,
    };
  } catch {
    return { status: "invalid" };
  }
}

export function shouldConfirmRouteNavigation(currentHref: string, targetHref: string): boolean {
  try {
    const current = new URL(currentHref);
    const target = new URL(targetHref, current);
    if (current.origin !== target.origin) return false;
    return current.pathname !== target.pathname || current.search !== target.search;
  } catch {
    return false;
  }
}

export function emptySerpTopFive(): SerpCompetitor[] {
  return Array.from({ length: 5 }, (_, index) => ({
    position: index + 1,
    url: "",
    title: "",
    offer: "",
    evidence: "",
    gap: "",
  }));
}

export function emptyEeatEvidenceDetail(): EeatEvidenceDetail {
  return {
    evidence: "",
    source: "",
    checkedAt: "",
    reviewer: "",
    limitation: "",
  };
}

export function emptyMeasurementComparisonWindow(): MeasurementComparisonWindow {
  return {
    label: "",
    windowStart: "",
    windowEnd: "",
    clicks: "",
    impressions: "",
    ctr: "",
    position: "",
    screenPageViews: "",
    sessions: "",
    engagedSessions: "",
    activeUsers: "",
    keyEvents: "",
    limitation: "",
  };
}

function normalizeGate(value: unknown): ReviewGate {
  if (!value || typeof value !== "object") {
    return {
      status: "not_due",
      dueAt: "",
      reviewedAt: "",
      evidence: "",
      decision: "",
      rationale: "",
      nextAction: "",
    };
  }

  const gate = value as Record<string, unknown>;
  return {
    status: typeof gate.status === "string" ? gate.status : "not_due",
    dueAt: typeof gate.dueAt === "string" ? gate.dueAt : "",
    reviewedAt: typeof gate.reviewedAt === "string" ? gate.reviewedAt : "",
    evidence: text(gate.evidence),
    decision: text(gate.decision),
    rationale: text(gate.rationale),
    nextAction: text(gate.nextAction),
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberText(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "";
}

function normalizeKeywordPlanner(value: unknown): KeywordPlannerEvidence {
  const evidence = object(value);
  const monthlySearches = Array.isArray(evidence.monthlySearches)
    ? evidence.monthlySearches.flatMap((entry) => {
        const month = object(entry);
        return typeof month.year === "number" &&
          typeof month.month === "number" &&
          typeof month.searches === "number"
          ? [{ year: month.year, month: month.month, searches: month.searches }]
          : [];
      })
    : [];
  return {
    evidenceState: text(evidence.evidenceState) || "missing",
    query: text(evidence.query),
    checkedAt: text(evidence.checkedAt),
    method: text(evidence.method),
    sourceUrl: text(evidence.sourceUrl),
    geoTarget: text(evidence.geoTarget),
    language: text(evidence.language),
    network: text(evidence.network),
    averageMonthlySearches: numberText(evidence.averageMonthlySearches),
    monthlySearches,
    paidAdvertiserCompetition: text(evidence.paidAdvertiserCompetition),
    paidAdvertiserCompetitionIndex: numberText(evidence.paidAdvertiserCompetitionIndex),
    lowTopOfPageBidMicros: numberText(evidence.lowTopOfPageBidMicros),
    highTopOfPageBidMicros: numberText(evidence.highTopOfPageBidMicros),
    limitation: text(evidence.limitation),
    notApplicableReason: text(evidence.notApplicableReason),
  };
}

function normalizeGoogleTrends(value: unknown): GoogleTrendsEvidence {
  const evidence = object(value);
  return {
    evidenceState: text(evidence.evidenceState) || "missing",
    query: text(evidence.query),
    checkedAt: text(evidence.checkedAt),
    method: text(evidence.method),
    sourceUrl: text(evidence.sourceUrl),
    geo: text(evidence.geo),
    timeframe: text(evidence.timeframe),
    comparisonQueries: stringList(evidence.comparisonQueries).join("\n"),
    direction: text(evidence.direction),
    finding: text(evidence.finding),
    limitation: text(evidence.limitation),
    notApplicableReason: text(evidence.notApplicableReason),
  };
}

function normalizeMeasurementPlan(value: unknown): MeasurementPlanEvidence {
  const plan = object(value);
  const gsc = object(plan.gsc);
  const ga4 = object(plan.ga4);
  const primaryKpi = object(plan.primaryKpi);
  const conversionGoal = object(plan.conversionGoal);
  return {
    evidenceState: text(plan.evidenceState) || "missing",
    baselineCanonical: text(plan.baselineCanonical),
    baselineAsOf: text(plan.baselineAsOf),
    windowStart: text(plan.windowStart),
    windowEnd: text(plan.windowEnd),
    gsc: {
      evidenceState: text(gsc.evidenceState) || "missing",
      checkedAt: text(gsc.checkedAt),
      method: text(gsc.method),
      sourceUrl: text(gsc.sourceUrl),
      clicks: numberText(gsc.clicks),
      impressions: numberText(gsc.impressions),
      ctr: numberText(gsc.ctr),
      position: numberText(gsc.position),
      limitation: text(gsc.limitation),
      notApplicableReason: text(gsc.notApplicableReason),
    },
    ga4: {
      evidenceState: text(ga4.evidenceState) || "missing",
      checkedAt: text(ga4.checkedAt),
      method: text(ga4.method),
      sourceUrl: text(ga4.sourceUrl),
      screenPageViews: numberText(ga4.screenPageViews),
      sessions: numberText(ga4.sessions),
      engagedSessions: numberText(ga4.engagedSessions),
      activeUsers: numberText(ga4.activeUsers),
      keyEvents: numberText(ga4.keyEvents),
      limitation: text(ga4.limitation),
      notApplicableReason: text(ga4.notApplicableReason),
    },
    hypothesis: text(plan.hypothesis),
    primaryKpiSource: text(primaryKpi.source),
    primaryKpiMetric: text(primaryKpi.metric),
    primaryKpiDirection: text(primaryKpi.direction),
    evaluationWindowDays: numberText(primaryKpi.evaluationWindowDays),
    successCriteria: text(primaryKpi.successCriteria),
    conversionEventName: text(conversionGoal.eventName),
    conversionDescription: text(conversionGoal.description),
    conversionNotApplicableReason: text(conversionGoal.notApplicableReason),
    comparisonWindows: Array.isArray(plan.comparisonWindows)
      ? plan.comparisonWindows.map((entry) => {
          const window = object(entry);
          const metrics = object(window.metrics);
          return {
            label: text(window.label),
            windowStart: text(window.windowStart),
            windowEnd: text(window.windowEnd),
            clicks: numberText(metrics.clicks),
            impressions: numberText(metrics.impressions),
            ctr: numberText(metrics.ctr),
            position: numberText(metrics.position),
            screenPageViews: numberText(metrics.screenPageViews),
            sessions: numberText(metrics.sessions),
            engagedSessions: numberText(metrics.engagedSessions),
            activeUsers: numberText(metrics.activeUsers),
            keyEvents: numberText(metrics.keyEvents),
            limitation: text(window.limitation),
          };
        })
      : [],
    guardrails: stringList(plan.guardrails).join("\n"),
    limitation: text(plan.limitation),
    notApplicableReason: text(plan.notApplicableReason),
  };
}

export function normalizePageReview(value: unknown): PageReviewRecord {
  const review = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const pageFamily = text(review.pageFamily) || "other";
  const keyword = object(review.keyword);
  const topic = object(review.topic);
  const intent = object(review.intent);
  const serp = object(review.serp);
  const offer = object(review.offer);
  const eeat = object(review.eeat);
  const decision = object(review.decision);
  const gates = object(review.gates);
  const manualReview = object(review.manualReview);
  const eeatDetails = Array.isArray(eeat.details)
    ? eeat.details.map((entry) => {
        const detail = object(entry);
        return {
          evidence: text(detail.evidence),
          source: text(detail.source),
          checkedAt: text(detail.checkedAt),
          reviewer: text(detail.reviewer),
          limitation: text(detail.limitation),
        };
      })
    : [];
  const recordedResults = Array.isArray(serp.results)
    ? serp.results.map((entry, index) => {
        const competitor = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
        return {
          position: typeof competitor.position === "number" ? competitor.position : index + 1,
          url: text(competitor.url),
          title: text(competitor.title),
          offer: text(competitor.offer),
          evidence: text(competitor.evidence),
          gap: text(competitor.gap),
        };
      })
    : [];
  const topFive = emptySerpTopFive().map(
    (slot) => recordedResults.find((result) => result.position === slot.position) ?? slot,
  );

  return {
    id: text(review.id),
    siteId: text(review.siteId),
    pageId: text(review.pageId),
    canonicalUrl: text(review.canonicalUrl),
    pageFamily,
    indexPolicy: text(review.indexPolicy) || "undecided",
    status: text(review.reviewStatus) || "unreviewed",
    priority: text(review.priority) || "none",
    keywordOwner: text(keyword.status) || "undecided",
    ownerCanonical: text(keyword.ownerCanonical),
    primaryQuery: text(keyword.primaryQuery),
    secondaryQueries: stringList(keyword.secondaryQueries).join("\n"),
    notApplicableReason: text(keyword.notApplicableReason),
    keywordPlanner: normalizeKeywordPlanner(review.keywordPlanner),
    googleTrends: normalizeGoogleTrends(review.googleTrends),
    measurementPlan: normalizeMeasurementPlan(review.measurementPlan),
    topicCluster: text(topic.cluster),
    parentPage: text(topic.parentPage),
    clusterGaps: stringList(topic.clusterGaps).join("\n") || text(topic.clusterGaps),
    maintenanceOwner: text(topic.maintenanceOwner),
    editorialOwner:
      text(topic.editorialOwner) ||
      (pageFamily === "river_report" ? "BlueStreamFly River Review Team" : ""),
    primaryIntent: text(intent.searchIntent) || "unknown",
    jobToBeDone: text(intent.jobToBeDone),
    serpSnapshotAt: text(serp.snapshotAt),
    serpQuery: text(serp.query),
    serpLocation: text(serp.locale),
    serpDevice: text(serp.device),
    serpMethod: text(serp.method),
    serpEvidenceSummary: text(serp.evidenceSummary),
    serpEvidenceState: text(serp.evidenceState) || "missing",
    serpFeatures: stringList(serp.features).join("\n"),
    serpCompetition: text(serp.competition) || "unclear",
    serpCompetitionSummary: text(serp.competitionSummary),
    serpTopFive: topFive,
    competitorOffer: text(offer.competitorOffer),
    currentOffer: text(offer.currentOffer),
    differentiation: text(offer.differentiation),
    differentiationEvidenceState: text(offer.differentiationEvidenceState) || "missing",
    eeatEvidence: stringList(eeat.evidence).join("\n") || text(eeat.evidence),
    eeatGaps: stringList(eeat.gaps).join("\n") || text(eeat.gaps),
    eeatEvidenceState: text(eeat.evidenceState) || "missing",
    eeatDetails,
    decisionAction: text(decision.state) || "pending",
    decisionProblem: text(decision.rationale),
    proposedChange: text(decision.proposedChange),
    performanceState: text(decision.performanceState) || "unassessed",
    changeScope: text(decision.scopeClass) || "undecided",
    scopeRationale: text(decision.scopeRationale),
    demonstratedWins: stringList(decision.demonstratedWins).join("\n"),
    preservedElements: stringList(decision.preservedElements).join("\n"),
    intentionallyChangedElements: stringList(
      decision.intentionallyChangedElements,
    ).join("\n"),
    changeBlastRadius: text(decision.blastRadius) || "undecided",
    affectedPageFamily: text(decision.affectedPageFamily),
    affectedCanonicalCount: numberText(decision.affectedCanonicalCount),
    blastRadiusNote: text(decision.blastRadiusNote),
    experimentState: text(decision.experimentState) || "unchecked",
    experimentId: text(decision.experimentId),
    experimentFrozenUntil: text(decision.experimentFrozenUntil),
    experimentExceptionReason: text(decision.experimentExceptionReason),
    rollbackTrigger: text(decision.rollbackTrigger),
    decisionChangeState: text(decision.changeState) || "not_planned",
    changeId: text(decision.changeId),
    decisionChangedAt: text(decision.changedAt),
    day7: normalizeGate(gates.day7),
    day28: normalizeGate(gates.day28),
    day56: normalizeGate(gates.day56),
    manualNotes: text(manualReview.notes),
    firstReviewedAt: text(manualReview.firstReviewedAt),
    lastReviewedAt: text(manualReview.lastReviewedAt),
    nextReviewAt: text(manualReview.nextReviewAt),
    manualChatState: text(review.manualChatState) || "awaiting_user_selection",
    userDecisionReference: text(review.userDecisionReference),
    version: typeof review.version === "number" ? review.version : 0,
    updatedAt: text(review.updatedAt),
  };
}

export function normalizePageReviewSummary(value: unknown): PageReviewSummary {
  const review = object(value);
  const keyword = object(review.keyword);
  const topic = object(review.topic);
  const manualReview = object(review.manualReview);
  return {
    id: text(review.id),
    siteId: text(review.siteId),
    pageId: text(review.pageId),
    canonicalUrl: text(review.canonicalUrl),
    pageFamily: text(review.pageFamily) || "other",
    indexPolicy: text(review.indexPolicy) || "undecided",
    reviewStatus: text(review.reviewStatus) || "unreviewed",
    priority: text(review.priority) || "none",
    topicCluster: text(review.topicCluster) || text(topic.cluster),
    maintenanceOwner: text(review.maintenanceOwner) || text(topic.maintenanceOwner),
    editorialOwner: text(review.editorialOwner) || text(topic.editorialOwner),
    manualChatState: text(review.manualChatState) || "awaiting_user_selection",
    keywordStatus: text(review.keywordStatus) || text(keyword.status) || "undecided",
    primaryQuery: text(review.primaryQuery) || text(keyword.primaryQuery),
    keywordOwnerCanonical: text(review.keywordOwnerCanonical) || text(keyword.ownerCanonical),
    firstReviewedAt: text(review.firstReviewedAt) || text(manualReview.firstReviewedAt),
    lastReviewedAt: text(review.lastReviewedAt) || text(manualReview.lastReviewedAt),
    nextReviewAt: text(review.nextReviewAt) || text(manualReview.nextReviewAt),
    version: typeof review.version === "number" ? review.version : 0,
    updatedAt: text(review.updatedAt),
  };
}

export function matchesPageReviewFilters(
  review: PageReviewSummary,
  filters: PageReviewFilters,
): boolean {
  const needle = filters.query.trim().toLowerCase();
  const searchable = [
    review.pageId,
    review.canonicalUrl,
    review.primaryQuery,
    review.topicCluster,
    review.maintenanceOwner,
  ]
    .join(" ")
    .toLowerCase();

  return (
    (!needle || searchable.includes(needle)) &&
    (!filters.status || review.reviewStatus === filters.status) &&
    (!filters.family || review.pageFamily === filters.family) &&
    (!filters.priority || review.priority === filters.priority) &&
    (!filters.cluster || review.topicCluster === filters.cluster)
  );
}

export function validatePageReview(review: PageReviewRecord): string[] {
  const errors: string[] = [];
  if (!review.pageId.trim()) errors.push("Page ID is required.");
  if (!isValidUrl(review.canonicalUrl, true)) errors.push("Canonical URL must be a valid https:// URL.");
  if (review.parentPage.trim() && !isSameSiteUrl(review.parentPage, review.canonicalUrl)) {
    errors.push("Parent page must be a full same-site HTTPS URL or blank.");
  }
  if ((review.status === "complete") !== (review.manualChatState === "complete")) {
    errors.push(
      "Review status and manual collaboration state must both be complete or both remain non-complete.",
    );
  }
  if ((review.status === "monitoring") !== (review.manualChatState === "monitoring")) {
    errors.push(
      "Review status and manual collaboration state must both be monitoring or both remain non-monitoring.",
    );
  }
  if (review.keywordOwner === "this_page" && !review.primaryQuery.trim()) {
    errors.push("A page-owned keyword needs a primary query.");
  }
  if (review.keywordOwner === "another_canonical") {
    if (!review.primaryQuery.trim()) errors.push("Another-canonical ownership needs a primary query.");
    if (!review.ownerCanonical.trim()) errors.push("Another-canonical ownership needs its owner URL.");
    if (review.ownerCanonical.trim() === review.canonicalUrl.trim()) {
      errors.push("The other keyword owner must differ from this page.");
    }
    if (review.ownerCanonical.trim() && !isSameSiteUrl(review.ownerCanonical, review.canonicalUrl)) {
      errors.push("The other keyword owner must be a valid canonical on this site.");
    }
  }
  if (review.keywordOwner === "not_applicable" && !review.notApplicableReason.trim()) {
    errors.push("Explain why keyword ownership is not applicable.");
  }
  if (review.keywordOwner === "not_applicable" && (review.primaryQuery.trim() || review.ownerCanonical.trim())) {
    errors.push("Not-applicable keyword ownership cannot keep a query or owner URL.");
  }
  validateGoogleDemandEvidence(review, errors);
  validateMeasurementPlanEvidence(review, errors);
  if (APPROVED_MANUAL_STATES.has(review.manualChatState) && !review.userDecisionReference.trim()) {
    errors.push("An approved, monitoring, or complete review needs the user decision reference.");
  }
  if (PLANNING_CHANGE_STATES.has(review.decisionChangeState)) {
    if (!IMPLEMENTATION_MANUAL_STATES.has(review.manualChatState)) {
      errors.push("A planned or implemented change needs approval to implement.");
    }
    if (!review.userDecisionReference.trim()) {
      errors.push("A planned or implemented change needs the user decision reference.");
    }
  }
  if (DELIVERED_CHANGE_STATES.has(review.decisionChangeState)) {
    if (!POST_IMPLEMENTATION_MANUAL_STATES.has(review.manualChatState)) {
      errors.push(
        "A shipped, verified, or reverted change needs approval to implement, monitoring, or completion.",
      );
    }
    if (!review.userDecisionReference.trim()) {
      errors.push("A shipped, verified, or reverted change needs the user decision reference.");
    }
    if (!review.changeId.trim()) {
      errors.push("A shipped, verified, or reverted change needs its change ID.");
    }
    if (!review.decisionChangedAt.trim()) {
      errors.push("A shipped, verified, or reverted change needs the change date and time.");
    } else if (Number.isNaN(new Date(review.decisionChangedAt).getTime())) {
      errors.push("The change date and time is invalid.");
    }
  }
  const approvedReviewState = [
    "approved_to_record",
    "approved_to_implement",
    "monitoring",
    "complete",
  ].includes(review.manualChatState);
  if (approvedReviewState) {
    if (review.performanceState === "unassessed") {
      errors.push("Assess the page performance state before approval.");
    }
    if (review.changeScope === "undecided") {
      errors.push("Choose a focused, comprehensive, or not-applicable scope before approval.");
    }
    if (review.experimentState === "unchecked") {
      errors.push("Check whether the page is in an active experiment before approval.");
    }
    const hasProposedImplementation = Boolean(
      review.proposedChange.trim() ||
        review.decisionChangeState !== "not_planned" ||
        review.manualChatState === "approved_to_implement",
    );
    const isRecordedNoChange =
      MONITORING_NO_CHANGE_DECISIONS.has(review.decisionAction) &&
      review.decisionChangeState === "not_planned";
    if (isRecordedNoChange) {
      if (review.changeScope !== "not_applicable") {
        errors.push("A recorded no-change decision must use a not-applicable scope.");
      }
      if (review.changeBlastRadius !== "not_applicable") {
        errors.push("A recorded no-change decision must use a not-applicable blast radius.");
      }
    }
    if (hasProposedImplementation) {
      if (!["focused", "comprehensive"].includes(review.changeScope)) {
        errors.push("A proposed implementation needs a focused or comprehensive scope.");
      }
      if (!review.scopeRationale.trim()) {
        errors.push("Explain why the proposed scope fully solves the verified problem.");
      }
      if (!review.proposedChange.trim()) {
        errors.push("Describe the recommended change and its full scope.");
      }
      if (!review.rollbackTrigger.trim()) {
        errors.push("Add an explicit rollback trigger for the proposed change.");
      }
      if (["undecided", "not_applicable"].includes(review.changeBlastRadius)) {
        errors.push("Choose the proposed change's blast radius.");
      }
      const affectedCount = Number(review.affectedCanonicalCount);
      if (!review.affectedCanonicalCount.trim() || !Number.isInteger(affectedCount) || affectedCount < 1) {
        errors.push("Record how many canonical pages the proposed change affects.");
      }
      if (review.changeBlastRadius === "page_local" && affectedCount !== 1) {
        errors.push("A page-local change must affect exactly one canonical.");
      }
      if (["shared_template", "mixed"].includes(review.changeBlastRadius)) {
        if (!review.blastRadiusNote.trim()) {
          errors.push(
            "Name the shared and page-local behavior changed by a shared-template or mixed recommendation.",
          );
        }
        if (!review.affectedPageFamily) {
          errors.push(
            "A shared-template or mixed change needs its affected page family.",
          );
        }
        if (Number.isInteger(affectedCount) && affectedCount < 2) {
          errors.push(
            "A shared-template or mixed change must affect more than one canonical.",
          );
        }
        if (
          review.pageFamily === "river_report" &&
          review.affectedPageFamily !== "river_report"
        ) {
          errors.push(
            "A river-report shared-template or mixed change must target every river_report page.",
          );
        }
      }
    }
    if (review.performanceState === "demonstrated_winner") {
      if (splitLines(review.demonstratedWins).length === 0) {
        errors.push("Record the dated evidence that makes this page a demonstrated winner.");
      }
      if (
        hasProposedImplementation &&
        splitLines(review.preservedElements).length === 0 &&
        splitLines(review.intentionallyChangedElements).length === 0
      ) {
        errors.push(
          "Record what a change to this winner preserves or intentionally replaces.",
        );
      }
    }
    if (review.experimentState === "approved_contamination") {
      if (!review.experimentId.trim()) {
        errors.push("Approved experiment contamination needs the experiment ID.");
      }
      if (!review.experimentFrozenUntil.trim()) {
        errors.push("Approved experiment contamination needs the original freeze date.");
      }
      if (!review.experimentExceptionReason.trim()) {
        errors.push("Record the user-approved reason for contaminating the experiment.");
      }
    }
    if (
      review.experimentState === "frozen" &&
      (review.manualChatState === "approved_to_implement" ||
        review.manualChatState === "monitoring" ||
        review.manualChatState === "complete" ||
        review.decisionChangeState !== "not_planned")
    ) {
      errors.push(
        "A frozen experiment cannot enter implementation; record approved contamination after explicit approval.",
      );
    }
    if (review.indexPolicy === "undecided") {
      errors.push("Choose an index policy before completing this review.");
    }
    if (review.keywordOwner === "undecided") {
      errors.push("Assign keyword ownership or mark it not applicable before completing this review.");
    }
    if (review.indexPolicy !== "index" && review.keywordOwner === "this_page") {
      errors.push("A noindex, redirect, or removed page cannot remain the primary keyword owner.");
    }
    if (!review.topicCluster.trim()) errors.push("Add the topic cluster before completing this review.");
    if (!review.maintenanceOwner.trim()) {
      errors.push("Add the maintenance owner before completing this review.");
    }
    if (!review.editorialOwner.trim()) {
      errors.push("Add the named contributor or team byline before completing this review.");
    }
    if (splitLines(review.clusterGaps).length === 0) {
      errors.push("Record at least one cluster gap or an honest sentinel before completing this review.");
    }
    if (review.primaryIntent === "unknown") {
      errors.push("Choose the search intent before completing this review.");
    }
    if (!review.jobToBeDone.trim()) {
      errors.push("Describe the user's job to be done before completing this review.");
    }
    if (!review.firstReviewedAt.trim()) {
      errors.push("Add the first reviewed date before completing this review.");
    }
    if (!review.lastReviewedAt.trim()) {
      errors.push("Add the last reviewed date before completing this review.");
    }
    if (!review.nextReviewAt.trim()) {
      errors.push("Add the next review date before saving an approved review.");
    }
    if (review.serpEvidenceState === "missing") {
      errors.push("Set the SERP evidence state before completing this review.");
    }
    if (review.differentiationEvidenceState === "missing") {
      errors.push("Set the offer evidence state before completing this review.");
    }
    if (review.eeatEvidenceState === "missing") {
      errors.push("Set the E-E-A-T evidence state before completing this review.");
    }
    if (review.keywordPlanner.evidenceState === "missing") {
      errors.push("Set the Google Keyword Planner evidence state before saving an approved review.");
    }
    if (review.googleTrends.evidenceState === "missing") {
      errors.push("Set the Google Trends evidence state before saving an approved review.");
    }
    if (!review.decisionProblem.trim()) {
      errors.push("Add the decision rationale before saving an approved review.");
    }
    if (
      ["verified", "partial"].includes(review.serpEvidenceState) &&
      !review.serpCompetitionSummary.trim()
    ) {
      errors.push("Explain the observed SERP competition before saving an approved review.");
    }
    if (
      ["verified", "partial"].includes(review.eeatEvidenceState) &&
      splitLines(review.eeatGaps).length === 0
    ) {
      errors.push("Record an E-E-A-T gap or an honest no-gap finding before saving an approved review.");
    }
    const completeSerpResults = review.serpTopFive.filter((result) =>
      [result.url, result.title, result.offer, result.evidence, result.gap].every((value) =>
        value.trim(),
      ),
    );
    if (review.serpEvidenceState === "verified" && completeSerpResults.length !== 5) {
      errors.push(
        "Verified SERP evidence needs all five competitor rows with URL, title, offer, evidence, and gap.",
      );
    }
    if (review.serpEvidenceState === "partial" && completeSerpResults.length === 0) {
      errors.push(
        "Partial SERP evidence needs at least one complete competitor row with URL, title, offer, evidence, and gap.",
      );
    }
    const indexableKeywordTarget =
      review.indexPolicy === "index" && review.keywordOwner !== "not_applicable";
    if (indexableKeywordTarget) {
      if (
        ["approved_to_implement", "monitoring", "complete"].includes(
          review.manualChatState,
        )
      ) {
        if (
          !["verified", "partial"].includes(
            review.measurementPlan.evidenceState,
          )
        ) {
          errors.push(
            "Approved implementation, monitoring, or completion needs a verified or partial measurement plan.",
          );
        }
        for (const [label, state] of [
          ["GSC", review.measurementPlan.gsc.evidenceState],
          ["GA4", review.measurementPlan.ga4.evidenceState],
        ] as const) {
          if (!["verified", "partial"].includes(state)) {
            errors.push(
              `${label} baseline evidence must be verified or partial before implementation, monitoring, or completion.`,
            );
          }
        }
        if (
          review.measurementPlan.baselineCanonical.trim() &&
          comparableCanonicalUrl(review.measurementPlan.baselineCanonical) !==
            comparableCanonicalUrl(review.canonicalUrl)
        ) {
          errors.push(
            "The measurement baseline canonical must match this page's exact canonical URL.",
          );
        }
      }
      if (review.serpEvidenceState === "not_applicable") {
        errors.push(
          "serp.evidenceState cannot be not_applicable for an indexable keyword-targeted page.",
        );
      }
      if (review.differentiationEvidenceState === "not_applicable") {
        errors.push(
          "offer.differentiationEvidenceState cannot be not_applicable for an indexable keyword-targeted page.",
        );
      }
      if (review.eeatEvidenceState === "not_applicable") {
        errors.push(
          "eeat.evidenceState cannot be not_applicable for an indexable keyword-targeted page.",
        );
      }
      if (!review.serpLocation.trim()) {
        errors.push("Add the SERP location before completing an indexable keyword-targeted page.");
      }
      if (!review.serpDevice) {
        errors.push("Choose the SERP device before completing an indexable keyword-targeted page.");
      }
      if (
        review.primaryQuery.trim() &&
        review.serpQuery.trim() &&
        normalizedReviewQuery(review.primaryQuery) !==
          normalizedReviewQuery(review.serpQuery)
      ) {
        errors.push("The SERP query must match the approved primary query.");
      }
      if (!["verified", "partial"].includes(review.keywordPlanner.evidenceState)) {
        errors.push(
          "An approved indexable keyword page needs verified or partial Google Keyword Planner evidence.",
        );
      }
      if (!["verified", "partial"].includes(review.googleTrends.evidenceState)) {
        errors.push(
          "An approved indexable keyword page needs verified or partial Google Trends evidence.",
        );
      }
      if (
        review.primaryQuery.trim() &&
        review.keywordPlanner.query.trim() &&
        normalizedReviewQuery(review.primaryQuery) !==
          normalizedReviewQuery(review.keywordPlanner.query)
      ) {
        errors.push("The Keyword Planner query must match the approved primary query.");
      }
      if (
        review.primaryQuery.trim() &&
        review.googleTrends.query.trim() &&
        normalizedReviewQuery(review.primaryQuery) !==
          normalizedReviewQuery(review.googleTrends.query)
      ) {
        errors.push("The Google Trends query must match the approved primary query.");
      }
    }
  }
  if (review.manualChatState === "approved_to_record") {
    if (["pending", "blocked"].includes(review.decisionAction)) {
      errors.push("Approval to record needs a reviewed decision, not pending or blocked.");
    }
  }
  if (review.manualChatState === "approved_to_implement") {
    if (!IMPLEMENTATION_DECISION_STATES.has(review.decisionAction)) {
      errors.push("Approval to implement needs a decision that calls for a clearly scoped change.");
    }
    if (!review.proposedChange.trim()) {
      errors.push("Approval to implement needs the recommended change and its full scope.");
    }
    if (review.decisionChangeState === "not_planned") {
      errors.push("Approval to implement needs a planned, in-progress, or delivered change state.");
    }
  }

  function validateTerminalGate(day: "day7" | "day28" | "day56") {
    const gate = review[day];
    if (!TERMINAL_GATE_STATUSES.has(gate.status)) return;
    const needsDueAndEvidence = gate.status === "recorded" || gate.status === "missed";
    if (needsDueAndEvidence && !gate.dueAt.trim()) errors.push(`${day}.dueAt is required.`);
    if (needsDueAndEvidence && !gate.evidence.trim()) errors.push(`${day}.evidence is required.`);
    if (!gate.reviewedAt.trim()) errors.push(`${day}.reviewedAt is required.`);
    if (!gate.decision.trim()) errors.push(`${day}.decision is required.`);
    if (!gate.rationale.trim()) errors.push(`${day}.rationale is required.`);
    if (!gate.nextAction.trim()) errors.push(`${day}.nextAction is required.`);
  }

  if (review.manualChatState === "monitoring") {
    const deliveredChange =
      DELIVERED_CHANGE_STATES.has(review.decisionChangeState) &&
      IMPLEMENTATION_DECISION_STATES.has(review.decisionAction);
    const recordedNoChange =
      review.decisionChangeState === "not_planned" &&
      MONITORING_NO_CHANGE_DECISIONS.has(review.decisionAction);
    if (!deliveredChange && !recordedNoChange) {
      errors.push("Monitoring needs a delivered change or a terminal recorded no-change decision.");
    }
    let hasOpenGate = false;
    (["day7", "day28", "day56"] as const).forEach((day) => {
      if (TERMINAL_GATE_STATUSES.has(review[day].status)) {
        validateTerminalGate(day);
      } else {
        hasOpenGate = true;
        if (!review[day].dueAt.trim()) errors.push(`${day}.dueAt is required while monitoring.`);
      }
    });
    if (!hasOpenGate) {
      errors.push("Monitoring needs at least one open gate; use complete when every gate is terminal.");
    }
  }
  if (review.manualChatState === "complete") {
    if (!TERMINAL_DECISION_STATES.has(review.decisionAction)) {
      errors.push("Decision state must be a terminal outcome before manual collaboration can be complete.");
    }
    if (["planned", "in_progress"].includes(review.decisionChangeState)) {
      errors.push(
        "Change state must not be planned or in progress when manual collaboration is complete.",
      );
    }
    (["day7", "day28", "day56"] as const).forEach((day) => {
      if (!TERMINAL_GATE_STATUSES.has(review[day].status)) {
        errors.push(
          `${day}.status must be recorded, missed, or not_applicable before manualChatState can be complete.`,
        );
      }
      validateTerminalGate(day);
    });
  }
  if (review.serpTopFive.length !== 5) errors.push("SERP evidence must keep five result positions.");
  if (review.serpTopFive.some((result, index) => result.position !== index + 1)) {
    errors.push("SERP result positions must be the unique ranks 1 through 5.");
  }
  if (
    review.serpTopFive.some(
      (result) => !result.url.trim() && [result.title, result.offer, result.evidence, result.gap].some((value) => value.trim()),
    )
  ) {
    errors.push("Each recorded SERP result needs its URL.");
  }
  if (review.serpTopFive.some((result) => result.url.trim() && !isValidUrl(result.url, false))) {
    errors.push("Each recorded SERP result URL must use http:// or https://.");
  }
  review.eeatDetails.forEach((detail, index) => {
    const values = [detail.evidence, detail.source, detail.checkedAt, detail.reviewer, detail.limitation];
    if (!values.some((value) => value.trim())) return;
    const row = `E-E-A-T evidence ${index + 1}`;
    if (!detail.evidence.trim()) errors.push(`${row} needs the evidence observed.`);
    if (!detail.source.trim()) errors.push(`${row} needs its source.`);
    if (!detail.checkedAt.trim()) {
      errors.push(`${row} needs the date and time it was checked.`);
    } else if (Number.isNaN(new Date(detail.checkedAt).getTime())) {
      errors.push(`${row} has an invalid checked date.`);
    }
    if (!detail.reviewer.trim()) errors.push(`${row} needs the reviewer name or team.`);
    if (!detail.limitation.trim()) errors.push(`${row} needs an honest limitation.`);
  });
  const hasSerpEvidence = Boolean(
    review.serpSnapshotAt ||
      review.serpQuery.trim() ||
      review.serpLocation.trim() ||
      review.serpDevice ||
      review.serpMethod ||
      ["verified", "partial"].includes(review.serpEvidenceState) ||
      review.serpEvidenceSummary.trim() ||
      review.serpFeatures.trim() ||
      ["low", "medium", "high"].includes(review.serpCompetition) ||
      review.serpCompetitionSummary.trim() ||
      review.serpTopFive.some((result) => result.url.trim()),
  );
  if (hasSerpEvidence) {
    if (!review.serpSnapshotAt) errors.push("A recorded SERP needs a snapshot time.");
    if (!review.serpQuery.trim()) errors.push("A recorded SERP needs its exact query.");
    if (!review.serpMethod) errors.push("A recorded SERP needs a manual search method.");
    if (!review.serpEvidenceSummary.trim()) {
      errors.push(
        review.serpEvidenceState === "partial"
          ? "Partial SERP evidence needs a summary that states its limitation."
          : "A recorded SERP needs an evidence summary.",
      );
    }
  }
  if (["verified", "partial"].includes(review.differentiationEvidenceState)) {
    if (!review.competitorOffer.trim()) {
      errors.push("Verified or partial offer evidence needs the competitor offer.");
    }
    if (!review.currentOffer.trim()) {
      errors.push("Verified or partial offer evidence needs the current offer.");
    }
    if (!review.differentiation.trim()) {
      errors.push("Verified or partial offer evidence needs the differentiation.");
    }
  }
  if (
    ["verified", "partial"].includes(review.eeatEvidenceState) &&
    !review.eeatDetails.some((detail) =>
      [detail.evidence, detail.source, detail.checkedAt, detail.reviewer, detail.limitation].every(
        (value) => value.trim(),
      ),
    )
  ) {
    errors.push("Verified or partial E-E-A-T evidence needs at least one complete evidence detail.");
  }
  return errors;
}

export function isApprovedManualState(value: string): boolean {
  return APPROVED_MANUAL_STATES.has(value);
}

export function isActiveManualState(value: string): boolean {
  return ACTIVE_MANUAL_STATES.has(value);
}

export function pageReviewPatchInput(review: PageReviewRecord) {
  return {
    expectedVersion: review.version,
    pageFamily: review.pageFamily,
    indexPolicy: review.indexPolicy,
    reviewStatus: review.status,
    priority: review.priority,
    keyword: {
      status: review.keywordOwner,
      primaryQuery:
        review.keywordOwner === "this_page" || review.keywordOwner === "another_canonical"
          ? nullableText(review.primaryQuery)
          : null,
      ownerCanonical:
        review.keywordOwner === "another_canonical" ? nullableText(review.ownerCanonical) : null,
      notApplicableReason:
        review.keywordOwner === "not_applicable" ? nullableText(review.notApplicableReason) : null,
      secondaryQueries: splitList(review.secondaryQueries),
    },
    keywordPlanner: keywordPlannerInput(review.keywordPlanner),
    googleTrends: googleTrendsInput(review.googleTrends),
    measurementPlan: measurementPlanInput(review.measurementPlan),
    topic: {
      cluster: nullableText(review.topicCluster),
      parentPage: nullableText(review.parentPage),
      clusterGaps: splitLines(review.clusterGaps),
      maintenanceOwner: nullableText(review.maintenanceOwner),
      editorialOwner: nullableText(review.editorialOwner),
    },
    intent: {
      searchIntent: review.primaryIntent,
      jobToBeDone: nullableText(review.jobToBeDone),
    },
    serp: {
      snapshotAt: nullableIsoDate(review.serpSnapshotAt),
      query: nullableText(review.serpQuery),
      locale: nullableText(review.serpLocation),
      device: review.serpDevice || null,
      method: review.serpMethod || null,
      evidenceSummary: nullableText(review.serpEvidenceSummary),
      evidenceState: review.serpEvidenceState,
      features: splitList(review.serpFeatures),
      competition: review.serpCompetition,
      competitionSummary: nullableText(review.serpCompetitionSummary),
      results: review.serpTopFive
        .filter((result) => result.url.trim())
        .map((result) => ({
          ...result,
          url: result.url.trim(),
        })),
    },
    offer: {
      competitorOffer: nullableText(review.competitorOffer),
      currentOffer: nullableText(review.currentOffer),
      differentiation: nullableText(review.differentiation),
      differentiationEvidenceState: review.differentiationEvidenceState,
    },
    eeat: {
      evidence: splitLines(review.eeatEvidence),
      gaps: splitLines(review.eeatGaps),
      evidenceState: review.eeatEvidenceState,
      details: review.eeatDetails
        .filter((detail) =>
          [detail.evidence, detail.source, detail.checkedAt, detail.reviewer, detail.limitation].some(
            (value) => value.trim(),
          ),
        )
        .map((detail) => ({
          evidence: detail.evidence.trim(),
          source: detail.source.trim(),
          checkedAt: new Date(detail.checkedAt).toISOString(),
          reviewer: detail.reviewer.trim(),
          limitation: detail.limitation.trim(),
        })),
    },
    decision: {
      state: review.decisionAction,
      rationale: nullableText(review.decisionProblem),
      proposedChange: nullableText(review.proposedChange),
      performanceState: review.performanceState,
      scopeClass: review.changeScope,
      scopeRationale: nullableText(review.scopeRationale),
      demonstratedWins: splitLines(review.demonstratedWins),
      preservedElements: splitLines(review.preservedElements),
      intentionallyChangedElements: splitLines(
        review.intentionallyChangedElements,
      ),
      blastRadius: review.changeBlastRadius,
      affectedPageFamily: review.affectedPageFamily || null,
      affectedCanonicalCount: review.affectedCanonicalCount.trim()
        ? Number(review.affectedCanonicalCount)
        : null,
      blastRadiusNote: nullableText(review.blastRadiusNote),
      experimentState: review.experimentState,
      experimentId: nullableText(review.experimentId),
      experimentFrozenUntil: nullableIsoDate(review.experimentFrozenUntil),
      experimentExceptionReason: nullableText(
        review.experimentExceptionReason,
      ),
      rollbackTrigger: nullableText(review.rollbackTrigger),
      changeState: review.decisionChangeState,
      changeId: nullableText(review.changeId),
      changedAt: nullableIsoDate(review.decisionChangedAt),
    },
    gates: {
      day7: gateInput(review.day7),
      day28: gateInput(review.day28),
      day56: gateInput(review.day56),
    },
    manualReview: {
      firstReviewedAt: nullableIsoDate(review.firstReviewedAt),
      lastReviewedAt: nullableIsoDate(review.lastReviewedAt),
      nextReviewAt: nullableIsoDate(review.nextReviewAt),
      notes: nullableText(review.manualNotes),
    },
    manualChatState: review.manualChatState,
    userDecisionReference: nullableText(review.userDecisionReference),
    changeNote: "Manual page-review workboard update",
  };
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function splitList(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function splitReviewLines(value: string): string[] {
  return splitLines(value);
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function nullableIsoDate(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function nullableNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function keywordPlannerInput(evidence: KeywordPlannerEvidence) {
  return {
    evidenceState: evidence.evidenceState,
    query: nullableText(evidence.query),
    checkedAt: nullableIsoDate(evidence.checkedAt),
    method: evidence.method || null,
    sourceUrl: nullableText(evidence.sourceUrl),
    geoTarget: nullableText(evidence.geoTarget),
    language: nullableText(evidence.language),
    network: evidence.network || null,
    averageMonthlySearches: nullableNumber(evidence.averageMonthlySearches),
    monthlySearches: evidence.monthlySearches,
    paidAdvertiserCompetition: evidence.paidAdvertiserCompetition || null,
    paidAdvertiserCompetitionIndex: nullableNumber(evidence.paidAdvertiserCompetitionIndex),
    lowTopOfPageBidMicros: nullableNumber(evidence.lowTopOfPageBidMicros),
    highTopOfPageBidMicros: nullableNumber(evidence.highTopOfPageBidMicros),
    limitation: nullableText(evidence.limitation),
    notApplicableReason: nullableText(evidence.notApplicableReason),
  };
}

function googleTrendsInput(evidence: GoogleTrendsEvidence) {
  return {
    evidenceState: evidence.evidenceState,
    query: nullableText(evidence.query),
    checkedAt: nullableIsoDate(evidence.checkedAt),
    method: evidence.method || null,
    sourceUrl: nullableText(evidence.sourceUrl),
    geo: nullableText(evidence.geo),
    timeframe: nullableText(evidence.timeframe),
    comparisonQueries: splitLines(evidence.comparisonQueries),
    direction: evidence.direction || null,
    finding: nullableText(evidence.finding),
    limitation: nullableText(evidence.limitation),
    notApplicableReason: nullableText(evidence.notApplicableReason),
  };
}

function measurementPlanInput(plan: MeasurementPlanEvidence) {
  return {
    evidenceState: plan.evidenceState,
    baselineCanonical: nullableText(plan.baselineCanonical),
    baselineAsOf: nullableText(plan.baselineAsOf),
    windowStart: nullableText(plan.windowStart),
    windowEnd: nullableText(plan.windowEnd),
    gsc: {
      evidenceState: plan.gsc.evidenceState,
      checkedAt: nullableIsoDate(plan.gsc.checkedAt),
      method: plan.gsc.method || null,
      sourceUrl: nullableText(plan.gsc.sourceUrl),
      clicks: nullableNumber(plan.gsc.clicks),
      impressions: nullableNumber(plan.gsc.impressions),
      ctr: nullableNumber(plan.gsc.ctr),
      position: nullableNumber(plan.gsc.position),
      limitation: nullableText(plan.gsc.limitation),
      notApplicableReason: nullableText(plan.gsc.notApplicableReason),
    },
    ga4: {
      evidenceState: plan.ga4.evidenceState,
      checkedAt: nullableIsoDate(plan.ga4.checkedAt),
      method: plan.ga4.method || null,
      sourceUrl: nullableText(plan.ga4.sourceUrl),
      screenPageViews: nullableNumber(plan.ga4.screenPageViews),
      sessions: nullableNumber(plan.ga4.sessions),
      engagedSessions: nullableNumber(plan.ga4.engagedSessions),
      activeUsers: nullableNumber(plan.ga4.activeUsers),
      keyEvents: nullableNumber(plan.ga4.keyEvents),
      limitation: nullableText(plan.ga4.limitation),
      notApplicableReason: nullableText(plan.ga4.notApplicableReason),
    },
    hypothesis: nullableText(plan.hypothesis),
    primaryKpi: {
      source: plan.primaryKpiSource || null,
      metric: plan.primaryKpiMetric || null,
      direction: plan.primaryKpiDirection || null,
      evaluationWindowDays: nullableNumber(plan.evaluationWindowDays),
      successCriteria: nullableText(plan.successCriteria),
    },
    conversionGoal: {
      eventName: nullableText(plan.conversionEventName),
      description: nullableText(plan.conversionDescription),
      notApplicableReason: nullableText(plan.conversionNotApplicableReason),
    },
    comparisonWindows: plan.comparisonWindows.map((window) => ({
      label: window.label.trim(),
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      metrics: {
        clicks: nullableNumber(window.clicks),
        impressions: nullableNumber(window.impressions),
        ctr: nullableNumber(window.ctr),
        position: nullableNumber(window.position),
        screenPageViews: nullableNumber(window.screenPageViews),
        sessions: nullableNumber(window.sessions),
        engagedSessions: nullableNumber(window.engagedSessions),
        activeUsers: nullableNumber(window.activeUsers),
        keyEvents: nullableNumber(window.keyEvents),
      },
      limitation: nullableText(window.limitation),
    })),
    guardrails: splitLines(plan.guardrails),
    limitation: nullableText(plan.limitation),
    notApplicableReason: nullableText(plan.notApplicableReason),
  };
}

function validateGoogleDemandEvidence(review: PageReviewRecord, errors: string[]) {
  const planner = review.keywordPlanner;
  const trends = review.googleTrends;

  if (["verified", "partial"].includes(planner.evidenceState)) {
    if (!planner.query.trim()) errors.push("Keyword Planner evidence needs the exact query.");
    if (!planner.checkedAt.trim() || Number.isNaN(new Date(planner.checkedAt).getTime())) {
      errors.push("Keyword Planner evidence needs a valid checked date and time.");
    }
    if (!planner.method) errors.push("Keyword Planner evidence needs its Google check method.");
    if (!planner.sourceUrl.trim() || !isOfficialGoogleUrl(planner.sourceUrl, [
      "ads.google.com",
      "developers.google.com",
      "googleads.googleapis.com",
    ])) {
      errors.push("Keyword Planner evidence needs a valid official Google source URL.");
    }
    if (!planner.geoTarget.trim()) errors.push("Keyword Planner evidence needs its location target.");
    if (!planner.language.trim()) errors.push("Keyword Planner evidence needs its language.");
    if (!planner.network) errors.push("Keyword Planner evidence needs its Google search network.");
    if (planner.evidenceState === "verified" && !planner.averageMonthlySearches.trim()) {
      errors.push("Verified Keyword Planner evidence needs the average monthly searches Google returned.");
    }
    if (planner.evidenceState === "verified" && !planner.paidAdvertiserCompetition) {
      errors.push("Verified Keyword Planner evidence needs Google's paid advertiser competition value.");
    }
    if (planner.evidenceState === "partial" && !planner.limitation.trim()) {
      errors.push("Partial Keyword Planner evidence needs an honest limitation.");
    }
  }
  if (planner.evidenceState === "not_applicable" && !planner.notApplicableReason.trim()) {
    errors.push("Explain why Google Keyword Planner is not applicable.");
  }
  if (planner.evidenceState !== "not_applicable" && planner.notApplicableReason.trim()) {
    errors.push("A Planner not-applicable reason is only valid when its evidence state is not applicable.");
  }
  const competitionIndex = nullableNumber(planner.paidAdvertiserCompetitionIndex);
  if (competitionIndex !== null && (competitionIndex < 0 || competitionIndex > 100)) {
    errors.push("Paid advertiser competition index must be between 0 and 100.");
  }
  const lowBid = nullableNumber(planner.lowTopOfPageBidMicros);
  const highBid = nullableNumber(planner.highTopOfPageBidMicros);
  if (lowBid !== null && highBid !== null && lowBid > highBid) {
    errors.push("High top-of-page bid must be at least the low top-of-page bid.");
  }

  if (["verified", "partial"].includes(trends.evidenceState)) {
    if (!trends.query.trim()) errors.push("Google Trends evidence needs the exact query.");
    if (!trends.checkedAt.trim() || Number.isNaN(new Date(trends.checkedAt).getTime())) {
      errors.push("Google Trends evidence needs a valid checked date and time.");
    }
    if (!trends.method) errors.push("Google Trends evidence needs its official Google check method.");
    if (!trends.sourceUrl.trim() || !isOfficialGoogleUrl(trends.sourceUrl, [
      "trends.google.com",
      "developers.google.com",
    ])) {
      errors.push("Google Trends evidence needs a valid official Google source URL.");
    }
    if (!trends.geo.trim()) errors.push("Google Trends evidence needs its geography.");
    if (!trends.timeframe.trim()) errors.push("Google Trends evidence needs its timeframe.");
    if (!trends.direction) errors.push("Google Trends evidence needs the observed direction or insufficient-data state.");
    if (!trends.finding.trim()) errors.push("Google Trends evidence needs a plain-language finding.");
    if (trends.evidenceState === "partial" && !trends.limitation.trim()) {
      errors.push("Partial Google Trends evidence needs an honest limitation.");
    }
  }
  if (trends.evidenceState === "not_applicable" && !trends.notApplicableReason.trim()) {
    errors.push("Explain why Google Trends is not applicable.");
  }
  if (trends.evidenceState !== "not_applicable" && trends.notApplicableReason.trim()) {
    errors.push("A Trends not-applicable reason is only valid when its evidence state is not applicable.");
  }
}

function validateMeasurementPlanEvidence(
  review: PageReviewRecord,
  errors: string[],
) {
  const plan = review.measurementPlan;
  const validateSource = (
    label: "GSC" | "GA4",
    source: GscBaselineEvidence | Ga4BaselineEvidence,
    officialHost: string,
    metricFields: string[],
  ) => {
    if (["verified", "partial"].includes(source.evidenceState)) {
      if (!source.checkedAt.trim() || Number.isNaN(new Date(source.checkedAt).getTime())) {
        errors.push(`${label} baseline evidence needs a valid checked date and time.`);
      }
      if (!source.method) errors.push(`${label} baseline evidence needs its check method.`);
      if (
        !source.sourceUrl.trim() ||
        !isOfficialGoogleUrl(source.sourceUrl, [officialHost])
      ) {
        errors.push(`${label} baseline evidence needs a valid official Google source URL.`);
      }
      if (source.evidenceState === "verified") {
        metricFields.forEach((field) => {
          if (!(source as unknown as Record<string, string>)[field]?.trim()) {
            errors.push(`Verified ${label} baseline evidence needs ${field}.`);
          }
        });
      }
      if (source.evidenceState === "partial" && source.limitation.trim().length < 10) {
        errors.push(`Partial ${label} baseline evidence needs an honest limitation.`);
      }
    }
    if (source.evidenceState === "not_applicable" && !source.notApplicableReason.trim()) {
      errors.push(`Explain why ${label} baseline evidence is not applicable.`);
    }
    if (source.evidenceState !== "not_applicable" && source.notApplicableReason.trim()) {
      errors.push(`${label} not-applicable reason is only valid when its evidence state is not applicable.`);
    }
  };

  validateSource(
    "GSC",
    plan.gsc,
    "search.google.com",
    ["clicks", "impressions", "ctr", "position"],
  );
  validateSource(
    "GA4",
    plan.ga4,
    "analytics.google.com",
    ["screenPageViews", "sessions", "engagedSessions", "activeUsers", "keyEvents"],
  );

  for (const [label, raw, maximum] of [
    ["GSC clicks", plan.gsc.clicks, null],
    ["GSC impressions", plan.gsc.impressions, null],
    ["GSC CTR", plan.gsc.ctr, 1],
    ["GSC position", plan.gsc.position, null],
    ["GA4 screenPageViews", plan.ga4.screenPageViews, null],
    ["GA4 sessions", plan.ga4.sessions, null],
    ["GA4 engagedSessions", plan.ga4.engagedSessions, null],
    ["GA4 activeUsers", plan.ga4.activeUsers, null],
    ["GA4 keyEvents", plan.ga4.keyEvents, null],
  ] as const) {
    if (!raw.trim()) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || (maximum !== null && value > maximum)) {
      errors.push(`${label} must be a non-negative number${maximum === null ? "" : ` no greater than ${maximum}`}.`);
    }
  }
  for (const [label, raw] of [
    ["GSC clicks", plan.gsc.clicks],
    ["GSC impressions", plan.gsc.impressions],
    ["GA4 screenPageViews", plan.ga4.screenPageViews],
    ["GA4 sessions", plan.ga4.sessions],
    ["GA4 engagedSessions", plan.ga4.engagedSessions],
    ["GA4 activeUsers", plan.ga4.activeUsers],
  ] as const) {
    if (raw.trim() && Number.isFinite(Number(raw)) && !Number.isInteger(Number(raw))) {
      errors.push(`${label} must be a whole number.`);
    }
  }
  plan.comparisonWindows.forEach((window, index) => {
    const row = `Comparison window ${index + 1}`;
    if (!window.label.trim()) errors.push(`${row} needs a label.`);
    if (!isDateOnly(window.windowStart)) errors.push(`${row} needs a valid start date.`);
    if (!isDateOnly(window.windowEnd)) errors.push(`${row} needs a valid end date.`);
    if (
      isDateOnly(window.windowStart) &&
      isDateOnly(window.windowEnd) &&
      window.windowStart > window.windowEnd
    ) {
      errors.push(`${row} end must be on or after its start.`);
    }
    const metricEntries = [
      ["clicks", window.clicks, true, null],
      ["impressions", window.impressions, true, null],
      ["ctr", window.ctr, false, 1],
      ["position", window.position, false, null],
      ["screenPageViews", window.screenPageViews, true, null],
      ["sessions", window.sessions, true, null],
      ["engagedSessions", window.engagedSessions, true, null],
      ["activeUsers", window.activeUsers, true, null],
      ["keyEvents", window.keyEvents, false, null],
    ] as const;
    if (!metricEntries.some(([, raw]) => raw.trim())) {
      errors.push(`${row} needs at least one known metric.`);
    }
    metricEntries.forEach(([label, raw, wholeNumber, maximum]) => {
      if (!raw.trim()) return;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || (maximum !== null && value > maximum)) {
        errors.push(`${row} ${label} must be a valid non-negative value.`);
      } else if (wholeNumber && !Number.isInteger(value)) {
        errors.push(`${row} ${label} must be a whole number.`);
      }
    });
  });
  if (plan.conversionEventName.trim() && !/^[A-Za-z][A-Za-z0-9_]{0,99}$/.test(plan.conversionEventName)) {
    errors.push("The conversion event must use a GA4-style name with letters, numbers, and underscores.");
  }
  if (
    plan.conversionNotApplicableReason.trim() &&
    (plan.conversionEventName.trim() || plan.conversionDescription.trim())
  ) {
    errors.push("A conversion goal cannot also be marked not applicable.");
  }
  if (plan.evidenceState === "not_applicable" && !plan.notApplicableReason.trim()) {
    errors.push("Explain why the measurement plan is not applicable.");
  }
  if (plan.evidenceState !== "not_applicable" && plan.notApplicableReason.trim()) {
    errors.push("A measurement-plan not-applicable reason is only valid when its evidence state is not applicable.");
  }
  if (!["verified", "partial"].includes(plan.evidenceState)) return;

  if (!isValidUrl(plan.baselineCanonical, true)) {
    errors.push("The measurement baseline needs the exact HTTPS canonical URL.");
  } else if (!isSameSiteUrl(plan.baselineCanonical, review.canonicalUrl)) {
    errors.push("The measurement baseline canonical must be on this site.");
  }
  for (const [label, value] of [
    ["Baseline as-of date", plan.baselineAsOf],
    ["Baseline window start", plan.windowStart],
    ["Baseline window end", plan.windowEnd],
  ]) {
    if (!isDateOnly(value)) errors.push(`${label} must be a valid YYYY-MM-DD date.`);
  }
  if (isDateOnly(plan.windowStart) && isDateOnly(plan.windowEnd) && plan.windowStart > plan.windowEnd) {
    errors.push("The baseline window end must be on or after its start.");
  }
  if (isDateOnly(plan.baselineAsOf) && isDateOnly(plan.windowEnd) && plan.baselineAsOf < plan.windowEnd) {
    errors.push("The baseline as-of date must be on or after the window end.");
  }
  if (!plan.hypothesis.trim()) errors.push("Add the measurement hypothesis.");
  if (!plan.primaryKpiSource) errors.push("Choose the primary KPI source.");
  if (!plan.primaryKpiMetric) errors.push("Choose the primary KPI metric.");
  if (!plan.primaryKpiDirection) errors.push("Choose the primary KPI direction.");
  const windowDays = nullableNumber(plan.evaluationWindowDays);
  if (windowDays === null || !Number.isInteger(windowDays) || windowDays < 7 || windowDays > 365) {
    errors.push("The KPI evaluation window must be a whole number from 7 to 365 days.");
  }
  if (!plan.successCriteria.trim()) errors.push("Write the primary KPI success criteria.");
  const gscMetrics = new Set(["clicks", "impressions", "ctr", "position"]);
  const ga4Metrics = new Set(["screenPageViews", "sessions", "engagedSessions", "activeUsers", "keyEvents"]);
  if (plan.primaryKpiSource === "gsc" && plan.primaryKpiMetric && !gscMetrics.has(plan.primaryKpiMetric)) {
    errors.push("The primary KPI metric must belong to its GSC source.");
  }
  if (plan.primaryKpiSource === "ga4" && plan.primaryKpiMetric && !ga4Metrics.has(plan.primaryKpiMetric)) {
    errors.push("The primary KPI metric must belong to its GA4 source.");
  }
  const selectedSource = plan.primaryKpiSource === "gsc" ? plan.gsc : plan.primaryKpiSource === "ga4" ? plan.ga4 : null;
  if (selectedSource && !["verified", "partial"].includes(selectedSource.evidenceState)) {
    errors.push("The primary KPI source needs verified or partial baseline evidence.");
  }
  const selectedValue =
    selectedSource && plan.primaryKpiMetric
      ? (selectedSource as unknown as Record<string, string>)[plan.primaryKpiMetric]
      : "";
  if (!selectedValue?.trim()) {
    errors.push("The primary KPI needs a known canonical baseline value; blank is unknown, not zero.");
  }
  if (
    !plan.conversionNotApplicableReason.trim() &&
    !(plan.conversionEventName.trim() && plan.conversionDescription.trim())
  ) {
    errors.push("Record a conversion goal and GA4 event, or explain why no conversion applies.");
  }
  if (splitLines(plan.guardrails).length === 0) {
    errors.push("Add at least one measurement guardrail.");
  }
  if (plan.evidenceState === "partial" && plan.limitation.trim().length < 10) {
    errors.push("A partial measurement plan needs an honest limitation.");
  }
  if (
    plan.evidenceState === "verified" &&
    [plan.gsc.evidenceState, plan.ga4.evidenceState].some(
      (state) => !["verified", "not_applicable"].includes(state),
    )
  ) {
    errors.push("A verified measurement plan needs each source verified or honestly not applicable.");
  }
}

function gateInput(gate: ReviewGate) {
  return {
    status: gate.status,
    dueAt: nullableIsoDate(gate.dueAt),
    reviewedAt: nullableIsoDate(gate.reviewedAt),
    evidence: nullableText(gate.evidence),
    decision: nullableText(gate.decision),
    rationale: nullableText(gate.rationale),
    nextAction: nullableText(gate.nextAction),
  };
}

function isValidUrl(value: string, requireHttps: boolean): boolean {
  try {
    const parsed = new URL(value);
    return requireHttps ? parsed.protocol === "https:" : ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isOfficialGoogleUrl(value: string, allowedHosts: string[]): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && allowedHosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function comparableCanonicalUrl(value: string): string {
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    parsed.pathname =
      parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
    return parsed.toString();
  } catch {
    return value.trim();
  }
}

function isSameSiteUrl(value: string, canonicalUrl: string): boolean {
  try {
    const owner = new URL(value);
    const canonical = new URL(canonicalUrl);
    return owner.protocol === "https:" && owner.hostname === canonical.hostname;
  } catch {
    return false;
  }
}
