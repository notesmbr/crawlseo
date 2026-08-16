import {
  ManualChatState,
  Prisma,
} from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activeManualChatStateValues,
  apiEnumToDb,
  deletePageReviewSchema,
  isActiveManualChatState,
  normalizePageReviewPatch,
  pageReviewPrismaConflictCode,
  pageReviewRevisionToApi,
  pageReviewToApi,
  patchPageReviewSchema,
  semanticChangedReviewFields,
} from "@/lib/page-reviews";

class PageReviewConflict extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

function conflictResponse(error: unknown) {
  if (error instanceof PageReviewConflict) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: 409 },
    );
  }
  const code = pageReviewPrismaConflictCode(error);
  if (code === "PAGE_REVIEW_VERSION_CONFLICT") {
    return Response.json(
      {
        error: "The page review changed while saving. Reload it and try again.",
        code,
      },
      { status: 409 },
    );
  }
  if (code === "PAGE_REVIEW_UNIQUE_CONFLICT") {
    return Response.json(
      {
        error:
          "This save conflicts with another current page, page ID, keyword owner, or active manual review",
        code,
      },
      { status: 409 },
    );
  }
  return null;
}

async function authorizedSite(siteId: string, userId: string) {
  const site = await db.site.findUnique({
    where: { id: siteId },
    select: { userId: true, domain: true },
  });
  return site && site.userId === userId ? site : null;
}

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ siteId: string; reviewId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId, reviewId } = await params;
    if (!(await authorizedSite(siteId, session.user.id))) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const review = await db.pageReview.findFirst({
      where: { id: reviewId, siteId, deletedAt: null },
    });
    if (!review) {
      return Response.json({ error: "Page review not found" }, { status: 404 });
    }

    const revisions = await db.pageReviewRevision.findMany({
      where: { siteId, reviewId },
      orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    });

    return Response.json({
      review: pageReviewToApi(review),
      revisions: revisions.map(pageReviewRevisionToApi),
    });
  } catch (error) {
    console.error("Page review GET error:", error);
    return Response.json(
      { error: "Failed to load the page review" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ siteId: string; reviewId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId, reviewId } = await params;
    const site = await authorizedSite(siteId, session.user.id);
    if (!site) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
    }
    const parsed = patchPageReviewSchema.safeParse(requestBody);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid page review", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await db.$transaction(
      async (transaction) => {
        const current = await transaction.pageReview.findFirst({
          where: { id: reviewId, siteId, deletedAt: null },
        });
        if (!current) return null;

        if (
          parsed.data.expectedVersion !== undefined &&
          parsed.data.expectedVersion !== current.version
        ) {
          throw new PageReviewConflict(
            `This review changed after you opened it. Reload version ${current.version} before saving.`,
            "PAGE_REVIEW_VERSION_CONFLICT",
          );
        }

        let normalized: ReturnType<typeof normalizePageReviewPatch>;
        try {
          normalized = normalizePageReviewPatch(
            parsed.data,
            current,
            site.domain,
          );
        } catch (error) {
          throw new InvalidPageReviewError(
            error instanceof Error ? error.message : "Invalid page review",
          );
        }

        const changedFields = semanticChangedReviewFields(normalized, current);
        if (changedFields.length === 0) {
          return { review: current, revision: null, unchanged: true as const };
        }

        if (
          normalized.keywordOwnership === "THIS_PAGE" &&
          normalized.primaryKeywordNormalized
        ) {
          const owner = await transaction.pageReview.findFirst({
            where: {
              siteId,
              id: { not: reviewId },
              deletedAt: null,
              keywordOwnership: "THIS_PAGE",
              primaryKeywordNormalized: normalized.primaryKeywordNormalized,
            },
            select: { canonicalUrl: true },
          });
          if (owner) {
            throw new PageReviewConflict(
              `The query is already owned by ${owner.canonicalUrl}`,
              "PRIMARY_QUERY_OWNER_CONFLICT",
            );
          }
        }

        if (isActiveManualChatState(normalized.manualChatState)) {
          const active = await transaction.pageReview.findFirst({
            where: {
              siteId,
              id: { not: reviewId },
              deletedAt: null,
              manualChatState: {
                in: activeManualChatStateValues.map(
                  (value) => apiEnumToDb(value),
                ) as ManualChatState[],
              },
            },
            select: { canonicalUrl: true },
          });
          if (active) {
            throw new PageReviewConflict(
              `Another page is already active in manual review: ${active.canonicalUrl}`,
              "ACTIVE_MANUAL_REVIEW_CONFLICT",
            );
          }
        }

        const updated = await transaction.pageReview.updateMany({
          where: {
            id: reviewId,
            siteId,
            version: current.version,
            deletedAt: null,
          },
          data: {
            ...normalized,
            version: { increment: 1 },
          } as Prisma.PageReviewUncheckedUpdateManyInput,
        });
        if (updated.count !== 1) {
          throw new PageReviewConflict(
            "This review changed while it was being saved. Reload it and try again.",
            "PAGE_REVIEW_VERSION_CONFLICT",
          );
        }

        const review = await transaction.pageReview.findUniqueOrThrow({
          where: { id: reviewId },
        });
        const revision = await transaction.pageReviewRevision.create({
          data: {
            siteId,
            reviewId,
            version: review.version,
            changeType: "UPDATED",
            changedFields,
            snapshot: pageReviewToApi(review) as Prisma.InputJsonValue,
            changeNote: parsed.data.changeNote,
            changedByUserId: session.user.id,
          },
        });

        return { review, revision, unchanged: false as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!result) {
      return Response.json({ error: "Page review not found" }, { status: 404 });
    }

    return Response.json({
      review: pageReviewToApi(result.review),
      revision: result.revision
        ? pageReviewRevisionToApi(result.revision)
        : null,
      unchanged: result.unchanged,
    });
  } catch (error) {
    if (error instanceof InvalidPageReviewError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const conflict = conflictResponse(error);
    if (conflict) return conflict;
    console.error("Page review PATCH error:", error);
    return Response.json(
      { error: "Failed to save the page review" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: Promise<{ siteId: string; reviewId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId, reviewId } = await params;
    if (!(await authorizedSite(siteId, session.user.id))) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const rawBody = await request.text();
    let requestBody: unknown = {};
    if (rawBody.trim()) {
      try {
        requestBody = JSON.parse(rawBody);
      } catch {
        return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
      }
    }
    const parsed = deletePageReviewSchema.safeParse(requestBody);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid delete request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await db.$transaction(
      async (transaction) => {
        const current = await transaction.pageReview.findFirst({
          where: { id: reviewId, siteId, deletedAt: null },
        });
        if (!current) return null;
        if (
          parsed.data.expectedVersion !== undefined &&
          parsed.data.expectedVersion !== current.version
        ) {
          throw new PageReviewConflict(
            `This review changed after you opened it. Reload version ${current.version} before deleting.`,
            "PAGE_REVIEW_VERSION_CONFLICT",
          );
        }

        const deleted = await transaction.pageReview.updateMany({
          where: {
            id: reviewId,
            siteId,
            version: current.version,
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
            manualChatState: "COMPLETE",
            version: { increment: 1 },
          },
        });
        if (deleted.count !== 1) {
          throw new PageReviewConflict(
            "This review changed while it was being deleted. Reload it and try again.",
            "PAGE_REVIEW_VERSION_CONFLICT",
          );
        }

        const review = await transaction.pageReview.findUniqueOrThrow({
          where: { id: reviewId },
        });
        const revision = await transaction.pageReviewRevision.create({
          data: {
            siteId,
            reviewId,
            version: review.version,
            changeType: "DELETED",
            changedFields: ["deletedAt", "manualChatState"],
            snapshot: pageReviewToApi(review) as Prisma.InputJsonValue,
            changeNote: parsed.data.changeNote,
            changedByUserId: session.user.id,
          },
        });
        return { review, revision };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!result) {
      return Response.json({ error: "Page review not found" }, { status: 404 });
    }
    return Response.json({
      success: true,
      review: pageReviewToApi(result.review),
      revision: pageReviewRevisionToApi(result.revision),
    });
  } catch (error) {
    const conflict = conflictResponse(error);
    if (conflict) return conflict;
    console.error("Page review DELETE error:", error);
    return Response.json(
      { error: "Failed to delete the page review" },
      { status: 500 },
    );
  }
}

class InvalidPageReviewError extends Error {}
