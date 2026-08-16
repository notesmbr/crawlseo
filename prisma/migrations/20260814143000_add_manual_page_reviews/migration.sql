-- Manual, page-by-page SEO review records. This migration deliberately adds no
-- jobs, schedules, triggers, or SavedKeyword synchronization.

CREATE TYPE "PageFamily" AS ENUM (
  'HOME',
  'REPORT_DIRECTORY',
  'STATE_REPORT_HUB',
  'RIVER_REPORT',
  'ARTICLE_DIRECTORY',
  'ARTICLE',
  'FLY_DIRECTORY',
  'FLY_FAMILY_GUIDE',
  'FLY_PATTERN_GUIDE',
  'WEEKLY_CONDITIONS_HUB',
  'WIDGET_LANDING_PAGE',
  'TRUST_COMPANY',
  'TRUST_METHODOLOGY',
  'LEGAL',
  'SUPPORT',
  'UTILITY',
  'OTHER'
);

CREATE TYPE "IndexPolicy" AS ENUM (
  'INDEX', 'NOINDEX', 'REDIRECT', 'REMOVE', 'UNDECIDED'
);

CREATE TYPE "PageReviewStatus" AS ENUM (
  'UNREVIEWED',
  'QUEUED',
  'RESEARCHING',
  'READY_NO_CHANGE',
  'READY_TO_CHANGE',
  'MONITORING',
  'COMPLETE',
  'BLOCKED'
);

CREATE TYPE "ReviewPriority" AS ENUM ('NONE', 'P0', 'P1', 'P2', 'P3', 'P4');

CREATE TYPE "KeywordOwnershipStatus" AS ENUM (
  'THIS_PAGE', 'ANOTHER_CANONICAL', 'UNDECIDED', 'NOT_APPLICABLE'
);

CREATE TYPE "EvidenceState" AS ENUM (
  'VERIFIED', 'PARTIAL', 'MISSING', 'NOT_APPLICABLE'
);

CREATE TYPE "ManualChatState" AS ENUM (
  'AWAITING_USER_SELECTION',
  'RESEARCHING',
  'AWAITING_USER_DECISION',
  'APPROVED_TO_RECORD',
  'APPROVED_TO_IMPLEMENT',
  'COMPLETE'
);

CREATE TYPE "SearchIntent" AS ENUM (
  'UNKNOWN',
  'INFORMATIONAL',
  'LOCAL_TRIP_PLANNING',
  'COMMERCIAL_INVESTIGATION',
  'TRANSACTIONAL',
  'NAVIGATIONAL',
  'SAFETY_OR_RULES',
  'MIXED',
  'NOT_APPLICABLE'
);

CREATE TYPE "SerpDevice" AS ENUM ('DESKTOP', 'MOBILE');
CREATE TYPE "SerpReviewMethod" AS ENUM ('MANUAL_GOOGLE', 'MANUAL_OTHER');

CREATE TYPE "PageDecisionState" AS ENUM (
  'PENDING',
  'NO_CHANGE',
  'CHANGE_RECOMMENDED',
  'KEEP',
  'EXPAND',
  'REVISE',
  'MERGE',
  'RETIRE',
  'BLOCKED'
);

CREATE TYPE "PageChangeState" AS ENUM (
  'NOT_PLANNED', 'PLANNED', 'IN_PROGRESS', 'SHIPPED', 'VERIFIED', 'REVERTED'
);

CREATE TYPE "ReviewGateState" AS ENUM (
  'NOT_DUE', 'DUE', 'RECORDED', 'MISSED', 'NOT_APPLICABLE'
);

CREATE TYPE "PageReviewChangeType" AS ENUM (
  'CREATED', 'UPDATED', 'DELETED', 'RESTORED', 'SEEDED'
);

