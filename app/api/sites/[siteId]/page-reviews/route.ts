import {
  IndexPolicy,
  ManualChatState,
  PageFamily,
  PageReviewStatus,
  Prisma,
  ReviewPriority,
} from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  activeManualChatStateValues,
  apiEnumToDb,
  createPageReviewSchema,
  indexPolicyValues,
  isActiveManualChatState,
  normalizePageReviewInput,
  pageFamilyValues,
  pageReviewStatusValues,
  pageReviewPrismaConflictCode,
  pageReviewToApi,
  pageReviewRevisionToApi,
  pageReviewToSummary,
  reviewPriorityValues,
} from "@/lib/page-reviews";

const summarySelect = {
  id: true,
  siteId: true,
  pageId: true,
  canonicalUrl: true,
  pageFamily: true,
  indexPolicy: true,
  reviewStatus: true,
  priority: true,
  topicCluster: true,
  maintenanceOwner: true,
  editorialOwner: true,
  manualChatState: true,
  keywordOwnership: true,
  primaryKeyword: true,
  keywordOwnerCanonical: true,
  firstReviewedAt: true,
  lastReviewedAt: true,
  nextReviewAt: true,
  version: true,
  updatedAt: true,
} satisfies Prisma.PageReviewSelect;

function enumFilter<T extends readonly string[]>(
  value: string | null,
  allowed: T,
) {
  if (!value) return null;
  return (allowed as readonly string[]).includes(value) ? apiEnumToDb(value) : undefined;
}

function validationError(error: { flatten(): { fieldErrors: unknown; formErrors: unknown } }) {
  return Response.json(
    { error: "Invalid page review", details: error.flatten() },
    { status: 400 },
  );
}

function conflictResponse(error: unknown) {
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
        error: "A review with this canonical URL, page ID, or owned keyword already exists",
        code,
      },
      { status: 409 },
    );
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;
    const site = await db.site.findUnique({
      where: { id: siteId },
      select: { userId: true },
    });
    if (!site || site.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200), 1), 1000);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
    if (!Number.isInteger(limit) || !Number.isInteger(offset)) {
      return Response.json({ error: "limit and offset must be integers" }, { status: 400 });
    }

    const reviewStatus = enumFilter(
      url.searchParams.get("reviewStatus"),
      pageReviewStatusValues,
    );
    const priority = enumFilter(url.searchParams.get("priority"), reviewPriorityValues);
    const pageFamily = enumFilter(url.searchParams.get("pageFamily"), pageFamilyValues);
    const indexPolicy = enumFilter(url.searchParams.get("indexPolicy"), indexPolicyValues);
    if ([reviewStatus, priority, pageFamily, indexPolicy].some((value) => value === undefined)) {
      return Response.json({ error: "Invalid page-review filter" }, { status: 400 });
    }

    const q = url.searchParams.get("q")?.trim().slice(0, 300) || null;
    const includeDeleted = url.searchParams.get("includeDeleted") === "true";
    const where: Prisma.PageReviewWhereInput = {
      siteId,
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(reviewStatus ? { reviewStatus: reviewStatus as PageReviewStatus } : {}),
      ...(priority ? { priority: priority as ReviewPriority } : {}),
      ...(pageFamily ? { pageFamily: pageFamily as PageFamily } : {}),
      ...(indexPolicy ? { indexPolicy: indexPolicy as IndexPolicy } : {}),
      ...(q
        ? {
            OR: [
              { pageId: { contains: q, mode: "insensitive" } },
              { canonicalUrl: { contains: q, mode: "insensitive" } },
              { primaryKeyword: { contains: q, mode: "insensitive" } },
              { topicCluster: { contains: q, mode: "insensitive" } },
              { maintenanceOwner: { contains: q, mode: "insensitive" } },
              { editorialOwner: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await db.$transaction([
      db.pageReview.findMany({
        where,
        select: summarySelect,
        orderBy: [{ canonicalUrl: "asc" }],
        skip: offset,
        take: limit,
      }),
      db.pageReview.count({ where }),
    ]);

    return Response.json({
      items: items.map(pageReviewToSummary),
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Page reviews GET error:", error);
    return Response.json({ error: "Failed to load page reviews" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { siteId } = await params;
    const site = await db.site.findUnique({
      where: { id: siteId },
      select: { userId: true, domain: true },
    });
    if (!site || site.userId !== session.user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return Response.json(
        { error: "Request body must be valid JSON" },
        { status: 400 },
      );
    }
    const parsed = createPageReviewSchema.safeParse(requestBody);
    if (!parsed.success) return validationError(parsed.error);

    let normalized: ReturnType<typeof normalizePageReviewInput>;
    try {
      normalized = normalizePageReviewInput(parsed.data, site.domain);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid page review" },
        { status: 400 },
      );
    }

    const result = await db.$transaction(async (transaction) => {
      if (
        normalized.keywordOwnership === "THIS_PAGE" &&
        normalized.primaryKeywordNormalized
      ) {
        const owner = await transaction.pageReview.findFirst({
          where: {
            siteId,
            deletedAt: null,
            keywordOwnership: "THIS_PAGE",
            primaryKeywordNormalized: normalized.primaryKeywordNormalized,
          },
          select: { canonicalUrl: true },
        });
        if (owner) {
          throw new PageReviewConflict(
            `The query is already owned by ${owner.canonicalUrl}`,
          );
        }
      }

      if (isActiveManualChatState(normalized.manualChatState)) {
        const active = await transaction.pageReview.findFirst({
          where: {
            siteId,
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
          );
        }
      }

      const review = await transaction.pageReview.create({
        data: {
          siteId,
          ...normalized,
        } as Prisma.PageReviewUncheckedCreateInput,
      });
      const revision = await transaction.pageReviewRevision.create({
        data: {
          siteId,
          reviewId: review.id,
          version: review.version,
          changeType: "CREATED",
          changedFields: Object.keys(parsed.data),
          snapshot: pageReviewToApi(review) as Prisma.InputJsonValue,
          changedByUserId: session.user.id,
        },
      });

      return { review, revision };
    });

    return Response.json(
      {
        review: pageReviewToApi(result.review),
        revision: pageReviewRevisionToApi(result.revision),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof PageReviewConflict) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    const conflict = conflictResponse(error);
    if (conflict) return conflict;
    console.error("Page reviews POST error:", error);
    return Response.json({ error: "Failed to create page review" }, { status: 500 });
  }
}

class PageReviewConflict extends Error {}
