import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  parsePageReviewInventory,
  type PageReviewInventoryEntry,
} from "../lib/page-review-inventory.ts";
import { pageReviewToApi } from "../lib/page-reviews.ts";
import {
  normalizeOwnerPage,
  normalizeSavedQuery,
} from "../lib/saved-keyword-ownership.ts";

const DEFAULT_INVENTORY_FILE = resolve(
  process.cwd(),
  "../BlueStreamFly-remove-research/docs/seo/seo-page-inventory.csv",
);
const DEFAULT_EXPECTED_PAGE_COUNT = 669;
const DEFAULT_EXPECTED_APPROVED_OWNER_COUNT = 8;

type Arguments = {
  apply: boolean;
  file: string;
  siteId: string | null;
  expectedPageCount: number;
  expectedApprovedOwnerCount: number;
};

function readArgumentValue(arguments_: string[], name: string) {
  const inline = arguments_.find((argument) => argument.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = arguments_.indexOf(name);
  return index >= 0 ? arguments_[index + 1] : undefined;
}

function positiveInteger(value: string | undefined, fallback: number, name: string) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return number;
}

function parseArguments(arguments_: string[]): Arguments {
  const apply = arguments_.includes("--apply");
  const siteId = readArgumentValue(arguments_, "--site-id")?.trim() || null;
  const file = resolve(
    readArgumentValue(arguments_, "--file")?.trim() || DEFAULT_INVENTORY_FILE,
  );
  const expectedPageCount = positiveInteger(
    readArgumentValue(arguments_, "--expected-count"),
    DEFAULT_EXPECTED_PAGE_COUNT,
    "--expected-count",
  );
  const expectedApprovedOwnerCount = positiveInteger(
    readArgumentValue(arguments_, "--expected-approved"),
    DEFAULT_EXPECTED_APPROVED_OWNER_COUNT,
    "--expected-approved",
  );

  if (apply && !siteId) {
    throw new Error("--apply requires an explicit --site-id");
  }
  return { apply, file, siteId, expectedPageCount, expectedApprovedOwnerCount };
}

function familyCounts(entries: PageReviewInventoryEntry[]) {
  return Object.fromEntries(
    [...new Set(entries.map((entry) => entry.pageFamily))]
      .sort()
      .map((family) => [
        family.toLowerCase(),
        entries.filter((entry) => entry.pageFamily === family).length,
      ]),
  );
}

function sameDomain(canonicalUrl: string, domain: string) {
  return (
    new URL(canonicalUrl).hostname.replace(/^www\./, "").toLowerCase() ===
    domain.replace(/^www\./, "").toLowerCase()
  );
}

