import { Prisma, PrismaClient, type PageReview } from "@prisma/client";

import {
  normalizePageReviewPatch,
  pageReviewToApi,
  patchPageReviewSchema,
} from "../lib/page-reviews.ts";

const SITE_ID = "cmslxpgoq000co801hmlq1zj3";
const REVIEW_ID = "b44cb02b-4d3a-48e1-bdf7-78bdeaedb237";
const CANONICAL =
  "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river";
const REPORT_DIRECTORY = "https://bluestreamfly.com/fly-fishing-reports";
const IMAGE_URL =
  "https://bluestreamfly.com/images/report-heroes/idaho-lochsa-river-usfs.webp";
const IMAGE_SOURCE_URL =
  "https://commons.wikimedia.org/wiki/File:Lochsa_River_in_Clearwater_NF.jpg";
const GOOGLE_QUERY_URL =
  "https://www.google.com/search?q=lochsa+river+fishing+report&hl=en&gl=us&pws=0";
const CRAWL_ID = "cmswdn4ij0wy5n101tm4sezm2";
const SERP_CHECKED_AT = "2026-08-16T11:45:00.000Z";
const MEDIA_CHECKED_AT = "2026-08-16T22:10:07.000Z";
const PRODUCTION_CHECKED_AT = "2026-08-16T22:29:28.488Z";
const META_DESCRIPTION =
  "Lochsa River fishing report: get a clear trip recommendation, current flow and weather, Idaho rules, Highway 12 access, hatches, flies, and tactics.";
const CHANGED_FIELDS = [
  "mediaAccuracy",
  "searchAppearance",
  "readabilityUserFriendliness",
  "technicalSnapshot",
] as const;

function argumentValue(name: string) {
  const directIndex = process.argv.indexOf(name);
  if (directIndex >= 0) return process.argv[directIndex + 1] ?? null;
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
}

const requestedCanonical = argumentValue("--canonical");
const expectedVersion = Number(argumentValue("--version"));
const apply = process.argv.includes("--apply");

if (
  requestedCanonical !== CANONICAL ||
  !Number.isSafeInteger(expectedVersion) ||
  expectedVersion < 1
) {
  throw new Error(
    `Usage: node --experimental-strip-types scripts/backfill-lochsa-structured-review-evidence.mts --canonical ${CANONICAL} --version VERSION [--apply]`,
  );
}
if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required for both dry-run and apply mode");
}

const prisma = new PrismaClient();

