CREATE TYPE "PagePerformanceState" AS ENUM (
  'UNASSESSED',
  'CRITICAL_DEFECT',
  'NO_OR_NEAR_ZERO_VISIBILITY',
  'IMPRESSIONS_WITHOUT_RESULT',
  'EARLY_OPPORTUNITY',
  'DEMONSTRATED_WINNER',
  'INSUFFICIENT_OBSERVATION'
);

CREATE TYPE "PageChangeScope" AS ENUM (
  'UNDECIDED',
  'FOCUSED',
  'COMPREHENSIVE',
  'NOT_APPLICABLE'
);

CREATE TYPE "PageChangeBlastRadius" AS ENUM (
  'UNDECIDED',
  'PAGE_LOCAL',
  'SHARED_TEMPLATE',
  'GLOBAL_NAVIGATION',
  'SOURCE_SENSITIVE',
  'NOT_APPLICABLE'
);

CREATE TYPE "PageExperimentState" AS ENUM (
  'UNCHECKED',
  'NONE',
  'FROZEN',
  'APPROVED_CONTAMINATION'
);

ALTER TABLE "PageReview"
  ADD COLUMN "performanceState" "PagePerformanceState" NOT NULL DEFAULT 'UNASSESSED',
  ADD COLUMN "changeScope" "PageChangeScope" NOT NULL DEFAULT 'UNDECIDED',
  ADD COLUMN "scopeRationale" TEXT,
  ADD COLUMN "demonstratedWins" JSONB,
  ADD COLUMN "preservedElements" JSONB,
  ADD COLUMN "intentionallyChangedElements" JSONB,
  ADD COLUMN "changeBlastRadius" "PageChangeBlastRadius" NOT NULL DEFAULT 'UNDECIDED',
  ADD COLUMN "affectedPageFamily" "PageFamily",
  ADD COLUMN "affectedCanonicalCount" INTEGER,
  ADD COLUMN "blastRadiusNote" TEXT,
  ADD COLUMN "experimentState" "PageExperimentState" NOT NULL DEFAULT 'UNCHECKED',
  ADD COLUMN "experimentId" TEXT,
  ADD COLUMN "experimentFrozenUntil" TIMESTAMP(3),
  ADD COLUMN "experimentExceptionReason" TEXT,
  ADD COLUMN "rollbackTrigger" TEXT;

ALTER TABLE "PageReview"
  ADD CONSTRAINT "PageReview_affectedCanonicalCount_check"
  CHECK ("affectedCanonicalCount" IS NULL OR "affectedCanonicalCount" > 0);

CREATE INDEX "PageReview_siteId_performanceState_idx"
  ON "PageReview"("siteId", "performanceState");

CREATE INDEX "PageReview_siteId_changeScope_changeBlastRadius_idx"
  ON "PageReview"("siteId", "changeScope", "changeBlastRadius");

CREATE INDEX "PageReview_siteId_experimentState_idx"
  ON "PageReview"("siteId", "experimentState");
