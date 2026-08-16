import { Prisma, PrismaClient } from "@prisma/client";

import {
  normalizePageReviewPatch,
  pageReviewToApi,
  patchPageReviewSchema,
} from "../lib/page-reviews.ts";

const SITE_ID = "cmslxpgoq000co801hmlq1zj3";
const REVIEW_ID = "b44cb02b-4d3a-48e1-bdf7-78bdeaedb237";
const CANONICAL =
  "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river";
const EXPECTED_VERSION = 8;
const PREVIOUS_DEPLOYMENT_ID = "dpl_9L1STHexMDa1pELygfbbubgU7eP7";
const DEPLOYMENT_ID = "dpl_8qKmHc2UfR7jNWP7WP4gfRAC133W";
const CRAWL_ID = "cmswdn4ij0wy5n101tm4sezm2";
const CHANGED_AT = "2026-08-16T22:24:51.000Z";
const CHECKED_AT = "2026-08-16T22:29:28.488Z";
const DAY7_DUE_AT = "2026-08-23T22:24:51.000Z";
const DAY28_DUE_AT = "2026-09-13T22:24:51.000Z";
const DAY56_DUE_AT = "2026-10-11T22:24:51.000Z";
const META_DESCRIPTION =
  "Lochsa River fishing report: get a clear trip recommendation, current flow and weather, Idaho rules, Highway 12 access, hatches, flies, and tactics.";
const CHANGED_FIELDS = ["serp", "decision", "gates", "manualReview"];

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required");
}

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

function unique(values: string[]) {
  return [...new Set(values)];
}