function payloadFor(current: PageReview) {
  const review = pageReviewToApi(current);
  return patchPageReviewSchema.parse({
    expectedVersion,
    mediaAccuracy: {
      evidenceState: "verified",
      checkedAt: MEDIA_CHECKED_AT,
      reviewer: "BlueStreamFly River Review Team",
      sources: [
        {
          label: "U.S. Forest Service Northern Region photograph source record",
          url: IMAGE_SOURCE_URL,
          checkedAt: MEDIA_CHECKED_AT,
        },
        {
          label: "Production Lochsa hero and attribution render",
          url: CANONICAL,
          checkedAt: PRODUCTION_CHECKED_AT,
        },
      ],
      finding:
        "The meaningful editorial image is a genuine Lochsa River photograph, the production hero and social preview use the same asset, and its subject, source, license, attribution, alt text, and desktop/mobile rendering were checked.",
      limitation:
        "The August 5, 2011 photograph is historical place evidence. It does not prove today's conditions, a precise fishing access point, or a BlueStreamFly field visit.",
      notApplicableReason: null,
      inventoryComplete: true,
      assets: [
        {
          placement: "Hero and Open Graph/Twitter social preview",
          assetUrl: IMAGE_URL,
          sourceUrl: IMAGE_SOURCE_URL,
          subjectLocation: "Lochsa River in Clearwater National Forest, Idaho",
          creator: "U.S. Forest Service Northern Region",
          capturedAt: "2011-08-05",
          licenseOrPermission: "CC BY 2.0",
          attribution:
            "U.S. Forest Service Northern Region; source and CC BY 2.0 label displayed on the report",
          altText:
            "Lochsa River flowing through the forested Clearwater National Forest in Idaho",
          caption: null,
          accuracyStatus: "pass",
          relevanceStatus: "pass",
          desktopRenderStatus: "pass",
          mobileRenderStatus: "pass",
          limitation:
            "Representative historical place photograph; not a live-conditions image.",
        },
      ],
    },
    searchAppearance: {
      evidenceState: "partial",
      checkedAt: PRODUCTION_CHECKED_AT,
      reviewer: "BlueStreamFly River Review Team",
      sources: [
        {
          label: "Rendered production metadata",
          url: CANONICAL,
          checkedAt: PRODUCTION_CHECKED_AT,
        },
        {
          label: "Signed-out Google query used for the dated SERP review (dynamic, not archival)",
          url: GOOGLE_QUERY_URL,
          checkedAt: SERP_CHECKED_AT,
        },
      ],
      finding:
        "Production renders the approved exact-query title, 148-character meta description, canonical, matching social descriptions, and verified Lochsa social image. The user-supplied Google result selected an older dynamic Flow body passage instead of the meta description.",
      limitation:
        "The pasted Google result did not preserve a screenshot, exact time, device, or location, and it did not clearly separate Google's site-name label from the title link. Google had not yet reprocessed the new metadata, so the displayed-result evidence remains partial.",
      notApplicableReason: null,
      rendered: {
        title: "Lochsa River Fishing Report | Idaho",
        metaDescription: META_DESCRIPTION,
        canonical: CANONICAL,
        openGraphTitle: "Lochsa River Fishing Report | Idaho",
        openGraphDescription: META_DESCRIPTION,
        twitterTitle: "Lochsa River Fishing Report | Idaho",
        twitterDescription: META_DESCRIPTION,
        socialImage: IMAGE_URL,
      },
      google: {
        query: "lochsa river fishing report",
        locale: null,
        device: null,
        displayedTitle: null,
        displayedSnippet:
          "USGS shows 576 cfs with a stable over about 6 hours trend. same-date USGS history (1911-2025, 98 readings) puts the normal middle range around 527 cfs-809 cfs.",
        snippetSource: "body_passage",
        bodyPassage:
          "USGS shows 576 cfs with a stable over about 6 hours trend. same-date USGS history (1911-2025, 98 readings) puts the normal middle range around 527 cfs-809 cfs.",
        titleRewrite: null,
        reprocessingStatus: "stale",
      },
      competitorPatterns: [
        {
          url: "https://idfg.idaho.gov/ifwis/fishingplanner/water/1155987461400",
          title: "Lochsa River | Idaho Fishing Planner",
          snippet: null,
          pattern:
            "Exact water identity with official rules, facilities, species, map, and flow-source authority.",
        },
        {
          url: "https://houseoffly.com/clearwater-river-fly-fishing-report",
          title: "Clearwater River Fly Fishing Report",
          snippet: null,
          pattern:
            "Fresh regional report with current Lochsa context, flies, and tactics.",
        },
        {
          url: "https://www.riverreports.com/states/id/sites/d99765de-ead9-4c10-a85a-63598dc39546",
          title: "Lochsa River near Lowell",
          snippet: null,
          pattern: "Exact gauge location with quick flow, weather, and history utility.",
        },
        {
          url: "https://www.lochsalodge.com/fly-fishing-lochsa-river/",
          title: "Fly Fishing the Lochsa River: What You Need To Know",
          snippet: null,
          pattern:
            "How-to framing with visible date, named local voices, real photography, hatches, gear, and access context.",
        },
      ],
      proposedTitle: null,
      proposedMetaDescription: null,
    },
    readabilityUserFriendliness: {
      evidenceState: "verified",
      checkedAt: PRODUCTION_CHECKED_AT,
      reviewer: "BlueStreamFly River Review Team",
      sources: [
        {
          label: "Production Lochsa desktop and 390px mobile review",
          url: CANONICAL,
          checkedAt: PRODUCTION_CHECKED_AT,
        },
      ],
      finding:
        "The report leads with a direct fishing decision, uses plain-language reach and safety guidance, exposes official actions, and was checked on desktop and a 390px mobile viewport without overflow.",
      limitation:
        "The accessibility finding covers the recorded heading, alt-text, action-label, and rendering checks; it is not a comprehensive WCAG conformance audit or real-user usability study.",
      notApplicableReason: null,
      checks: {
        answerFirst: {
          status: "pass",
          finding:
            "The first decision gives the direct answer ‘Good fishing’ and ‘Yes. Fishing looks good’ before supporting evidence.",
        },
        plainLanguage: {
          status: "pass",
          finding:
            "Previously difficult phrases were replaced with simpler flow, reach, wading, and presentation guidance.",
        },
        informationHierarchy: {
          status: "pass",
          finding:
            "Decision, condition evidence, trip plan, rules, access, tactics, sources, and limitations are separated into clear sections.",
        },
        scannability: {
          status: "pass",
          finding:
            "Reach choices, stop conditions, access actions, current rule status, and alternatives can be scanned without reading the full report.",
        },
        jargonExplained: {
          status: "pass",
          finding:
            "Technical fishing phrases identified in the review were rewritten or given practical context.",
        },
        actionClarity: {
          status: "pass",
          finding:
            "The page provides direct IDFG map/KMZ, Forest Service access, rules, source, and correction actions.",
        },
        accessibility: {
          status: "issue",
          finding:
            "The crawl recorded one H1 and zero images missing alt text, and the reviewed controls are labeled; a full WCAG audit remains outside this evidence.",
        },
        desktopUsability: {
          status: "pass",
          finding:
            "The production desktop render was reviewed without overflow and retained visible image credit and the full trip-planning path.",
        },
        mobileUsability: {
          status: "pass",
          finding:
            "The production page was reviewed at 390px without overflow, and the decision, access actions, and hero credit remained usable.",
        },
      },
    },
    technicalSnapshot: {
      evidenceState: "partial",
      checkedAt: PRODUCTION_CHECKED_AT,
      reviewer: "BlueStreamFly River Review Team",
      sources: [
        {
          label: `Production canonical verified by post-deploy crawl ${CRAWL_ID}`,
          url: CANONICAL,
          checkedAt: PRODUCTION_CHECKED_AT,
        },
        {
          label: "Confirmed contextual inbound link from the report directory",
          url: REPORT_DIRECTORY,
          checkedAt: PRODUCTION_CHECKED_AT,
        },
      ],
      finding:
        `Post-deploy crawl ${CRAWL_ID} fetched the Lochsa canonical as a 200, indexable, self-canonical page with schema, 20 outbound internal links, one H1, complete image alt coverage, and no verified critical or warning finding.`,
      limitation:
        "The legacy evidence did not persist a final total for inbound internal links or all source/anchor rows. CrawlSEO also had no Lochsa Core Web Vitals row or canonical GA4 aggregate; those absences are recorded as missing, never as zero.",
      notApplicableReason: null,
      crawl: {
        crawlId: CRAWL_ID,
        crawledAt: PRODUCTION_CHECKED_AT,
        status: "completed",
        pageStatusCode: 200,
        indexable: true,
        canonical: CANONICAL,
        schemaTypes: [
          "Article",
          "BreadcrumbList",
          "ImageObject",
          "ListItem",
          "Organization",
          "Place",
          "PostalAddress",
          "Thing",
          "WebPage",
          "WebSite",
        ],
        internalLinksOut: 20,
        inboundInternalLinks: null,
        inboundSources: [
          {
            sourceUrl: REPORT_DIRECTORY,
            anchors: [
              "Featured Idaho trip plan Lochsa River fishing report Check the Lowell flow, two Highway 12 trout-rule reaches, official access pages, and the current trip decision. Open the Lochsa report",
            ],
          },
        ],
        orphanStatus: "not_orphan",
        brokenLinkStatus: "none_found",
        brokenLinks: [],
        missingReason:
          "The legacy crawl stored the page's outbound internal-link count but did not persist a finalized inbound total on PageReview. One documented directory source and anchor are included; the unknown total is not encoded as zero.",
      },
      cwv: {
        evidenceState: "missing",
        sourceUrl: null,
        device: null,
        checkedAt: null,
        lcp: null,
        inp: null,
        cls: null,
        missingReason:
          "CrawlSEO had no Lochsa VitalsReport row at the recorded production check; no LCP, INP, or CLS value is inferred.",
      },
    },
    changeNote:
      "Backfill source-backed media, search-appearance, readability, and technical evidence for the already shipped Lochsa review without changing monitoring state or outcome-gate dates.",
    // Keep these reads explicit so an unexpected legacy row cannot be mistaken for
    // a generic backfill target when reviewing the dry-run payload.
    userDecisionReference: review.userDecisionReference,
  });
}

