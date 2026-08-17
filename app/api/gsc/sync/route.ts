import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncGSCDataForSite } from "@/lib/workers/gsc-sync";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { siteId?: unknown; daysBack?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.siteId !== "string" || !body.siteId.trim()) {
    return Response.json({ error: "siteId is required." }, { status: 400 });
  }
  const daysBack = body.daysBack === undefined ? 28 : Number(body.daysBack);
  if (!Number.isInteger(daysBack) || daysBack < 1 || daysBack > 90) {
    return Response.json(
      { error: "daysBack must be a whole number from 1 to 90." },
      { status: 400 },
    );
  }

  const site = await db.site.findUnique({
    where: { id: body.siteId },
    select: { userId: true },
  });
  if (!site || site.userId !== session.user.id) {
    return Response.json({ error: "Site not found or unauthorized" }, { status: 404 });
  }

  const result = await syncGSCDataForSite(
    session.user.id,
    body.siteId,
    daysBack,
  );
  if (!result.success) {
    return Response.json(
      {
        error: result.error ?? "Search Console synchronization failed.",
        code: result.errorCode ?? "GSC_SYNC_FAILED",
        runId: result.runId ?? null,
      },
      {
        status:
          result.errorCode === "REAUTH_REQUIRED"
            ? 401
            : result.errorCode === "GSC_NOT_CONNECTED"
              ? 400
              : 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
