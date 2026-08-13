-- Preserve the full GSC source grain. The previous query/day key silently
-- overwrote rows whenever the same query appeared for another landing page,
-- device, or country on the same day.

UPDATE "Keyword" SET "page" = '' WHERE "page" IS NULL;
UPDATE "Keyword" SET "device" = 'UNKNOWN' WHERE "device" IS NULL;
UPDATE "Keyword" SET "country" = 'unknown' WHERE "country" IS NULL;
ALTER TABLE "Keyword"
  ALTER COLUMN "page" SET NOT NULL,
  ALTER COLUMN "device" SET NOT NULL,
  ALTER COLUMN "country" SET NOT NULL;

DROP INDEX "Keyword_siteId_query_date_key";
CREATE UNIQUE INDEX "Keyword_siteId_query_date_page_device_country_key"
  ON "Keyword"("siteId", "query", "date", "page", "device", "country");
CREATE INDEX "Keyword_siteId_page_date_idx"
  ON "Keyword"("siteId", "page", "date");

ALTER TABLE "SavedKeyword"
  ADD COLUMN "ownerPage" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "intent" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SavedKeyword" ALTER COLUMN "ownerPage" DROP DEFAULT;

DROP INDEX "SavedKeyword_siteId_query_key";
CREATE UNIQUE INDEX "SavedKeyword_siteId_query_ownerPage_key"
  ON "SavedKeyword"("siteId", "query", "ownerPage");
CREATE INDEX "SavedKeyword_siteId_ownerPage_idx"
  ON "SavedKeyword"("siteId", "ownerPage");

ALTER TABLE "RankSnapshot" ALTER COLUMN "page" SET DEFAULT '';
UPDATE "RankSnapshot" SET "page" = '' WHERE "page" IS NULL;
ALTER TABLE "RankSnapshot" ALTER COLUMN "page" SET NOT NULL;

DROP INDEX "RankSnapshot_siteId_query_date_key";
CREATE UNIQUE INDEX "RankSnapshot_siteId_query_page_date_key"
  ON "RankSnapshot"("siteId", "query", "page", "date");
CREATE INDEX "RankSnapshot_siteId_page_date_idx"
  ON "RankSnapshot"("siteId", "page", "date");
