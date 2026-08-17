CREATE TYPE "MeasurementSource" AS ENUM ('GSC', 'GA4', 'PAGESPEED');
CREATE TYPE "MeasurementRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');
CREATE TYPE "MeasurementFreshnessState" AS ENUM ('CURRENT', 'STALE', 'NO_DATA', 'UNKNOWN');
CREATE TYPE "MeasurementTrafficScope" AS ENUM ('ORGANIC_SEARCH');
CREATE TYPE "VitalsEvidenceState" AS ENUM ('MISSING', 'AVAILABLE', 'NO_URL_LEVEL_DATA', 'QUOTA_EXHAUSTED', 'FAILED');

CREATE TABLE "MeasurementSyncRun" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "source" "MeasurementSource" NOT NULL,
  "status" "MeasurementRunStatus" NOT NULL DEFAULT 'RUNNING',
  "canonicalUrl" TEXT,
  "windowStart" TIMESTAMP(3),
  "windowEnd" TIMESTAMP(3),
  "rowsFetched" INTEGER NOT NULL DEFAULT 0,
  "rowsWritten" INTEGER NOT NULL DEFAULT 0,
  "latestDataDate" TIMESTAMP(3),
  "freshnessState" "MeasurementFreshnessState" NOT NULL DEFAULT 'UNKNOWN',
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "MeasurementSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ga4PageMetric" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "syncRunId" TEXT,
  "canonicalUrl" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "trafficScope" "MeasurementTrafficScope" NOT NULL DEFAULT 'ORGANIC_SEARCH',
  "screenPageViews" INTEGER NOT NULL DEFAULT 0,
  "sessions" INTEGER NOT NULL DEFAULT 0,
  "engagedSessions" INTEGER NOT NULL DEFAULT 0,
  "activeUsers" INTEGER NOT NULL DEFAULT 0,
  "keyEvents" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ga4PageMetric_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "VitalsReport"
  ADD COLUMN "syncRunId" TEXT,
  ADD COLUMN "evidenceState" "VitalsEvidenceState" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'PAGESPEED_INSIGHTS',
  ADD COLUMN "analysisAt" TIMESTAMP(3),
  ADD COLUMN "fieldDataCategory" TEXT,
  ADD COLUMN "originFieldDataAvailable" BOOLEAN,
  ADD COLUMN "errorCode" TEXT,
  ADD COLUMN "errorMessage" TEXT;

CREATE INDEX "MeasurementSyncRun_siteId_source_startedAt_idx"
  ON "MeasurementSyncRun"("siteId", "source", "startedAt");
CREATE INDEX "MeasurementSyncRun_siteId_canonicalUrl_source_startedAt_idx"
  ON "MeasurementSyncRun"("siteId", "canonicalUrl", "source", "startedAt");
CREATE UNIQUE INDEX "Ga4PageMetric_siteId_canonicalUrl_date_trafficScope_key"
  ON "Ga4PageMetric"("siteId", "canonicalUrl", "date", "trafficScope");
CREATE INDEX "Ga4PageMetric_siteId_canonicalUrl_date_idx"
  ON "Ga4PageMetric"("siteId", "canonicalUrl", "date");
CREATE INDEX "Ga4PageMetric_syncRunId_idx" ON "Ga4PageMetric"("syncRunId");
CREATE INDEX "VitalsReport_syncRunId_idx" ON "VitalsReport"("syncRunId");

ALTER TABLE "MeasurementSyncRun"
  ADD CONSTRAINT "MeasurementSyncRun_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ga4PageMetric"
  ADD CONSTRAINT "Ga4PageMetric_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ga4PageMetric"
  ADD CONSTRAINT "Ga4PageMetric_syncRunId_fkey"
  FOREIGN KEY ("syncRunId") REFERENCES "MeasurementSyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VitalsReport"
  ADD CONSTRAINT "VitalsReport_syncRunId_fkey"
  FOREIGN KEY ("syncRunId") REFERENCES "MeasurementSyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
