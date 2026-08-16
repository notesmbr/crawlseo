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

const SITE_ID = "cmslxpgoq000co801hmlq1zj3";
const REVIEW_ID = "b44cb02b-4d3a-48e1-bdf7-78bdeaedb237";
const CANONICAL =
  "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river";
const PRIMARY_QUERY = "lochsa river fishing report";
const APPROVAL_REFERENCE =
  'Codex task on 2026-08-16: user approved "okay do the loscha page changes" after approving the comprehensive Lochsa rerun and the shared river-template plan.';

function expectedVersion() {
  const marker = process.argv.indexOf("--expected-version");
  const value = Number(marker >= 0 ? process.argv[marker + 1] : NaN);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(
      "Usage: node --experimental-strip-types scripts/apply-lochsa-page-review-approval.mts --expected-version VERSION [--apply]",
    );
  }
  return value;
}

const version = expectedVersion();
const apply = process.argv.includes("--apply");
const reviewedAt = "2026-08-16T16:30:00.000Z";

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required for dry-run and apply modes");
}

const prisma = new PrismaClient();

function buildPayload(current: PageReview) {
  const review = pageReviewToApi(current);
  const payload = {
    expectedVersion: version,
    reviewStatus: "ready_to_change",
    priority: "p1",
    keyword: {
      ...review.keyword,
      status: "this_page",
      primaryQuery: PRIMARY_QUERY,
      secondaryQueries: [
        "lochsa river fishing report today",
        "lochsa river fly fishing report",
        "lochsa river fishing regulations",
        "lochsa river fishing spots",
        "lochsa river map",
        "lochsa river fish species",
      ],
    },
    topic: {
      ...review.topic,
      cluster: "Clearwater–Lochsa–Selway river reports",
      parentPage: "https://bluestreamfly.com/fly-fishing-reports/idaho",
      clusterGaps: [
        "The report now links to Clearwater, South Fork Clearwater, and Little Salmon alternatives; a dedicated Selway report is not in the current inventory.",
        "The main report directory now includes a contextual Lochsa link; additional regional links should be earned only where they help the reader.",
        "Owned or licensed Lochsa field photography and Core Web Vitals evidence remain unavailable.",
      ],
      maintenanceOwner: "BlueStreamFly river-report maintenance team",
      editorialOwner: "BlueStreamFly River Review Team",
    },
    intent: {
      searchIntent: "local_trip_planning",
      jobToBeDone:
        "Decide whether the Lochsa is worth the drive today, then verify the correct Highway 12 reach, flow, weather, safe access, current rules, and fishing approach.",
    },
    googleTrends: {
      evidenceState: "partial",
      query: PRIMARY_QUERY,
      checkedAt: reviewedAt,
      method: "manual_google_trends",
      sourceUrl:
        "https://trends.google.com/trends/explore?date=today%2012-m&geo=US&q=lochsa%20river%20fishing%20report,lochsa%20river%20fishing",
      geo: "United States",
      timeframe: "Past 12 months · Web Search",
      comparisonQueries: ["lochsa river fishing"],
      direction: "insufficient_data",
      finding:
        "The exact query averaged relative interest 0 and the broader comparison averaged 3, with two sparse August spikes. This is too little evidence to establish dependable demand or seasonality.",
      limitation:
        "Google Trends is relative and the exact query has insufficient data for regional or related-query detail; a zero display is not proof of zero searches.",
      notApplicableReason: null,
    },
    measurementPlan: {
      ...review.measurementPlan,
      evidenceState: "partial",
      ga4: {
        evidenceState: "partial",
        checkedAt: "2026-08-15T16:17:00.000Z",
        method: "manual_ga4_report",
        sourceUrl: "https://analytics.google.com/",
        screenPageViews: null,
        sessions: null,
        engagedSessions: null,
        activeUsers: null,
        keyEvents: null,
        limitation:
          "Production network testing verified one canonical page_view plus finder and official-source event delivery without duplicate destination page views, but GA4 account-level aggregates are not yet imported into CrawlSEO.",
        notApplicableReason: null,
      },
      hypothesis:
        "Current official reach and season evidence, direct access/map actions, transparent organizational review ownership, simpler Lochsa guidance, and useful regional links will increase qualified organic visits and official-source actions without sacrificing exact-query ownership.",
      guardrails: [
        "Preserve the exact canonical, slug, title, H1, indexability, and primary-query ownership.",
        "Do not remove useful condition, tactic, hatch, fly, access, source, or FAQ information.",
        "Do not claim current rules, legal access, water temperature, or first-hand experience without direct evidence.",
        "Keep official agencies separate from secondary tools and keep one clear action per source.",
        "Treat low-volume or mixed 28-day results as inconclusive.",
        "Rollback for a safety, indexability, schema, broken-link, analytics, or material rendering regression.",
      ],
      limitation:
        "GSC detailed query rows omit anonymized traffic, so canonical Page totals remain the primary baseline. GA4 collection is verified at the network level, but canonical account aggregates and Core Web Vitals are not yet available in CrawlSEO.",
    },
    serp: {
      snapshotAt: "2026-08-16T11:45:00.000Z",
      query: PRIMARY_QUERY,
      locale: "United States · English · Hollidaysburg, Pennsylvania",
      device: "desktop",
      method: "manual_google",
      competition: "medium",
      evidenceState: "partial",
      evidenceSummary:
        "A signed-out desktop Google snapshot showed Idaho Fish and Game, a current regional fly-shop report, a Facebook community thread, RiverReports, and Lochsa Lodge in the first five organic positions. Four exact destination URLs were retained and rechecked; the Facebook destination was not retained, so this structured snapshot is partial rather than falsely complete.",
      features: [
        "AI Overview",
        "Video",
        "People Also Ask",
        "Forums/community result",
        "Related searches",
      ],
      competitionSummary:
        "Medium organic competition: the SERP mixes the official regulator, a fresh local shop, a community result, a utility, and a locally experienced lodge. BlueStreamFly can win on one-page trip completeness and source clarity, but it should not try to out-authority the regulator or invent local experience.",
      results: [
        {
          position: 1,
          url: "https://idfg.idaho.gov/ifwis/fishingplanner/water/1155987461400",
          title: "Lochsa River | Idaho Fishing Planner",
          offer:
            "Official reach rules, species, facilities, interactive map, and direct flow source.",
          evidence:
            "Primary regulator and map owner; strongest authority for current Idaho fishing rules.",
          gap: "Not a complete current fly-fishing trip plan.",
        },
        {
          position: 2,
          url: "https://houseoffly.com/clearwater-river-fly-fishing-report",
          title: "Clearwater River Fly Fishing Report",
          offer:
            "Recently dated regional conditions, Lochsa flow context, flies, and tactics.",
          evidence:
            "Current regional fly shop with practical fishing context.",
          gap:
            "Regional rather than Lochsa-specific; lighter on reach rules, direct access actions, and source traceability.",
        },
        {
          position: 4,
          url: "https://www.riverreports.com/states/id/sites/d99765de-ead9-4c10-a85a-63598dc39546",
          title: "Lochsa River near Lowell",
          offer: "Fast flow, weather, and river-history utility.",
          evidence: "Exact gauge-oriented utility with quick current context.",
          gap:
            "Secondary tool with no complete official rules, access plan, or transparent local review.",
        },
        {
          position: 5,
          url: "https://www.lochsalodge.com/fly-fishing-lochsa-river/",
          title: "Fly Fishing the Lochsa River: What You Need To Know",
          offer:
            "Named local voices, real place photography, hatches, gear, access, and practical river context.",
          evidence: "Visible local identity and first-hand place experience.",
          gap: "Evergreen guide rather than live conditions and current rules.",
        },
      ],
    },
    offer: {
      competitorOffer:
        "Competitors split the job: Idaho Fish and Game owns official rules and mapping; House of Fly provides fresh regional fishing context; RiverReports provides a quick gauge utility; community and lodge pages add local experience.",
      currentOffer:
        "BlueStreamFly now combines the trip decision, official flow and weather, two plain-language rule reaches, current 2026 Chinook status, direct official map/KMZ/access actions, tactics, complete seasonal hatches, fly guides, regional alternatives, source labels, and a transparent organizational review trail.",
      differentiation:
        "Provide the easiest evidence-backed one-page Lochsa trip plan: preserve the exact-query asset, make the correct reach and official source obvious, expose uncertainty, and never substitute invented first-hand experience for agency or field evidence.",
      differentiationEvidenceState: "verified",
    },
    eeat: {
      evidence: [
        "The report separates official IDFG, USGS, National Weather Service, and Forest Service sources from the secondary RiverReports tool.",
        "The report shows two IDFG trout-rule reaches, the closed 2026 Chinook season, direct official map/KMZ/access actions, and an August 16 review date.",
        "BlueStreamFly River Review Team is shown as a transparent organizational owner with a published method, correction route, and explicit no-first-hand-experience limitation.",
        "The generated hero is disclosed as generated and not an exact-location photograph.",
      ],
      gaps: [
        "No owned or licensed Lochsa field photograph or documented first-hand river visit is available.",
        "No official water-temperature reading is attached to this report.",
        "Core Web Vitals and GA4 canonical account aggregates remain missing from CrawlSEO.",
      ],
      details: [
        {
          evidence:
            "IDFG documents the lower and upper Lochsa trout-rule reaches, facilities, species, map, and official flow link.",
          source:
            "https://idfg.idaho.gov/ifwis/fishingplanner/water/1155987461400",
          checkedAt: reviewedAt,
          reviewer: "BlueStreamFly River Review Team",
          limitation:
            "The planner is authoritative for listed rules, but current notices and posted signs still control in the field.",
        },
        {
          evidence:
            "IDFG lists the 2026 Lowell Bridge–Twin Bridges Chinook season as closed after August 10.",
          source:
            "https://idfg.idaho.gov/fish/chinook/rules/spring-run/lochsa-river-lowell-bridge-twin-bridges-summer-2026",
          checkedAt: reviewedAt,
          reviewer: "BlueStreamFly River Review Team",
          limitation:
            "Species seasons are time-sensitive and must be rechecked before fishing.",
        },
        {
          evidence:
            "Forest Service pages verify Wilderness Gateway, Knife Edge, White Pine, and the Highway 12 corridor as the official access evidence used in the report.",
          source:
            "https://www.fs.usda.gov/r01/nezperce-clearwater/recreation/lochsa-highway-12-corridor",
          checkedAt: reviewedAt,
          reviewer: "BlueStreamFly River Review Team",
          limitation:
            "A named site does not prove safe entry, parking availability, launch suitability, or conditions on arrival.",
        },
        {
          evidence:
            "The local production build passed 691 routes and rendered the new access/reach UI at 1440px and 390px without overflow.",
          source: CANONICAL,
          checkedAt: reviewedAt,
          reviewer: "BlueStreamFly River Review Team",
          limitation:
            "These implementation changes are locally verified but are not described as live until a separate production deployment is completed.",
        },
      ],
      evidenceState: "partial",
    },
    decision: {
      state: "change_recommended",
      rationale:
        "Lochsa is a demonstrated search asset, but the review found connected rule, season-status, access, source-trust, accountability, regional-link, and plain-language gaps. A narrow edit would leave material trip-planning problems unresolved.",
      proposedChange:
        "Implement the comprehensive Lochsa improvement: preserve the working SEO identity; add verified IDFG reach and 2026 season status; build direct official map, KMZ, and access actions; simplify the Lochsa plan; show useful Clearwater-area alternatives; add a directory link; and use the transparent BlueStreamFly River Review Team method without inventing field experience. Retain the shared all-river safety, source, freshness, time-zone, and review-trail template safeguards.",
      performanceState: "demonstrated_winner",
      scopeClass: "comprehensive",
      scopeRationale:
        "Several connected page-local and shared-template failures affect safety, trust, scanning, and trip usefulness. Comprehensive work is the minimum sufficient scope, while the working URL, title, H1, keyword owner, and complete report depth remain protected.",
      demonstratedWins: [
        "Latest finalized 28 days: exact query 3 clicks, 27 impressions, 11.11% CTR, and average position 5.93.",
        "Latest finalized 28 days: canonical 9 clicks and 97 impressions.",
        "Latest crawl found a 200 indexable self-canonical page with one H1, schema, complete content, and no Lochsa crawl issue.",
      ],
      preservedElements: [
        "Canonical URL, slug, exact-match title, aligned H1, indexability, and primary keyword owner.",
        "Complete decision, condition, tactic, hatch, fly, access, source, and FAQ depth.",
        "Direct USGS, IDFG, National Weather Service, and Forest Service evidence plus the generated-image disclosure.",
      ],
      intentionallyChangedElements: [
        "Lochsa current report, rules, species status, access plan, official map tools, sources, regional alternatives, inbound directory link, checked date, and difficult prose.",
        "Reusable river-report reach/access presentation and the already-approved shared safety, source, freshness, local-time, and organizational-review safeguards.",
      ],
      blastRadius: "mixed",
      affectedPageFamily: "river_report",
      affectedCanonicalCount: 459,
      blastRadiusNote:
        "Lochsa facts, rule reaches, map/access tools, regional links, and prose are page-local. Optional reusable reach/access rendering and the shared trust/safety/source safeguards apply to the river-report family without adding Lochsa content to other rivers.",
      experimentState: "approved_contamination",
      experimentId: "river-report-keyword-test-2026-08-10",
      experimentFrozenUntil: "2026-10-05T23:59:59.000Z",
      experimentExceptionReason:
        "The user explicitly approved proceeding on 2026-08-16 before the October 5 confirmation read because the connected factual, safety, access, trust, and user-value gaps require the full repair now. Preserve the pre-change GSC baseline and restart outcome measurement after deployment.",
      rollbackTrigger:
        "Rollback immediately for a safety, factual, indexability, canonical, schema, broken-source, analytics, or rendering regression. Reassess the SEO/content portion if the next finalized 28-day primary-query position worsens by more than three places and clicks and impressions also decline without an offsetting engagement or trust benefit.",
      changeState: "in_progress",
      changeId: null,
      changedAt: null,
    },
    manualReview: {
      firstReviewedAt:
        review.manualReview.firstReviewedAt ?? "2026-08-15T16:00:00.000Z",
      lastReviewedAt: reviewedAt,
      nextReviewAt: "2026-08-23T16:30:00.000Z",
      notes:
        "User approved the comprehensive Lochsa scope. Source/content/template implementation is locally complete and verified; production deployment is still separate. Keyword Planner remains partial because approved Google Ads credentials are not configured. Google Trends is partial due insufficient exact-query data. GA4 collection is verified at the network level, while account aggregates and Core Web Vitals remain unavailable in CrawlSEO.",
    },
    manualChatState: "approved_to_implement",
    userDecisionReference: APPROVAL_REFERENCE,
    changeNote:
      "Record the user-approved comprehensive Lochsa implementation, SERP/keyword/Trends evidence, transparent organizational E-E-A-T, experiment contamination, protected wins, and local QA. The change remains in progress until deployed and verified live.",
  };
  return patchPageReviewSchema.parse(payload);
}

