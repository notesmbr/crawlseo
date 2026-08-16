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
const EXPECTED_VERSION = 5;
const PREVIOUS_DEPLOYMENT_ID = "dpl_GoZxW2EYPrWFoLNwSgCWruF4meMq";
const DEPLOYMENT_ID = "dpl_2Wd59wMMiPm7NixbWamjfMqdjR9a";
const CRAWL_ID = "cmsw2z6b40gh3n101r8t9kbnk";
const CHANGED_AT = "2026-08-16T17:28:54.935Z";
const CHECKED_AT = "2026-08-16T17:30:55.729Z";
const DAY7_DUE_AT = "2026-08-23T17:28:54.935Z";
const DAY28_DUE_AT = "2026-09-13T17:28:54.935Z";
const DAY56_DUE_AT = "2026-10-11T17:28:54.935Z";
const CHANGED_FIELDS = ["decision", "gates", "manualReview"];

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required");
}

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

function payloadFor(current: Parameters<typeof pageReviewToApi>[0]) {
  const review = pageReviewToApi(current);
  const changeSummary =
    "Shared river decision copy now names an unverified water temperature directly instead of showing generic ‘Verify first’ or ‘missing check’ wording.";

  return patchPageReviewSchema.parse({
    expectedVersion: EXPECTED_VERSION,
    reviewStatus: "monitoring",
    decision: {
      ...review.decision,
      intentionallyChangedElements: [
        ...(review.decision.intentionallyChangedElements ?? []),
        changeSummary,
      ],
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
        `${review.manualReview.notes ?? ""}\n\nProduction release ${DEPLOYMENT_ID} replaced generic decision-verification wording with a specific water-temperature check. A real-browser review confirmed the exact live Lochsa copy. Post-deploy sitemap-only crawl ${CRAWL_ID} fetched 669/669 canonicals; Lochsa returned 200, remained indexable with its exact canonical, and kept content score 100.`.trim(),
    },
    manualChatState: "monitoring",
    userDecisionReference: review.userDecisionReference,
    changeNote:
      `Record the live water-temperature decision-copy fix, production deployment ${DEPLOYMENT_ID}, browser verification, canonical crawl ${CRAWL_ID}, and reset Day-7/28/56 monitoring dates from this release.`,
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
    throw new Error(
      "Refusing to update a review outside the expected monitored release state",
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
          changedFields: CHANGED_FIELDS,
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

      const update = await transaction.pageReview.updateMany({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: CANONICAL,
          version: EXPECTED_VERSION,
          deletedAt: null,
        },
        data: {
          intentionallyChangedElements:
            normalized.intentionallyChangedElements as Prisma.InputJsonValue,
          changeId: normalized.changeId,
          changedAt: normalized.changedAt,
          day7State: "NOT_DUE",
          day7DueAt: new Date(DAY7_DUE_AT),
          day7ReviewedAt: null,
          day7Evidence: null,
          day7Decision: null,
          day7Rationale: null,
          day7NextAction: null,
          day28State: "NOT_DUE",
          day28DueAt: new Date(DAY28_DUE_AT),
          day28ReviewedAt: null,
          day28Evidence: null,
          day28Decision: null,
          day28Rationale: null,
          day28NextAction: null,
          day56State: "NOT_DUE",
          day56DueAt: new Date(DAY56_DUE_AT),
          day56ReviewedAt: null,
          day56Evidence: null,
          day56Decision: null,
          day56Rationale: null,
          day56NextAction: null,
          lastReviewedAt: normalized.lastReviewedAt,
          nextReviewAt: normalized.nextReviewAt,
          manualNotes: normalized.manualNotes,
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
          changedFields: CHANGED_FIELDS,
          snapshot: pageReviewToApi(updated) as Prisma.InputJsonValue,
          changeNote: parsed.changeNote,
          changedByUserId: site.userId,
        },
      });
      return { updated, revision };
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
        changedFields: CHANGED_FIELDS,
        revisionId: result.revision.id,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