CREATE TABLE "PageReview" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "canonicalUrl" TEXT NOT NULL,
  "pageFamily" "PageFamily" NOT NULL,
  "indexPolicy" "IndexPolicy" NOT NULL,
  "reviewStatus" "PageReviewStatus" NOT NULL DEFAULT 'UNREVIEWED',
  "priority" "ReviewPriority" NOT NULL DEFAULT 'NONE',
  "keywordOwnership" "KeywordOwnershipStatus" NOT NULL DEFAULT 'UNDECIDED',
  "primaryKeyword" TEXT,
  "primaryKeywordNormalized" TEXT,
  "keywordOwnerCanonical" TEXT,
  "keywordNotApplicableReason" TEXT,
  "secondaryKeywords" JSONB,
  "topicCluster" TEXT,
  "parentPage" TEXT,
  "clusterGaps" JSONB,
  "maintenanceOwner" TEXT,
  "editorialOwner" TEXT,
  "searchIntent" "SearchIntent" NOT NULL DEFAULT 'UNKNOWN',
  "jobToBeDone" TEXT,
  "serpSnapshotAt" TIMESTAMP(3),
  "serpQuery" TEXT,
  "serpLocale" TEXT,
  "serpDevice" "SerpDevice",
  "serpMethod" "SerpReviewMethod",
  "serpEvidenceSummary" TEXT,
  "serpFeatures" JSONB,
  "serpCompetitionSummary" TEXT,
  "serpResults" JSONB,
  "competitorOffer" TEXT,
  "currentOffer" TEXT,
  "differentiation" TEXT,
  "differentiationEvidenceState" "EvidenceState" NOT NULL DEFAULT 'MISSING',
  "eeatEvidence" JSONB,
  "eeatGaps" JSONB,
  "eeatEvidenceDetails" JSONB,
  "decisionState" "PageDecisionState" NOT NULL DEFAULT 'PENDING',
  "decisionRationale" TEXT,
  "proposedChange" TEXT,
  "changeState" "PageChangeState" NOT NULL DEFAULT 'NOT_PLANNED',
  "changeId" TEXT,
  "changedAt" TIMESTAMP(3),
  "day7State" "ReviewGateState" NOT NULL DEFAULT 'NOT_DUE',
  "day7DueAt" TIMESTAMP(3),
  "day7ReviewedAt" TIMESTAMP(3),
  "day7Evidence" TEXT,
  "day7Decision" TEXT,
  "day7Rationale" TEXT,
  "day7NextAction" TEXT,
  "day28State" "ReviewGateState" NOT NULL DEFAULT 'NOT_DUE',
  "day28DueAt" TIMESTAMP(3),
  "day28ReviewedAt" TIMESTAMP(3),
  "day28Evidence" TEXT,
  "day28Decision" TEXT,
  "day28Rationale" TEXT,
  "day28NextAction" TEXT,
  "day56State" "ReviewGateState" NOT NULL DEFAULT 'NOT_DUE',
  "day56DueAt" TIMESTAMP(3),
  "day56ReviewedAt" TIMESTAMP(3),
  "day56Evidence" TEXT,
  "day56Decision" TEXT,
  "day56Rationale" TEXT,
  "day56NextAction" TEXT,
  "firstReviewedAt" TIMESTAMP(3),
  "lastReviewedAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3),
  "manualNotes" TEXT,
  "manualChatState" "ManualChatState" NOT NULL DEFAULT 'AWAITING_USER_SELECTION',
  "userDecisionReference" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PageReview_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PageReview_version_check" CHECK ("version" >= 1),
  CONSTRAINT "PageReview_keyword_ownership_check" CHECK (
    ("keywordOwnership" = 'THIS_PAGE' AND "primaryKeywordNormalized" IS NOT NULL AND "keywordOwnerCanonical" IS NULL AND "keywordNotApplicableReason" IS NULL)
    OR ("keywordOwnership" = 'ANOTHER_CANONICAL' AND "primaryKeywordNormalized" IS NOT NULL AND "keywordOwnerCanonical" IS NOT NULL AND "keywordOwnerCanonical" <> "canonicalUrl" AND "keywordNotApplicableReason" IS NULL)
    OR ("keywordOwnership" = 'NOT_APPLICABLE' AND "primaryKeywordNormalized" IS NULL AND "keywordOwnerCanonical" IS NULL AND "keywordNotApplicableReason" IS NOT NULL)
    OR ("keywordOwnership" = 'UNDECIDED' AND "keywordOwnerCanonical" IS NULL AND "keywordNotApplicableReason" IS NULL)
  )
);

CREATE TABLE "PageReviewRevision" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "changeType" "PageReviewChangeType" NOT NULL,
  "changedFields" JSONB NOT NULL,
  "snapshot" JSONB NOT NULL,
  "changeNote" TEXT,
  "changedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PageReviewRevision_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PageReview"
  ADD CONSTRAINT "PageReview_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PageReviewRevision"
  ADD CONSTRAINT "PageReviewRevision_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PageReviewRevision"
  ADD CONSTRAINT "PageReviewRevision_reviewId_fkey"
  FOREIGN KEY ("reviewId") REFERENCES "PageReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PageReview_siteId_canonicalUrl_idx"
  ON "PageReview"("siteId", "canonicalUrl");
CREATE INDEX "PageReview_siteId_pageId_idx"
  ON "PageReview"("siteId", "pageId");
CREATE INDEX "PageReview_siteId_reviewStatus_priority_idx"
  ON "PageReview"("siteId", "reviewStatus", "priority");
CREATE INDEX "PageReview_siteId_pageFamily_idx"
  ON "PageReview"("siteId", "pageFamily");
CREATE INDEX "PageReview_siteId_topicCluster_idx"
  ON "PageReview"("siteId", "topicCluster");
CREATE INDEX "PageReview_siteId_primaryKeywordNormalized_idx"
  ON "PageReview"("siteId", "primaryKeywordNormalized");
CREATE UNIQUE INDEX "PageReviewRevision_reviewId_version_key"
  ON "PageReviewRevision"("reviewId", "version");
CREATE INDEX "PageReviewRevision_siteId_createdAt_idx"
  ON "PageReviewRevision"("siteId", "createdAt");

-- Only non-deleted reviews are current. A deleted record remains available for
-- audit history without permanently reserving its identity.
CREATE UNIQUE INDEX "PageReview_one_current_canonical_per_site"
  ON "PageReview"("siteId", "canonicalUrl")
  WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "PageReview_one_current_page_id_per_site"
  ON "PageReview"("siteId", "pageId")
  WHERE "deletedAt" IS NULL;

-- A normalized query has one current owner. References to another canonical do
-- not compete for ownership and SavedKeyword remains an independent registry.
CREATE UNIQUE INDEX "PageReview_one_current_primary_keyword_owner"
  ON "PageReview"("siteId", "primaryKeywordNormalized")
  WHERE "deletedAt" IS NULL
    AND "keywordOwnership" = 'THIS_PAGE'
    AND "primaryKeywordNormalized" IS NOT NULL;

-- Manual review is intentionally sequential: one active page per site. Merely
-- waiting for a selection and completed records do not occupy the active slot.
CREATE UNIQUE INDEX "PageReview_one_active_manual_chat_per_site"
  ON "PageReview"("siteId")
  WHERE "deletedAt" IS NULL
    AND "manualChatState" IN (
      'RESEARCHING',
      'AWAITING_USER_DECISION',
      'APPROVED_TO_RECORD',
      'APPROVED_TO_IMPLEMENT'
    );
