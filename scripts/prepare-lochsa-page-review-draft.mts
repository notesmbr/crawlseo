import assert from "node:assert/strict";
import { Prisma, PrismaClient, type PageReview } from "@prisma/client";
import {
  activeManualChatStateValues,
  apiEnumToDb,
  isActiveManualChatState,
  normalizePageReviewPatch,
  pageReviewToApi,
  patchPageReviewSchema,
  semanticChangedReviewFields,
} from "../lib/page-reviews.ts";

type Arguments = {
  siteId: string;
  reviewId: string;
  canonical: string;
  expectedVersion: number;
  apply: boolean;
};

function readArguments(argv: string[]): Arguments {
  const value = (name: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const expectedVersion = Number(value("--expected-version"));
  const siteId = value("--site-id")?.trim() ?? "";
  const reviewId = value("--review-id")?.trim() ?? "";
  const canonical = value("--canonical")?.trim() ?? "";
  if (
    !siteId ||
    !reviewId ||
    canonical !==
      "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river" ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 1
  ) {
    throw new Error(
      "Usage: node --experimental-strip-types scripts/prepare-lochsa-page-review-draft.mts --site-id SITE_ID --review-id REVIEW_ID --canonical https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river --expected-version VERSION [--apply]",
    );
  }
  return {
    siteId,
    reviewId,
    canonical,
    expectedVersion,
    apply: argv.includes("--apply"),
  };
}

const arguments_ = readArguments(process.argv.slice(2));
const checkedAt = new Date().toISOString();
const payload = {
  expectedVersion: arguments_.expectedVersion,
  reviewStatus: "researching",
  priority: "p0",
  keyword: {
    status: "this_page",
    primaryQuery: "lochsa river fishing report",
    ownerCanonical: null,
    notApplicableReason: null,
    secondaryQueries: [
      "lochsa river fly fishing report",
      "lochsa river fishing report today",
      "lochsa river fishing conditions",
    ],
  },
  topic: {
    cluster: "Clearwater–Lochsa–Selway river reports",
    parentPage: "https://bluestreamfly.com/fly-fishing-reports/idaho",
    clusterGaps: [
      "No useful Clearwater or Selway alternative is currently shown in the related-report module.",
      "The report directory does not provide a verified contextual inbound link to this report.",
      "The current page lacks a direct current Chinook status link and the IDFG interactive access map.",
    ],
    maintenanceOwner: "BlueStreamFly river-report maintenance team",
    editorialOwner: null,
  },
  intent: {
    searchIntent: "local_trip_planning",
    jobToBeDone:
      "Decide whether the Lochsa is worth the drive today, then verify flow, weather, safe access, current reach-specific rules, and what to fish.",
  },
  keywordPlanner: {
    evidenceState: "partial",
    query: "lochsa river fishing report",
    checkedAt,
    method: "google_ads_api",
    sourceUrl:
      "https://developers.google.com/google-ads/api/docs/keyword-planning/generate-keyword-ideas",
    geoTarget: "United States (Google geo target 2840)",
    language: "English (Google language constant 1000)",
    network: "google_search",
    averageMonthlySearches: null,
    monthlySearches: [],
    paidAdvertiserCompetition: null,
    paidAdvertiserCompetitionIndex: null,
    lowTopOfPageBidMicros: null,
    highTopOfPageBidMicros: null,
    limitation:
      "The CrawlSEO Google Ads connector is not configured with approved Google Ads API credentials, so Keyword Planner returned no live demand estimates. Missing values are unknown, not zero.",
    notApplicableReason: null,
  },
  measurementPlan: {
    evidenceState: "partial",
    baselineCanonical: arguments_.canonical,
    baselineAsOf: "2026-08-13",
    windowStart: "2026-07-17",
    windowEnd: "2026-08-13",
    gsc: {
      evidenceState: "verified",
      checkedAt: "2026-08-15T13:06:23.000Z",
      method: "crawlseo_gsc_import",
      sourceUrl:
        "https://search.google.com/search-console/performance/search-analytics",
      clicks: 9,
      impressions: 97,
      ctr: 0.0928,
      position: 18.38,
      limitation: null,
      notApplicableReason: null,
    },
    ga4: {
      evidenceState: "missing",
      checkedAt: null,
      method: null,
      sourceUrl: null,
      screenPageViews: null,
      sessions: null,
      engagedSessions: null,
      activeUsers: null,
      keyEvents: null,
      limitation: null,
      notApplicableReason: null,
    },
    hypothesis:
      "A comprehensive mixed repair that removes shared safety and source contradictions, makes current Lochsa status and access easier to verify, and adds useful regional context should increase trust and useful actions while preserving exact-query visibility.",
    primaryKpi: {
      source: "gsc",
      metric: "clicks",
      direction: "increase",
      evaluationWindowDays: 28,
      successCriteria:
        "Compare the next finalized 28-day page total with the 9-click baseline. Treat low-volume or mixed evidence as inconclusive, not as a win or loss.",
    },
    conversionGoal: {
      eventName: "official_source_click",
      description:
        "A visitor opens a useful official rules, flow, weather, or access source before fishing.",
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
        limitation:
          "GSC page totals include anonymized query traffic that is absent from detailed query rows.",
      },
      {
        label: "Latest 90 days",
        windowStart: "2026-05-16",
        windowEnd: "2026-08-13",
        metrics: {
          clicks: 36,
          impressions: 307,
          ctr: 0.1173,
          position: 16.73,
        },
        limitation:
          "This longer context overlaps the primary and prior 28-day windows and is not an independent test period.",
      },
    ],
    guardrails: [
      "Preserve the exact canonical, title and H1 ownership, and indexability.",
      "Do not remove useful river-plan, condition, tactic, hatch, access, source, or FAQ content.",
      "The exact primary query must keep the Lochsa canonical as its current owner and must not materially worsen; low-volume or mixed evidence is inconclusive.",
      "Official-source accuracy, safety language, schema, and crawl eligibility must not regress across any river report.",
      "Representative river states and all 459 report canonicals must pass the shared-template release crawl.",
      "GA4 page_view and official_source_click collection must be verified without duplicates before implementation approval.",
    ],
    limitation:
      "GA4 canonical metrics are still unverified and therefore remain missing. GSC detailed query rows omit anonymized data, so Page totals are the primary baseline.",
    notApplicableReason: null,
  },
  serp: {
    snapshotAt: checkedAt,
    query: "lochsa river fishing report",
    locale: "United States · English",
    device: "desktop",
    method: "manual_other",
    competition: "unclear",
    evidenceState: "partial",
    evidenceSummary:
      "The exact signed-out Google top five could not be captured because the available browser connections timed out and Google challenged a direct request. Current web discovery and direct page checks found an official agency planner, current regional fly-shop reports, river-report utilities, and evergreen regional guides, but their order is not recorded as a Google ranking.",
    features: [],
    competitionSummary:
      "Competition remains unclear until an exact signed-out Google top-five capture succeeds. The observed set mixes a high-authority official agency with current local reports and weaker or stale utility pages, so BlueStreamFly has a credible differentiation opportunity without assuming low competition.",
    results: [],
  },
  offer: {
    competitorOffer:
      "Idaho Fish and Game provides authoritative rules, an interactive map, facilities, and a flow link. Current fly-shop reports add local conditions and tactics. River utilities and evergreen guides add quick graphs or regional context, but some current examples are stale, incomplete, or wrong for official season status.",
    currentOffer:
      "BlueStreamFly combines a trip decision, live-condition context, tactics, full seasonal hatches, fly guides, access, safety, source links, and FAQs in one report.",
    differentiation:
      "Provide the easiest evidence-backed trip decision: qualify uncertain safety calls, separate official agencies from secondary tools, show current season and reach status, link directly to access maps, and offer relevant Clearwater-area alternatives while preserving the complete report.",
    differentiationEvidenceState: "partial",
  },
  eeat: {
    evidence: [
      "The page links to the official USGS Lochsa gauge and the Idaho Fish and Game planner.",
      "The generated hero image is disclosed as generated and not an exact location photo.",
      "The page shows a checked date, methodology link, and source-problem reporting route.",
    ],
    gaps: [
      "The page has no named reviewer or approved transparent river-review team byline.",
      "Tactics and hatches do not clearly distinguish editorial judgment from measured or official evidence.",
      "The source check date is June 2, 2026, while current species-season status can change.",
      "The current 2026 Chinook closure and the IDFG interactive map are not linked directly.",
      "Mobile visual behavior and Core Web Vitals remain unverified in this review.",
    ],
    details: [
      {
        evidence:
          "The IDFG Fishing Planner documents 2025–2027 reach-specific rules, an interactive map, facilities, and the official flow link.",
        source:
          "https://idfg.idaho.gov/ifwis/fishingplanner/water/1155987461400",
        checkedAt,
        reviewer: "Codex research review; BlueStreamFly user decision pending",
        limitation:
          "The planner is authoritative for the listed rules and map, but posted signs and current rule notices still control in the field.",
      },
      {
        evidence:
          "The current IDFG 2026 Lochsa Chinook page shows the Lowell Bridge–Twin Bridges season closed after August 10 with no harvest allowed.",
        source:
          "https://idfg.idaho.gov/fish/chinook/rules/spring-run/lochsa-river-lowell-bridge-twin-bridges-summer-2026",
        checkedAt,
        reviewer: "Codex research review; BlueStreamFly user decision pending",
        limitation:
          "Species seasons are time-sensitive and must be rechecked from the official page before publication and before fishing.",
      },
      {
        evidence:
          "The live BlueStreamFly report exposes a complete trip-planning structure and identifies its official and secondary sources, but uses a generic team check label and repeated source actions.",
        source: arguments_.canonical,
        checkedAt,
        reviewer: "Codex research review; BlueStreamFly user decision pending",
        limitation:
          "Browser visual capture was unavailable, so responsive layout, contrast, focus order, and chart hydration remain unverified rather than passed.",
      },
    ],
    evidenceState: "partial",
  },
  decision: {
    state: "pending",
    rationale:
      "The page is a demonstrated search winner, but the review found connected safety, source-trust, access, reviewer, regional-link, and plain-language gaps. Fixing only one item would leave material user problems unresolved.",
    proposedChange:
      "Approve a comprehensive mixed repair: shared decision-confidence, access-mode tie, official-source, timestamp, freshness, reviewer, and plain-language template work for all 459 river reports; plus Lochsa-only current IDFG season status, access-map verification, source refresh, reviewer assignment, Clearwater/Selway contextual links, and prose cleanup.",
    performanceState: "demonstrated_winner",
    scopeClass: "comprehensive",
    scopeRationale:
      "Several connected template and Lochsa-specific failures affect safety, trust, scanning, and regional usefulness. A comprehensive mixed scope is the minimum sufficient repair while preserving the page's working keyword and content structure.",
    demonstratedWins: [
      "The exact query recorded 3 clicks, 27 impressions, 11.11% CTR, and average position 5.93 in the latest finalized 28 days.",
      "The canonical recorded 9 clicks and 97 impressions in the same 28-day window.",
      "The latest crawl found a 200 indexable self-canonical page with one H1, schema, complete content, and no Lochsa crawl issue.",
    ],
    preservedElements: [
      "Canonical URL, slug, exact-match title, and aligned H1.",
      "Primary-query ownership and current exact-query visibility.",
      "Complete decision, condition, plan, tactic, hatch, fly, access, source, and FAQ layers.",
      "Direct USGS, IDFG, and Forest Service evidence plus generated-image disclosure.",
    ],
    intentionallyChangedElements: [
      "Shared river-report safety answer, access-mode selection, source grouping/actions, time formatting, freshness, reviewer, and plain-language presentation.",
      "Lochsa current-season status, access/map evidence, regional alternatives and inbound links, source check date, and difficult prose.",
    ],
    blastRadius: "mixed",
    affectedPageFamily: "river_report",
    affectedCanonicalCount: 459,
    blastRadiusNote:
      "Shared work changes the reusable river-report template for all 459 reports; Lochsa facts, rules, access, sources, reviewer assignment, and Clearwater-area links remain page-local. Do not create a one-off Lochsa layout.",
    experimentState: "frozen",
    experimentId: "river-report-keyword-test-2026-08-10",
    experimentFrozenUntil: "2026-10-05T23:59:59.000Z",
    experimentExceptionReason: null,
    rollbackTrigger:
      "Rollback immediately for safety, indexability, schema, or broken-source regressions. Reassess the SEO/content portion if the next finalized 28-day primary-query position worsens by more than three places and clicks and impressions also decline without offsetting conversion or trust evidence.",
    changeState: "not_planned",
    changeId: null,
    changedAt: null,
  },
  manualReview: {
    firstReviewedAt: checkedAt,
    lastReviewedAt: checkedAt,
    nextReviewAt: null,
    notes:
      "Comprehensive mixed Lochsa rerun recorded as research only. Exact Google top-five order, Google Trends, Keyword Planner metrics, GA4 canonical aggregates, visual mobile QA, and Core Web Vitals remain unavailable or partial. The user must separately approve shared all-river template work and Lochsa-local work before implementation.",
  },
  manualChatState: "researching",
  userDecisionReference: null,
  changeNote:
    "Record the comprehensive mixed Lochsa rerun, preserved wins, all-river template scope, page-local scope, and evidence limits as a research-only draft; no implementation approval.",
};

