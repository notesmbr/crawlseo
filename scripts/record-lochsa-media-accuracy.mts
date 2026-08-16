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
const EXPECTED_VERSION = 7;
const CHECKED_AT = "2026-08-16T22:10:07.000Z";
const SOURCE_URL =
  "https://commons.wikimedia.org/wiki/File:Lochsa_River_in_Clearwater_NF.jpg";
const CHANGED_FIELDS = ["eeat", "manualReview"];

if (!process.env.DATABASE_URL?.trim()) {
  throw new Error("DATABASE_URL is required");
}

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

function payloadFor(current: Parameters<typeof pageReviewToApi>[0]) {
  const review = pageReviewToApi(current);
  const mediaEvidence = {
    evidence:
      "Media accuracy: the production hero is a genuine photograph of the Lochsa River flowing through Clearwater National Forest. The reviewed local WebP, rendered alt text, visible credit, source link, and CC BY 2.0 label match the source record. The source identifies U.S. Forest Service Northern Region as author and August 5, 2011 as the capture date.",
    source: SOURCE_URL,
    checkedAt: CHECKED_AT,
    reviewer: "BlueStreamFly River Review Team",
    limitation:
      "The photograph verifies the named river and national-forest setting, not today's conditions, a precise fishing access point, or a BlueStreamFly field visit.",
  };
  const details = [
    ...review.eeat.details.filter(
      (detail) => !detail.evidence.trim().startsWith("Media accuracy:"),
    ),
    mediaEvidence,
  ];

  return patchPageReviewSchema.parse({
    expectedVersion: EXPECTED_VERSION,
    eeat: {
      ...review.eeat,
      details,
    },
    manualReview: {
      ...review.manualReview,
      lastReviewedAt: CHECKED_AT,
      notes:
        `${review.manualReview.notes ?? ""}\n\nMedia accuracy verified ${CHECKED_AT}: genuine Lochsa River / Clearwater National Forest photograph by U.S. Forest Service Northern Region, source and CC BY 2.0 attribution checked; the image is not presented as current conditions or a BlueStreamFly field visit.`.trim(),
    },
    changeNote:
      "Add the required source-backed media-accuracy evidence for the genuine Lochsa River hero photograph; no keyword, decision, implementation, or monitoring outcome changed.",
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
    current.changeState !== "SHIPPED"
  ) {
    throw new Error("Refusing to change a review outside monitoring/shipped state");
  }

  const parsed = payloadFor(current);
  normalizePageReviewPatch(parsed, current, "bluestreamfly.com");
  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          currentVersion: current.version,
          nextVersion: current.version + 1,
          changedFields: CHANGED_FIELDS,
          mediaEvidence: parsed.eeat?.details.at(-1),
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
      if (locked.version !== EXPECTED_VERSION) {
        throw new Error("The review changed before media evidence was recorded");
      }

      const lockedPayload = payloadFor(locked);
      const lockedNormalized = normalizePageReviewPatch(
        lockedPayload,
        locked,
        site.domain,
      );
      const update = await transaction.pageReview.updateMany({
        where: {
          id: REVIEW_ID,
          siteId: SITE_ID,
          canonicalUrl: CANONICAL,
          version: EXPECTED_VERSION,
          deletedAt: null,
        },
        data: {
          eeatEvidence: lockedNormalized.eeatEvidence,
          eeatGaps: lockedNormalized.eeatGaps,
          eeatEvidenceDetails:
            lockedNormalized.eeatEvidenceDetails as Prisma.InputJsonValue,
          eeatEvidenceState: lockedNormalized.eeatEvidenceState,
          lastReviewedAt: lockedNormalized.lastReviewedAt,
          manualNotes: lockedNormalized.manualNotes,
          version: { increment: 1 },
        } as Prisma.PageReviewUncheckedUpdateManyInput,
      });
      if (update.count !== 1) {
        throw new Error("Version conflict while recording media evidence");
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
          changeNote: lockedPayload.changeNote,
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
