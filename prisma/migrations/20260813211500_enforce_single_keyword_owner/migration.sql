-- One reviewed query cluster has exactly one current canonical owner. Reassigning
-- a query updates that owner instead of creating a second active assignment.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "SavedKeyword"
    GROUP BY "siteId", "query"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'SavedKeyword contains duplicate query owners; resolve them before applying this migration';
  END IF;
END $$;

DROP INDEX IF EXISTS "SavedKeyword_siteId_query_ownerPage_key";
CREATE UNIQUE INDEX "SavedKeyword_siteId_query_key"
  ON "SavedKeyword"("siteId", "query");
