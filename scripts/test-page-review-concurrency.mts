import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

const databaseUrl = process.env.PAGE_REVIEW_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Set PAGE_REVIEW_TEST_DATABASE_URL to an isolated migrated Postgres test database",
  );
}
const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, "").toLowerCase();
if (!databaseName.includes("test")) {
  throw new Error(
    "Refusing to run concurrency checks unless the database name contains 'test'",
  );
}

const prisma = new PrismaClient({
  datasourceUrl: databaseUrl,
  log: ["error"],
});

function reviewData(
  siteId: string,
  suffix: string,
  extra: Partial<Prisma.PageReviewUncheckedCreateInput> = {},
) {
  return {
    id: randomUUID(),
    siteId,
    pageId: `concurrency-${suffix}`,
    canonicalUrl: `https://concurrency.example.test/${suffix}`,
    pageFamily: "OTHER" as const,
    indexPolicy: "INDEX" as const,
    secondaryKeywords: [],
    clusterGaps: [],
    serpFeatures: [],
    serpResults: [],
    eeatEvidence: [],
    eeatGaps: [],
    eeatEvidenceDetails: [],
    ...extra,
  } satisfies Prisma.PageReviewUncheckedCreateInput;
}

function assertOneWinner(
  results: PromiseSettledResult<unknown>[],
  label: string,
) {
  const winners = results.filter((result) => result.status === "fulfilled");
  const losers = results.filter((result) => result.status === "rejected");
  if (winners.length !== 1 || losers.length !== 1) {
    throw new Error(
      `${label}: expected one concurrent winner and one database-rejected loser; got ${winners.length}/${losers.length}`,
    );
  }
  const reason = (losers[0] as PromiseRejectedResult).reason;
  if (
    !(reason instanceof Prisma.PrismaClientKnownRequestError) ||
    reason.code !== "P2002"
  ) {
    throw new Error(`${label}: loser was not rejected by a unique index`);
  }
}

const userId = randomUUID();
try {
  await prisma.user.create({
    data: {
      id: userId,
      email: `page-review-concurrency-${userId}@example.test`,
    },
  });
  const site = await prisma.site.create({
    data: {
      id: randomUUID(),
      userId,
      domain: "concurrency.example.test",
    },
  });

  const activeRace = await Promise.allSettled([
    prisma.pageReview.create({
      data: reviewData(site.id, "active-one", {
        manualChatState: "RESEARCHING",
      }),
    }),
    prisma.pageReview.create({
      data: reviewData(site.id, "active-two", {
        manualChatState: "AWAITING_USER_DECISION",
      }),
    }),
  ]);
  assertOneWinner(activeRace, "one active manual review per site");

  await prisma.pageReview.deleteMany({ where: { siteId: site.id } });
  const ownerRace = await Promise.allSettled([
    prisma.pageReview.create({
      data: reviewData(site.id, "owner-one", {
        keywordOwnership: "THIS_PAGE",
        primaryKeyword: "same buyer-intent query",
        primaryKeywordNormalized: "same buyer-intent query",
      }),
    }),
    prisma.pageReview.create({
      data: reviewData(site.id, "owner-two", {
        keywordOwnership: "THIS_PAGE",
        primaryKeyword: "same buyer-intent query",
        primaryKeywordNormalized: "same buyer-intent query",
      }),
    }),
  ]);
  assertOneWinner(ownerRace, "one THIS_PAGE owner per normalized query");

  await prisma.pageReview.deleteMany({ where: { siteId: site.id } });
  const approvedReview = await prisma.pageReview.create({
    data: reviewData(site.id, "approved-monitoring", {
      reviewStatus: "READY_TO_CHANGE",
      manualChatState: "APPROVED_TO_IMPLEMENT",
      userDecisionReference: "User approved implementation in task 123",
      decisionState: "CHANGE_RECOMMENDED",
      changeState: "SHIPPED",
      changeId: "commit-monitoring-123",
      changedAt: new Date("2026-08-14T14:00:00.000Z"),
      day7State: "DUE",
      day7Evidence: "Waiting for the first measurement check.",
    }),
  });
  const monitoringReview = await prisma.pageReview.update({
    where: { id: approvedReview.id },
    data: {
      reviewStatus: "MONITORING",
      manualChatState: "MONITORING",
    },
  });
  if (
    monitoringReview.userDecisionReference !==
      approvedReview.userDecisionReference ||
    monitoringReview.changeId !== approvedReview.changeId ||
    monitoringReview.day7Evidence !== approvedReview.day7Evidence
  ) {
    throw new Error(
      "monitoring transition did not preserve the approved decision, change, and gate evidence",
    );
  }
  await prisma.pageReview.create({
    data: reviewData(site.id, "next-active-after-monitoring", {
      manualChatState: "RESEARCHING",
    }),
  });
  const activeAfterMonitoring = await prisma.pageReview.count({
    where: {
      siteId: site.id,
      deletedAt: null,
      manualChatState: {
        in: [
          "RESEARCHING",
          "AWAITING_USER_DECISION",
          "APPROVED_TO_RECORD",
          "APPROVED_TO_IMPLEMENT",
        ],
      },
    },
  });
  if (activeAfterMonitoring !== 1) {
    throw new Error(
      `monitoring should release the active slot; found ${activeAfterMonitoring} active reviews`,
    );
  }

  console.log("Page-review database concurrency checks passed.");
} finally {
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
