-- Structured competition and evidence-completeness states were added after the
-- base PageReview migration was deployed. Existing records remain explicitly
-- incomplete until a person reviews them.

CREATE TYPE "SerpCompetition" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'UNCLEAR');

ALTER TABLE "PageReview"
  ADD COLUMN "serpCompetition" "SerpCompetition" NOT NULL DEFAULT 'UNCLEAR',
  ADD COLUMN "serpEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "eeatEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING';