try {
  const current = await prisma.pageReview.findFirstOrThrow({
    where: {
      id: REVIEW_ID,
      siteId: SITE_ID,
      canonicalUrl: CANONICAL,
      deletedAt: null,
    },
  });
  if (current.version !== version) {
    throw new Error(
      `Version conflict: expected ${version}, current ${current.version}`,
    );
  }
  const parsedPayload = buildPayload(current);
  const normalizedPreview = normalizePageReviewPatch(
    parsedPayload,
    current,
    "bluestreamfly.com",
  );

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          reviewId: REVIEW_ID,
          expectedVersion: version,
          nextVersion: version + 1,
          manualChatState: normalizedPreview.manualChatState,
          decisionState: normalizedPreview.decisionState,
          changeState: normalizedPreview.changeState,
          experimentState: normalizedPreview.experimentState,
          changedFields: semanticChangedReviewFields(normalizedPreview, current),
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const result = await prisma.$transaction(
    async (transaction) => {
      const site = await transaction.site.findUniqueOrThrow({
        where: { id: SITE_ID },
        select: { id: true, userId: true, domain: true },
      });
      const locked = await transaction.pageReview.findFirstOrThrow({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: CANONICAL,
          deletedAt: null,
        },
      });
      if (locked.version !== version) {
        throw new Error(
          `Version conflict: expected ${version}, current ${locked.version}`,
        );
      }
      if (
        !["RESEARCHING", "AWAITING_USER_DECISION"].includes(
          locked.manualChatState,
        ) ||
        locked.userDecisionReference ||
        locked.decisionState !== "PENDING" ||
        locked.changeState !== "NOT_PLANNED"
      ) {
        throw new Error(
          "Refusing to replace a decided, already-approved, or implementation-linked review",
        );
      }

      const parsed = buildPayload(locked);
      const normalized = normalizePageReviewPatch(parsed, locked, site.domain);
      assert.equal(normalized.manualChatState, "APPROVED_TO_IMPLEMENT");
      assert.equal(normalized.decisionState, "CHANGE_RECOMMENDED");
      assert.equal(normalized.changeState, "IN_PROGRESS");
      assert.equal(normalized.experimentState, "APPROVED_CONTAMINATION");

      const owner = await transaction.pageReview.findFirst({
        where: {
          siteId: SITE_ID,
          id: { not: REVIEW_ID },
          deletedAt: null,
          keywordOwnership: "THIS_PAGE",
          primaryKeywordNormalized: PRIMARY_QUERY,
        },
        select: { canonicalUrl: true },
      });
      if (owner) {
        throw new Error(`Primary-query owner conflict with ${owner.canonicalUrl}`);
      }

      if (isActiveManualChatState(normalized.manualChatState)) {
        const competingActive = await transaction.pageReview.findFirst({
          where: {
            siteId: SITE_ID,
            id: { not: REVIEW_ID },
            deletedAt: null,
            manualChatState: {
              in: activeManualChatStateValues.map(
                (value) => apiEnumToDb(value),
              ) as Prisma.EnumManualChatStateFilter["in"],
            },
          },
          select: { canonicalUrl: true },
        });
        if (competingActive) {
          throw new Error(
            `Another page is active: ${competingActive.canonicalUrl}`,
          );
        }
      }

      const changedFields = semanticChangedReviewFields(normalized, locked);
      if (changedFields.length === 0) {
        throw new Error("The approved payload produced no semantic change");
      }

      const update = await transaction.pageReview.updateMany({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: CANONICAL,
          version,
          deletedAt: null,
        },
        data: {
          ...normalized,
          version: { increment: 1 },
        } as Prisma.PageReviewUncheckedUpdateManyInput,
      });
      if (update.count !== 1) {
        throw new Error("Version conflict while applying the approved review");
      }

      const updated = await transaction.pageReview.findUniqueOrThrow({
        where: { id: REVIEW_ID },
      });
      const revision = await transaction.pageReviewRevision.create({
        data: {
          siteId: SITE_ID,
          reviewId: REVIEW_ID,
          version: updated.version,
          changeType: "UPDATED",
          changedFields,
          snapshot: pageReviewToApi(updated) as Prisma.InputJsonValue,
          changeNote: parsed.changeNote,
          changedByUserId: site.userId,
        },
      });
      return { updated, revision, changedFields };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  console.log(
    JSON.stringify(
      {
        mode: "applied",
        reviewId: result.updated.id,
        version: result.updated.version,
        reviewStatus: result.updated.reviewStatus,
        manualChatState: result.updated.manualChatState,
        decisionState: result.updated.decisionState,
        changeState: result.updated.changeState,
        experimentState: result.updated.experimentState,
        changedFields: result.changedFields,
        revisionId: result.revision.id,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