async function inspectDatabase(
  prisma: PrismaClient,
  siteId: string,
  entries: PageReviewInventoryEntry[],
  expectedApprovedOwnerCount: number,
) {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { id: true, userId: true, domain: true },
  });
  if (!site) throw new Error(`Site not found: ${siteId}`);

  const invalidDomain = entries.find(
    (entry) => !sameDomain(entry.canonicalUrl, site.domain),
  );
  if (invalidDomain) {
    throw new Error(
      `Inventory canonical does not belong to ${site.domain}: ${invalidDomain.canonicalUrl}`,
    );
  }

  const [existing, approvedSavedKeywords] = await Promise.all([
    prisma.pageReview.findMany({ where: { siteId, deletedAt: null } }),
    prisma.savedKeyword.findMany({
      where: { siteId, status: "active", reviewedAt: { not: null } },
      select: { query: true, ownerPage: true, reviewedAt: true },
      orderBy: [{ reviewedAt: "asc" }, { query: "asc" }],
    }),
  ]);

  if (approvedSavedKeywords.length !== expectedApprovedOwnerCount) {
    throw new Error(
      `Expected ${expectedApprovedOwnerCount} approved SavedKeyword owners but found ${approvedSavedKeywords.length}. Review the saved owners or deliberately pass --expected-approved=<count>.`,
    );
  }

  const inventoryCanonicals = new Set(entries.map((entry) => entry.canonicalUrl));
  const approvalsByCanonical = new Map<
    string,
    { query: string; ownerPage: string }
  >();
  for (const savedKeyword of approvedSavedKeywords) {
    const ownerPage = normalizeOwnerPage(savedKeyword.ownerPage, site.domain);
    const query = normalizeSavedQuery(savedKeyword.query);
    if (!inventoryCanonicals.has(ownerPage)) {
      throw new Error(
        `Approved SavedKeyword owner is not present in the inventory: ${ownerPage}`,
      );
    }
    if (approvalsByCanonical.has(ownerPage)) {
      throw new Error(
        `More than one approved primary query points to ${ownerPage}; choose one before seeding`,
      );
    }
    approvalsByCanonical.set(ownerPage, { query, ownerPage });
  }

  const existingByCanonical = new Map(
    existing.map((review) => [review.canonicalUrl, review]),
  );
  const existingByPageId = new Map(existing.map((review) => [review.pageId, review]));
  const missing: PageReviewInventoryEntry[] = [];
  const carryForwardUpdates: Array<{
    review: (typeof existing)[number];
    query: string;
  }> = [];

  for (const entry of entries) {
    const canonicalMatch = existingByCanonical.get(entry.canonicalUrl);
    const pageIdMatch = existingByPageId.get(entry.pageId);
    if (
      (canonicalMatch && canonicalMatch.pageId !== entry.pageId) ||
      (pageIdMatch && pageIdMatch.canonicalUrl !== entry.canonicalUrl)
    ) {
      throw new Error(
        `Existing page-review identity conflicts with inventory: ${entry.pageId} / ${entry.canonicalUrl}`,
      );
    }

    const current = canonicalMatch ?? pageIdMatch;
    if (!current) {
      missing.push(entry);
      continue;
    }

    const approval = approvalsByCanonical.get(entry.canonicalUrl);
    if (!approval) continue;
    if (
      current.keywordOwnership === "THIS_PAGE" &&
      current.primaryKeywordNormalized === approval.query
    ) {
      continue;
    }
    if (
      current.reviewStatus === "UNREVIEWED" &&
      current.keywordOwnership === "UNDECIDED" &&
      current.primaryKeywordNormalized === null
    ) {
      carryForwardUpdates.push({ review: current, query: approval.query });
      continue;
    }
    throw new Error(
      `Preserving reviewed data requires manual resolution for ${entry.canonicalUrl}; its current keyword state conflicts with approved query "${approval.query}"`,
    );
  }

  return {
    site,
    existing,
    missing,
    approvalsByCanonical,
    carryForwardUpdates,
  };
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  const entries = parsePageReviewInventory(await readFile(arguments_.file, "utf8"));
  if (entries.length !== arguments_.expectedPageCount) {
    throw new Error(
      `Expected ${arguments_.expectedPageCount} inventory pages but found ${entries.length}`,
    );
  }

  if (!arguments_.siteId) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run-file-check",
          apply: false,
          inventoryFile: arguments_.file,
          inventoryPages: entries.length,
          familyCounts: familyCounts(entries),
          nextStep:
            "Re-run with --site-id=<id> for a read-only database plan, then add --apply to seed deliberately.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const prisma = new PrismaClient();
  try {
    const inspection = await inspectDatabase(
      prisma,
      arguments_.siteId,
      entries,
      arguments_.expectedApprovedOwnerCount,
    );
    const plan = {
      inventoryPages: entries.length,
      existingInventoryPages: entries.length - inspection.missing.length,
      pagesToCreate: inspection.missing.length,
      approvedOwners: inspection.approvalsByCanonical.size,
      existingPagesToReceiveApprovedOwner: inspection.carryForwardUpdates.length,
    };

    if (!arguments_.apply) {
      console.log(
        JSON.stringify(
          {
            mode: "dry-run-database-plan",
            apply: false,
            siteId: arguments_.siteId,
            ...plan,
            nextStep: "Review this plan, then re-run the same command with --apply.",
          },
          null,
          2,
        ),
      );
      return;
    }

    const now = new Date();
    const newRows = inspection.missing.map((entry) => {
      const approval = inspection.approvalsByCanonical.get(entry.canonicalUrl);
      return {
        id: randomUUID(),
        siteId: arguments_.siteId as string,
        pageId: entry.pageId,
        canonicalUrl: entry.canonicalUrl,
        pageFamily: entry.pageFamily,
        indexPolicy: "INDEX" as const,
        reviewStatus: "UNREVIEWED" as const,
        priority: "NONE" as const,
        keywordOwnership: approval ? ("THIS_PAGE" as const) : ("UNDECIDED" as const),
        primaryKeyword: approval?.query ?? null,
        primaryKeywordNormalized: approval?.query ?? null,
        keywordOwnerCanonical: null,
        keywordNotApplicableReason: null,
        secondaryKeywords: [],
        clusterGaps: [],
        keywordPlannerEvidenceState: "MISSING" as const,
        keywordPlannerEvidenceDetails: Prisma.DbNull,
        googleTrendsEvidenceState: "MISSING" as const,
        googleTrendsEvidenceDetails: Prisma.DbNull,
        measurementPlanEvidenceState: "MISSING" as const,
        measurementPlanDetails: Prisma.DbNull,
        serpFeatures: [],
        serpResults: [],
        serpCompetition: "UNCLEAR" as const,
        serpEvidenceState: "MISSING" as const,
        eeatEvidence: [],
        eeatGaps: [],
        eeatEvidenceDetails: [],
        eeatEvidenceState: "MISSING" as const,
        updatedAt: now,
      } satisfies Prisma.PageReviewCreateManyInput;
    });

    const result = await prisma.$transaction(
      async (transaction) => {
        if (newRows.length > 0) {
          await transaction.pageReview.createMany({ data: newRows });
        }
        const created = newRows.length
          ? await transaction.pageReview.findMany({
              where: { id: { in: newRows.map((row) => row.id) } },
            })
          : [];
        if (created.length !== newRows.length) {
          throw new Error("Not every planned PageReview record was created");
        }
        if (created.length > 0) {
          await transaction.pageReviewRevision.createMany({
            data: created.map((review) => ({
              id: randomUUID(),
              siteId: review.siteId,
              reviewId: review.id,
              version: review.version,
              changeType: "SEEDED",
              changedFields: [
                "pageId",
                "canonicalUrl",
                "pageFamily",
                "indexPolicy",
                ...(review.keywordOwnership === "THIS_PAGE" ? ["keyword"] : []),
              ],
              snapshot: pageReviewToApi(review) as Prisma.InputJsonValue,
              changeNote:
                review.keywordOwnership === "THIS_PAGE"
                  ? "Manual inventory seed with one-time carry-forward of an approved SavedKeyword owner"
                  : "Manual inventory seed",
              changedByUserId: inspection.site.userId,
            })),
          });
        }

        const carriedForward = [];
        for (const item of inspection.carryForwardUpdates) {
          const review = await transaction.pageReview.update({
            where: { id: item.review.id },
            data: {
              keywordOwnership: "THIS_PAGE",
              primaryKeyword: item.query,
              primaryKeywordNormalized: item.query,
              version: { increment: 1 },
            },
          });
          await transaction.pageReviewRevision.create({
            data: {
              siteId: review.siteId,
              reviewId: review.id,
              version: review.version,
              changeType: "UPDATED",
              changedFields: ["keyword"],
              snapshot: pageReviewToApi(review) as Prisma.InputJsonValue,
              changeNote:
                "One-time carry-forward of a user-approved SavedKeyword owner during manual inventory seed",
              changedByUserId: inspection.site.userId,
            },
          });
          carriedForward.push(review.id);
        }

        const covered = await transaction.pageReview.count({
          where: {
            siteId: arguments_.siteId as string,
            deletedAt: null,
            canonicalUrl: { in: entries.map((entry) => entry.canonicalUrl) },
          },
        });
        if (covered !== entries.length) {
          throw new Error(
            `Post-seed coverage check found ${covered} of ${entries.length} inventory pages`,
          );
        }
        return { created: created.length, carriedForward: carriedForward.length, covered };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    console.log(
      JSON.stringify(
        {
          mode: "applied",
          apply: true,
          siteId: arguments_.siteId,
          ...plan,
          created: result.created,
          approvedOwnersCarriedForwardToExisting: result.carriedForward,
          inventoryPagesCovered: result.covered,
          note: "This was an explicit one-time import; no synchronization or scheduling was installed.",
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
