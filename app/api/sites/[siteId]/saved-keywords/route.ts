import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  normalizeOwnerPage,
  normalizeSavedQuery,
} from "@/lib/saved-keyword-ownership";
import { rollupKeywordMetrics } from "@/lib/keyword-storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ siteId: string }> }
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

    const savedKeywords = await db.savedKeyword.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
    });

    // Fetch latest rank data for each saved keyword
    const withRankData = await Promise.all(
      savedKeywords.map(async (sk) => {
        const latestRows = await db.keyword.findMany({
          where: { siteId, query: sk.query, page: sk.ownerPage },
          orderBy: { date: "desc" },
          select: {
            clicks: true,
            impressions: true,
            ctr: true,
            position: true,
            page: true,
            date: true,
          },
        });
        const latestDate = latestRows[0]?.date;
        const rowsForLatestDate = latestDate
          ? latestRows.filter((row) => row.date.getTime() === latestDate.getTime())
          : [];
        const latestRank = latestDate
          ? {
              ...rollupKeywordMetrics(rowsForLatestDate),
              page: sk.ownerPage,
              date: latestDate,
            }
          : null;

        return {
          id: sk.id,
          query: sk.query,
          ownerPage: sk.ownerPage,
          intent: sk.intent,
          reviewedAt: sk.reviewedAt,
          status: sk.status,
          notes: sk.notes,
          createdAt: sk.createdAt,
          latestRank,
        };
      })
    );

    return Response.json(withRankData);
  } catch (error) {
    console.error("Saved keywords GET error:", error);
    return Response.json(
      { error: "Failed to load saved keywords" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
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

    const body = (await req.json()) as {
      query?: string;
      ownerPage?: string;
      intent?: string;
      reviewedAt?: string;
      status?: string;
      notes?: string;
    };
    if (!body.query || typeof body.query !== "string") {
      return Response.json(
        { error: "Missing required field: query" },
        { status: 400 }
      );
    }
    if (!body.ownerPage || typeof body.ownerPage !== "string") {
      return Response.json(
        { error: "Missing required field: ownerPage" },
        { status: 400 },
      );
    }

    let query: string;
    let ownerPage: string;
    let reviewedAt: Date | null = null;
    try {
      query = normalizeSavedQuery(body.query);
      ownerPage = normalizeOwnerPage(body.ownerPage, site.domain);
      if (body.reviewedAt) {
        reviewedAt = new Date(body.reviewedAt);
        if (Number.isNaN(reviewedAt.getTime())) {
          throw new Error("reviewedAt must be a valid date");
        }
      }
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid keyword owner" },
        { status: 400 },
      );
    }

    const status = body.status?.trim() || "active";
    if (!/^[a-z][a-z0-9_-]{1,31}$/.test(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const saved = await db.savedKeyword.upsert({
      where: {
        siteId_query: {
          siteId,
          query,
        },
      },
      create: {
        siteId,
        query,
        ownerPage,
        intent: body.intent?.trim() || null,
        reviewedAt,
        status,
        notes: body.notes ?? null,
      },
      update: {
        ownerPage,
        intent: body.intent?.trim() || null,
        reviewedAt,
        status,
        notes: body.notes ?? undefined,
      },
    });

    return Response.json(saved, { status: 201 });
  } catch (error) {
    console.error("Saved keywords POST error:", error);
    return Response.json(
      { error: "Failed to save keyword" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ siteId: string }> }
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

    const body = (await req.json()) as { query?: string; ownerPage?: string };
    if (!body.query || typeof body.query !== "string") {
      return Response.json(
        { error: "Missing required field: query" },
        { status: 400 }
      );
    }
    if (!body.ownerPage || typeof body.ownerPage !== "string") {
      return Response.json(
        { error: "Missing required field: ownerPage" },
        { status: 400 },
      );
    }

    const query = normalizeSavedQuery(body.query);
    let ownerPage: string;
    try {
      ownerPage = normalizeOwnerPage(body.ownerPage, site.domain);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Invalid ownerPage" },
        { status: 400 },
      );
    }

    const deleted = await db.savedKeyword.deleteMany({
      where: { siteId, query, ownerPage },
    });

    if (deleted.count === 0) {
      return Response.json({ error: "Saved keyword owner not found" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Saved keywords DELETE error:", error);
    return Response.json(
      { error: "Failed to delete saved keyword" },
      { status: 500 }
    );
  }
}
