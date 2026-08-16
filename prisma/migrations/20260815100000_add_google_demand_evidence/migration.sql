-- Keyword demand evidence is stored independently from organic SERP evidence.
-- Existing reviews remain explicitly incomplete until a person checks the
-- official Google tools and records the evidence.

ALTER TABLE "PageReview"
  ADD COLUMN "keywordPlannerEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "keywordPlannerEvidenceDetails" JSONB,
  ADD COLUMN "googleTrendsEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "googleTrendsEvidenceDetails" JSONB;