assert.equal(payload.manualChatState, "researching");
assert.equal(payload.userDecisionReference, null);
assert.equal(payload.decision.state, "pending");
assert.equal(payload.decision.changeState, "not_planned");
const parsedPayload = patchPageReviewSchema.parse(payload);

if (!arguments_.apply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        siteId: arguments_.siteId,
        reviewId: arguments_.reviewId,
        canonical: arguments_.canonical,
        expectedVersion: arguments_.expectedVersion,
        payload: parsedPayload,
        nextStep:
          "Re-read the exact record and migration state, inspect this payload, then rerun with DATABASE_URL set and --apply. Apply mode creates the normal PageReview revision in one serializable transaction.",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required with --apply");
}

const prisma = new PrismaClient();
const allowedResearchStates = new Set([
  "AWAITING_USER_SELECTION",
  "RESEARCHING",
  "AWAITING_USER_DECISION",
]);

try {
  const result = await prisma.$transaction(
    async (transaction) => {
      const site = await transaction.site.findUnique({
        where: { id: arguments_.siteId },
        select: { id: true, userId: true, domain: true },
      });
      if (!site) throw new Error("The exact site ID does not exist");

      const current = await transaction.pageReview.findFirst({
        where: {
          id: arguments_.reviewId,
          siteId: arguments_.siteId,
          canonicalUrl: arguments_.canonical,
          deletedAt: null,
        },
      });
      if (!current) {
        throw new Error("The exact current site/review/canonical record does not exist");
      }
      if (current.version !== arguments_.expectedVersion) {
        throw new Error(
          `Version conflict: expected ${arguments_.expectedVersion}, current ${current.version}`,
        );
      }
      if (!allowedResearchStates.has(current.manualChatState)) {
        throw new Error(
          `Refusing to change an approved, monitoring, or complete record (${current.manualChatState})`,
        );
      }
      if (
        current.userDecisionReference ||
        current.decisionState !== "PENDING" ||
        current.changeState !== "NOT_PLANNED"
      ) {
        throw new Error(
          "Refusing to overwrite a decided, implementation-linked, or user-approved record",
        );
      }

      const normalized = normalizePageReviewPatch(
        parsedPayload,
        current,
        site.domain,
      );
      if (!allowedResearchStates.has(normalized.manualChatState)) {
        throw new Error("Refusing a payload that would enter an approved state");
      }
      if (
        normalized.userDecisionReference ||
        normalized.decisionState !== "PENDING" ||
        normalized.changeState !== "NOT_PLANNED"
      ) {
        throw new Error(
          "Refusing a normalized draft with approval or implementation fields",
        );
      }

      if (
        normalized.keywordOwnership === "THIS_PAGE" &&
        normalized.primaryKeywordNormalized
      ) {
        const owner = await transaction.pageReview.findFirst({
          where: {
            siteId: arguments_.siteId,
            id: { not: arguments_.reviewId },
            deletedAt: null,
            keywordOwnership: "THIS_PAGE",
            primaryKeywordNormalized: normalized.primaryKeywordNormalized,
          },
          select: { canonicalUrl: true },
        });
        if (owner) {
          throw new Error(`Primary-query owner conflict with ${owner.canonicalUrl}`);
        }
      }

      if (isActiveManualChatState(normalized.manualChatState)) {
        const active = await transaction.pageReview.findFirst({
          where: {
            siteId: arguments_.siteId,
            id: { not: arguments_.reviewId },
            deletedAt: null,
            manualChatState: {
              in: activeManualChatStateValues.map(
                (value) => apiEnumToDb(value),
              ) as Prisma.EnumManualChatStateFilter["in"],
            },
          },
          select: { canonicalUrl: true },
        });
        if (active) {
          throw new Error(
            `Another page is already active in manual review: ${active.canonicalUrl}`,
          );
        }
      }

      const changedFields = semanticChangedReviewFields(normalized, current);
      if (changedFields.length === 0) {
        return { review: current, revisionId: null, changedFields };
      }

      const updated = await transaction.pageReview.updateMany({
        where: {
          id: arguments_.reviewId,
          siteId: arguments_.siteId,
          canonicalUrl: arguments_.canonical,
          version: arguments_.expectedVersion,
          deletedAt: null,
        },
        data: {
          ...normalized,
          version: { increment: 1 },
        } as Prisma.PageReviewUncheckedUpdateManyInput,
      });
      if (updated.count !== 1) {
        throw new Error("Version conflict while writing the research draft");
      }

      const review = await transaction.pageReview.findUniqueOrThrow({
        where: { id: arguments_.reviewId },
      });
      const revision = await transaction.pageReviewRevision.create({
        data: {
          siteId: arguments_.siteId,
          reviewId: arguments_.reviewId,
          version: review.version,
          changeType: "UPDATED",
          changedFields,
          snapshot: pageReviewToApi(review) as Prisma.InputJsonValue,
          changeNote: parsedPayload.changeNote,
          changedByUserId: site.userId,
        },
      });
      return { review, revisionId: revision.id, changedFields };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  const review = result.review as PageReview;
  if (review.manualChatState !== "RESEARCHING") {
    throw new Error("The saved record did not remain research-only");
  }
  if (result.changedFields.length > 0 && !result.revisionId) {
    throw new Error("The review changed without a revision");
  }
  console.log(
    JSON.stringify(
      {
        mode: "applied",
        siteId: review.siteId,
        reviewId: review.id,
        canonical: review.canonicalUrl,
        version: review.version,
        reviewStatus: review.reviewStatus,
        manualChatState: review.manualChatState,
        changedFields: result.changedFields,
        revisionCreated: Boolean(result.revisionId),
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
