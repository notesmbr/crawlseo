-- A page-level measurement plan freezes the exact canonical baseline and the
-- human-approved success rule before implementation. Existing records remain
-- explicitly incomplete; unknown source values are never backfilled as zero.

ALTER TABLE "PageReview"
  ADD COLUMN "measurementPlanEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "measurementPlanDetails" JSONB;