function payloadFor(current: Parameters<typeof pageReviewToApi>[0]) {
  const review = pageReviewToApi(current);
  const searchAppearanceSummary =
    "The user-supplied Google result displayed an older dynamic Flow passage—576 cfs, a six-hour trend, and the 527–809 cfs historical range—instead of the rendered meta description. Google controls query-specific snippets. Production now supplies a stable, exact-query-led 148-character description and clearer shared USGS flow prose; the same-query post-index recheck remains part of monitoring.";
  const metaChange =
    `Search appearance now uses this stable page-specific description across meta, Open Graph, Twitter, and structured data: “${META_DESCRIPTION}”`;
  const flowCopyChange =
    "Shared river flow explanations now use plain sentences such as ‘The flow has been stable’ and ‘USGS records for this date show a typical middle range,’ so a body-selected Google snippet remains readable without hiding useful live-condition content.";

  return patchPageReviewSchema.parse({
    expectedVersion: EXPECTED_VERSION,
    reviewStatus: "monitoring",
    serp: {
      ...review.serp,
      evidenceSummary: `${review.serp.evidenceSummary ?? ""}\n\n${searchAppearanceSummary}`.trim(),
    },
    decision: {
      ...review.decision,
      intentionallyChangedElements: unique([
        ...(review.decision.intentionallyChangedElements ?? []),
        metaChange,
        flowCopyChange,
      ]),
      changeState: "shipped",
      changeId: DEPLOYMENT_ID,
      changedAt: CHANGED_AT,
    },
    gates: {
      day7: {
        status: "not_due",
        dueAt: DAY7_DUE_AT,
        reviewedAt: null,
        evidence: null,
        decision: null,
        rationale: null,
        nextAction: null,
      },
      day28: {
        status: "not_due",
        dueAt: DAY28_DUE_AT,
        reviewedAt: null,
        evidence: null,
        decision: null,
        rationale: null,
        nextAction: null,
      },
      day56: {
        status: "not_due",
        dueAt: DAY56_DUE_AT,
        reviewedAt: null,
        evidence: null,
        decision: null,
        rationale: null,
        nextAction: null,
      },
    },
    manualReview: {
      ...review.manualReview,
      lastReviewedAt: CHECKED_AT,
      nextReviewAt: DAY7_DUE_AT,
      notes:
        `${review.manualReview.notes ?? ""}\n\nProduction release ${DEPLOYMENT_ID} replaced the generic Lochsa description with the exact-query-led 148-character search pitch, aligned Open Graph/Twitter/structured descriptions, and improved the shared USGS flow wording selected in the user-supplied Google snippet. Vercel aliased the release to bluestreamfly.com. Post-deploy sitemap-only crawl ${CRAWL_ID} fetched 669/669 canonicals; Lochsa returned 200, stayed indexable and self-canonical, kept one H1, used the new description, had 10 images with zero missing alt text, and retained content score 100. Google has not yet reprocessed the result, so the same-query snippet recheck remains a monitoring task.`.trim(),
    },
    manualChatState: "monitoring",
    userDecisionReference: review.userDecisionReference,
    changeNote:
      `Record the Lochsa search-appearance release ${DEPLOYMENT_ID}, clearer shared flow prose, post-deploy crawl ${CRAWL_ID}, and reset Day-7/28/56 monitoring from this release.`,
  });
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
  if (current.version !== EXPECTED_VERSION) {
    throw new Error(
      `Version conflict: expected ${EXPECTED_VERSION}, current ${current.version}`,
    );
  }
  if (
    current.reviewStatus !== "MONITORING" ||
    current.manualChatState !== "MONITORING" ||
    current.changeState !== "SHIPPED" ||
    current.changeId !== PREVIOUS_DEPLOYMENT_ID ||
    current.experimentState !== "APPROVED_CONTAMINATION"
  ) {
    throw new Error("Refusing to change an unexpected Lochsa monitoring state");
  }

  const payload = payloadFor(current);
  const preview = normalizePageReviewPatch(
    payload,
    current,
    "bluestreamfly.com",
  );
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          currentVersion: current.version,
          nextVersion: current.version + 1,
          reviewStatus: preview.reviewStatus,
          manualChatState: preview.manualChatState,
          changeState: preview.changeState,
          changeId: preview.changeId,
          changedFields: CHANGED_FIELDS,
          metaDescription: META_DESCRIPTION,
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
        select: { userId: true, domain: true },
      });
      const locked = await transaction.pageReview.findFirstOrThrow({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: CANONICAL,
          deletedAt: null,
        },
      });
      if (
        locked.version !== EXPECTED_VERSION ||
        locked.reviewStatus !== "MONITORING" ||
        locked.manualChatState !== "MONITORING" ||
        locked.changeState !== "SHIPPED" ||
        locked.changeId !== PREVIOUS_DEPLOYMENT_ID
      ) {
        throw new Error("The review changed before the release was recorded");
      }

      const parsed = payloadFor(locked);
      const normalized = normalizePageReviewPatch(
        parsed,
        locked,
        site.domain,
      );
      const normalizedUpdate =
        normalized as Prisma.PageReviewUncheckedUpdateManyInput;
      const update = await transaction.pageReview.updateMany({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: CANONICAL,
          version: EXPECTED_VERSION,
          deletedAt: null,
        },
        data: {
          serpEvidenceSummary: normalized.serpEvidenceSummary,
          intentionallyChangedElements:
            normalized.intentionallyChangedElements as Prisma.InputJsonValue,
          changeState: normalized.changeState,
          changeId: normalized.changeId,
          changedAt: normalized.changedAt,
          day7State: normalizedUpdate.day7State,
          day7DueAt: normalizedUpdate.day7DueAt,
          day7ReviewedAt: normalizedUpdate.day7ReviewedAt,
          day7Evidence: normalizedUpdate.day7Evidence,
          day7Decision: normalizedUpdate.day7Decision,
          day7Rationale: normalizedUpdate.day7Rationale,
          day7NextAction: normalizedUpdate.day7NextAction,
          day28State: normalizedUpdate.day28State,
          day28DueAt: normalizedUpdate.day28DueAt,
          day28ReviewedAt: normalizedUpdate.day28ReviewedAt,
          day28Evidence: normalizedUpdate.day28Evidence,
          day28Decision: normalizedUpdate.day28Decision,
          day28Rationale: normalizedUpdate.day28Rationale,
          day28NextAction: normalizedUpdate.day28NextAction,
          day56State: normalizedUpdate.day56State,
          day56DueAt: normalizedUpdate.day56DueAt,
          day56ReviewedAt: normalizedUpdate.day56ReviewedAt,
          day56Evidence: normalizedUpdate.day56Evidence,
          day56Decision: normalizedUpdate.day56Decision,
          day56Rationale: normalizedUpdate.day56Rationale,
          day56NextAction: normalizedUpdate.day56NextAction,
          lastReviewedAt: normalized.lastReviewedAt,
          nextReviewAt: normalized.nextReviewAt,
          manualNotes: normalized.manualNotes,
          version: { increment: 1 },
        } as Prisma.PageReviewUncheckedUpdateManyInput,
      });
      if (update.count !== 1) {
        throw new Error("Version conflict while recording search appearance");
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
          changedFields: CHANGED_FIELDS,
          snapshot: pageReviewToApi(updated) as Prisma.InputJsonValue,
          changeNote: parsed.changeNote,
          changedByUserId: site.userId,
        },
      });
      return { updated, revision, changedFields: CHANGED_FIELDS };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  console.log(
    JSON.stringify(
      {
        mode: "applied",
        version: result.updated.version,
        reviewStatus: result.updated.reviewStatus,
        manualChatState: result.updated.manualChatState,
        changeState: result.updated.changeState,
        changeId: result.updated.changeId,
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
