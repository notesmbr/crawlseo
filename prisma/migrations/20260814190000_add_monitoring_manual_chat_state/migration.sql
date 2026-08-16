-- Monitoring is a durable, non-active handoff state. It intentionally remains
-- outside the existing partial unique index for active manual reviews.
ALTER TYPE "ManualChatState" ADD VALUE IF NOT EXISTS 'MONITORING';
