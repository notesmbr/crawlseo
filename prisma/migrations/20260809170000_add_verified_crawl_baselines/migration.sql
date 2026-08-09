-- AlterTable
ALTER TABLE "Site"
ADD COLUMN "crawlBaselineId" TEXT,
ADD COLUMN "crawlBaselineVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Crawl"
ALTER COLUMN "maxPages" SET DEFAULT 1000,
ADD COLUMN "isBaseline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "baselineVerifiedAt" TIMESTAMP(3),
ADD COLUMN "newIssuesFound" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "verifiedIssuesFound" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CrawlIssue"
ADD COLUMN "fingerprint" TEXT,
ADD COLUMN "isNew" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isActionable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suppressedReason" TEXT;

-- CreateIndex
CREATE INDEX "CrawlIssue_crawlId_isNew_isVerified_idx"
ON "CrawlIssue"("crawlId", "isNew", "isVerified");

-- CreateIndex
CREATE INDEX "CrawlIssue_fingerprint_idx" ON "CrawlIssue"("fingerprint");
