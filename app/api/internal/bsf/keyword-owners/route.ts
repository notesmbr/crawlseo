import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import {
  normalizeOwnerPage,
  normalizeSavedQuery,
} from "@/lib/saved-keyword-ownership";

export const dynamic = "force-dynamic";

type KeywordOwnerInput = {
  query?: string;
  ownerPage?: string;
  intent?: string;
  reviewedAt?: string;
  status?: string;
  notes?: string;
};

function unauthorized() {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function validAutomationToken(request: Request) {
  const configured =
    process.env.CRAWLSEO_AUTOMATION_TOKEN?.trim() || process.env.APP_SECRET?.trim();
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!configured || !supplied) return false;

  const configuredBuffer = Buffer.from(configured);
  const suppliedBuffer = Buffer.from(supplied);
  return (
    configuredBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(configuredBuffer, suppliedBuffer)
  );
}

function normalizedDomain(value: string) {
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function findSite(domain: string) {
  const sites = await db.site.findMany({ select: { id: true, domain: true } });
  return sites.find((site) => normalizedDomain(site.domain) === domain) ?? null;
}

export async function GET(request: Request) {
  if (!validAutomationToken(request)) return unauthorized();

  const domain = normalizedDomain(
    new URL(request.url).searchParams.get("domain") ?? "bluestreamfly.com",
  );
  const site = await findSite(domain);
  if (!site) {
    return Response.json({ error: `Site not configured: ${domain}` }, { status: 404 });
  }

  const owners = await db.savedKeyword.findMany({
    where: { siteId: site.id },
    orderBy: [{ query: "asc" }, { ownerPage: "asc" }],
    select: {
      id: true,
      query: true,
      ownerPage: true,
      intent: true,
      reviewedAt: true,
      status: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json(
    { ok: true, domain, count: owners.length, owners },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!validAutomationToken(request)) return unauthorized();

  let body: { domain?: string; owners?: KeywordOwnerInput[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const domain = normalizedDomain(body.domain ?? "bluestreamfly.com");
  const site = await findSite(domain);
  if (!site) {
    return Response.json({ error: `Site not configured: ${domain}` }, { status: 404 });
  }
  if (!Array.isArray(body.owners) || body.owners.length < 1 || body.owners.length > 100) {
    return Response.json(
      { error: "owners must contain between 1 and 100 records" },
      { status: 400 },
    );
  }

  try {
    const normalized = body.owners.map((owner) => {
      if (typeof owner.query !== "string" || typeof owner.ownerPage !== "string") {
        throw new Error("Each owner requires query and ownerPage");
      }
      const reviewedAt = owner.reviewedAt ? new Date(owner.reviewedAt) : null;
      if (reviewedAt && Number.isNaN(reviewedAt.getTime())) {
        throw new Error("reviewedAt must be a valid date");
      }
      const status = owner.status?.trim() || "active";
      if (!/^[a-z][a-z0-9_-]{1,31}$/.test(status)) throw new Error("Invalid status");

      return {
        query: normalizeSavedQuery(owner.query),
        ownerPage: normalizeOwnerPage(owner.ownerPage, domain),
        intent: owner.intent?.trim() || null,
        reviewedAt,
        status,
        notes: owner.notes?.trim() || null,
      };
    });

    const keys = new Set(normalized.map((owner) => owner.query));
    if (keys.size !== normalized.length) {
      throw new Error("Each query must have exactly one owner in a request");
    }

    const owners = await db.$transaction(
      normalized.map((owner) =>
        db.savedKeyword.upsert({
          where: {
            siteId_query: {
              siteId: site.id,
              query: owner.query,
            },
          },
          create: { siteId: site.id, ...owner },
          update: {
            ownerPage: owner.ownerPage,
            intent: owner.intent,
            reviewedAt: owner.reviewedAt,
            status: owner.status,
            notes: owner.notes,
          },
        }),
      ),
    );

    return Response.json(
      { ok: true, domain, upserted: owners.length, owners },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid keyword owners" },
      { status: 400 },
    );
  }
}
