import { Prisma, PrismaClient } from "@prisma/client";
import {
  normalizePageReviewPatch,
  pageReviewToApi,
  patchPageReviewSchema,
  semanticChangedReviewFields,
} from "../lib/page-reviews.ts";

const SITE_ID = "cmslxpgoq000co801hmlq1zj3";
const REVIEW_ID = "b44cb02b-4d3a-48e1-bdf7-78bdeaedb237";
const CANONICAL =
  "https://bluestreamfly.com/fly-fishing-reports/idaho/lochsa-river";
const EXPECTED_VERSION = 4;
const DEPLOYMENT_ID = "dpl_GoZxW2EYPrWFoLNwSgCWruF4meMq";
const CRAWL_ID = "cmsw2km5x088kn101z199wwgb";
const CHANGED_AT = "2026-08-16T17:17:04.000Z";

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required");
}

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

function payloadFor(current: Parameters<typeof pageReviewToApi>[0]) {
  const review = pageReviewToApi(current);
  return patchPageReviewSchema.parse({
    expectedVersion: EXPECTED_VERSION,
    reviewStatus: "monitoring",
    decision: {
      ...review.decision,
      changeState: "shipped",
      changeId: DEPLOYMENT_ID,
      changedAt: CHANGED_AT,
    },
    gates: {
      day7: {
        status: "not_due",
        dueAt: "2026-08-23T17:17:04.000Z",
        reviewedAt: null,
        evidence: null,
        decision: null,
        rationale: null,
        nextAction: null,
      },
      day28: {
        status: "not_due",
        dueAt: "2026-09-13T17:17:04.000Z",
        reviewedAt: null,
        evidence: null,
        decision: null,
        rationale: null,
        nextAction: null,
      },
      day56: {
        status: "not_due",
        dueAt: "2026-10-11T17:17:04.000Z",
        reviewedAt: null,
        evidence: null,
        decision: null,
        rationale: null,
        nextAction: null,
      },
    },
    manualReview: {
      ...review.manualReview,
      lastReviewedAt: "2026-08-16T17:19:36.849Z",
      nextReviewAt: "2026-08-23T17:17:04.000Z",
      notes:
        `${review.manualReview.notes ?? ""}\n\nProduction release ${DEPLOYMENT_ID} became ready and was aliased to bluestreamfly.com on 2026-08-16. Post-deploy sitemap-only crawl ${CRAWL_ID} fetched 669/669 canonicals, recorded zero verified critical/warning findings, and returned informational health 96. Lochsa now enters Day-7/28/56 monitoring.`.trim(),
    },
    manualChatState: "monitoring",
    userDecisionReference: review.userDecisionReference,
    changeNote:
      `Record production deployment ${DEPLOYMENT_ID}, public alias promotion, post-deploy canonical crawl ${CRAWL_ID}, and the Day-7/28/56 monitoring schedule.`,
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
    current.manualChatState !== "APPROVED_TO_IMPLEMENT" ||
    current.changeState !== "IN_PROGRESS" ||
    current.experimentState !== "APPROVED_CONTAMINATION"
  ) {
    throw new Error(
      "Refusing to release a review outside the approved in-progress state",
    );
  }
  const payload = payloadFor(current);
  const preview = normalizePageReviewPatch(payload, current, "bluestreamfly.com");

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
          changedFields: semanticChangedReviewFields(preview, current),
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
        locked.manualChatState !== "APPROVED_TO_IMPLEMENT" ||
        locked.changeState !== "IN_PROGRESS"
      ) {
        throw new Error("The review changed before release recording");
      }

      const parsed = payloadFor(locked);
      const normalized = normalizePageReviewPatch(parsed, locked, site.domain);
      if (
        normalized.reviewStatus !== "MONITORING" ||
        normalized.manualChatState !== "MONITORING" ||
        normalized.changeState !== "SHIPPED" ||
        normalized.changeId !== DEPLOYMENT_ID
      ) {
        throw new Error("The normalized release state is not safe to record");
      }
      const changedFields = semanticChangedReviewFields(normalized, locked);
      const update = await transaction.pageReview.updateMany({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: CANONICAL,
          version: EXPECTED_VERSION,
          deletedAt: null,
        },
        data: {
          ...normalized,
          version: { increment: 1 },
        } as Prisma.PageReviewUncheckedUpdateManyInput,
      });
      if (update.count !== 1) {
        throw new Error("Version conflict while recording the live release");
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
