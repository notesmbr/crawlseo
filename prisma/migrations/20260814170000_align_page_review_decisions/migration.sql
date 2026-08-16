-- Keep the structured decision vocabulary aligned with the manual SEO review
-- plan. This forward migration is required because the base PageReview
-- migration may already be applied in a local CrawlSEO database.

ALTER TYPE "PageDecisionState" ADD VALUE IF NOT EXISTS 'INCONCLUSIVE';
ALTER TYPE "PageDecisionState" ADD VALUE IF NOT EXISTS 'ITERATE';
ALTER TYPE "PageDecisionState" ADD VALUE IF NOT EXISTS 'REDIRECT';
ALTER TYPE "PageDecisionState" ADD VALUE IF NOT EXISTS 'NOINDEX';
ALTER TYPE "PageDecisionState" ADD VALUE IF NOT EXISTS 'ROLLBACK';