const preservedStateFields = [
  "reviewStatus",
  "manualChatState",
  "changeState",
  "changeId",
  "changedAt",
  "day7State",
  "day7DueAt",
  "day7ReviewedAt",
  "day7Evidence",
  "day7Decision",
  "day7Rationale",
  "day7NextAction",
  "day28State",
  "day28DueAt",
  "day28ReviewedAt",
  "day28Evidence",
  "day28Decision",
  "day28Rationale",
  "day28NextAction",
  "day56State",
  "day56DueAt",
  "day56ReviewedAt",
  "day56Evidence",
  "day56Decision",
  "day56Rationale",
  "day56NextAction",
] as const;

function preservedStateFingerprint(value: object) {
  const record = value as Record<string, unknown>;
  return JSON.stringify(
    Object.fromEntries(
      preservedStateFields.map((field) => [field, record[field] ?? null]),
    ),
  );
}

function assertExpectedCurrentState(current: PageReview) {
  if (
    current.id !== REVIEW_ID ||
    current.siteId !== SITE_ID ||
    current.canonicalUrl !== CANONICAL ||
    current.version !== expectedVersion
  ) {
    throw new Error(
      `Version/canonical guard failed: expected ${CANONICAL} v${expectedVersion}, found ${current.canonicalUrl} v${current.version}`,
    );
  }
  if (
    current.reviewStatus !== "MONITORING" ||
    current.manualChatState !== "MONITORING" ||
    current.changeState !== "SHIPPED"
  ) {
    throw new Error("Refusing to backfill a Lochsa review outside monitoring/shipped state");
  }
  for (const [stateField, detailsField] of [
    ["mediaAccuracyEvidenceState", "mediaAccuracyDetails"],
    ["searchAppearanceEvidenceState", "searchAppearanceDetails"],
    ["readabilityUserFriendlinessEvidenceState", "readabilityUserFriendlinessDetails"],
    ["technicalSnapshotEvidenceState", "technicalSnapshotDetails"],
  ] as const) {
    if (current[stateField] !== "MISSING" || current[detailsField] !== null) {
      throw new Error(`${stateField} is already populated; refusing to overwrite it`);
    }
  }
}

