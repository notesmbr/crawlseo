-- Persist the evidence that every manual page review must explicitly inspect.
-- Existing reviews start as MISSING so old free-form notes cannot be mistaken
-- for completed structured checks.
ALTER TABLE "PageReview"
  ADD COLUMN "mediaAccuracyEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "mediaAccuracyDetails" JSONB,
  ADD COLUMN "searchAppearanceEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "searchAppearanceDetails" JSONB,
  ADD COLUMN "readabilityUserFriendlinessEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "readabilityUserFriendlinessDetails" JSONB,
  ADD COLUMN "technicalSnapshotEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "technicalSnapshotDetails" JSONB;