function normalizeAndValidate(current: PageReview, domain: string) {
  assertExpectedCurrentState(current);
  const payload = payloadFor(current);
  const normalized = normalizePageReviewPatch(payload, current, domain);
  if (
    preservedStateFingerprint(current) !== preservedStateFingerprint(normalized)
  ) {
    throw new Error("The structured-evidence payload would alter monitoring or gate state");
  }
  // The legacy Lochsa row predates several normalized JSON defaults. Running
  // the whole row through today's parser can therefore make untouched legacy
  // groups look semantically different even though this update never writes
  // them. Keep the revision audit truthful by naming exactly the four groups
  // this script persists below, while the explicit update data and preserved
  // state fingerprint prevent scope expansion.
  const changedFields = [...CHANGED_FIELDS];
  return { payload, normalized, changedFields };
}

try {
  const site = await prisma.site.findUniqueOrThrow({
    where: { id: SITE_ID },
    select: { domain: true },
  });
  const current = await prisma.pageReview.findFirstOrThrow({
    where: {
      id: REVIEW_ID,
      siteId: SITE_ID,
      canonicalUrl: requestedCanonical,
      deletedAt: null,
    },
  });
  const preview = normalizeAndValidate(current, site.domain);

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          canonical: current.canonicalUrl,
          currentVersion: current.version,
          nextVersion: current.version + 1,
          changedFields: preview.changedFields,
          evidenceStates: {
            mediaAccuracy: preview.normalized.mediaAccuracyEvidenceState,
            searchAppearance: preview.normalized.searchAppearanceEvidenceState,
            readabilityUserFriendliness:
              preview.normalized.readabilityUserFriendlinessEvidenceState,
            technicalSnapshot: preview.normalized.technicalSnapshotEvidenceState,
            coreWebVitals: (
              preview.normalized.technicalSnapshotDetails as {
                cwv: { evidenceState: string };
              }
            ).cwv.evidenceState,
          },
          preserved: {
            reviewStatus: current.reviewStatus,
            manualChatState: current.manualChatState,
            changeState: current.changeState,
            day7DueAt: current.day7DueAt?.toISOString() ?? null,
            day28DueAt: current.day28DueAt?.toISOString() ?? null,
            day56DueAt: current.day56DueAt?.toISOString() ?? null,
          },
          nextStep:
            "Review this plan, apply the forward migration, then rerun the exact command with --apply.",
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const result = await prisma.$transaction(
    async (transaction) => {
      const lockedSite = await transaction.site.findUniqueOrThrow({
        where: { id: SITE_ID },
        select: { userId: true, domain: true },
      });
      const locked = await transaction.pageReview.findFirstOrThrow({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: requestedCanonical,
          deletedAt: null,
        },
      });
      const { payload, normalized, changedFields } = normalizeAndValidate(
        locked,
        lockedSite.domain,
      );
      const update = await transaction.pageReview.updateMany({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: CANONICAL,
          version: expectedVersion,
          deletedAt: null,
        },
        data: {
          mediaAccuracyEvidenceState: normalized.mediaAccuracyEvidenceState,
          mediaAccuracyDetails:
            normalized.mediaAccuracyDetails as Prisma.InputJsonValue,
          searchAppearanceEvidenceState:
            normalized.searchAppearanceEvidenceState,
          searchAppearanceDetails:
            normalized.searchAppearanceDetails as Prisma.InputJsonValue,
          readabilityUserFriendlinessEvidenceState:
            normalized.readabilityUserFriendlinessEvidenceState,
          readabilityUserFriendlinessDetails:
            normalized.readabilityUserFriendlinessDetails as Prisma.InputJsonValue,
          technicalSnapshotEvidenceState:
            normalized.technicalSnapshotEvidenceState,
          technicalSnapshotDetails:
            normalized.technicalSnapshotDetails as Prisma.InputJsonValue,
          version: { increment: 1 },
        } as Prisma.PageReviewUncheckedUpdateManyInput,
      });
      if (update.count !== 1) {
        throw new Error("Version conflict while backfilling Lochsa evidence");
      }
      const updated = await transaction.pageReview.findUniqueOrThrow({
        where: { id: REVIEW_ID },
      });
      if (
        preservedStateFingerprint(locked) !== preservedStateFingerprint(updated)
      ) {
        throw new Error("Monitoring or gate state changed during the backfill");
      }
      const revision = await transaction.pageReviewRevision.create({
        data: {
          siteId: SITE_ID,
          reviewId: REVIEW_ID,
          version: updated.version,
          changeType: "UPDATED",
          changedFields,
          snapshot: pageReviewToApi(updated) as Prisma.InputJsonValue,
          changeNote: payload.changeNote,
          changedByUserId: lockedSite.userId,
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
        canonical: result.updated.canonicalUrl,
        version: result.updated.version,
        reviewStatus: result.updated.reviewStatus,
        manualChatState: result.updated.manualChatState,
        changeState: result.updated.changeState,
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
