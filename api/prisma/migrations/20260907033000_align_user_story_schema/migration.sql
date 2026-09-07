-- Align UserStory with the workflow schema (new UserStoryStatus enum, sync and
-- workflow columns). Idempotent: safe to re-apply on databases that already
-- contain parts of these changes (for example after a previously failed run).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStoryStatus_new') THEN
    CREATE TYPE "UserStoryStatus_new" AS ENUM ('NEW', 'IN_ANALYSIS', 'DOR_IN_PROGRESS', 'DOR_DONE', 'READY_FOR_DEVELOPMENT', 'IN_DEVELOPMENT', 'READY_FOR_QA', 'DOD_IN_PROGRESS', 'DOD_DONE', 'DONE', 'BLOCKED', 'CANCELLED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SyncStatus') THEN
    CREATE TYPE "SyncStatus" AS ENUM ('UNSYNCED', 'SYNCED', 'OUT_OF_SYNC', 'MANUAL');
  END IF;
END $$;

ALTER TABLE "UserStory" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserStory"
  ALTER COLUMN "status" TYPE "UserStoryStatus_new"
  USING (
    COALESCE(
      CASE "status"::TEXT
        -- Legacy enum values
        WHEN 'DRAFT' THEN 'NEW'
        WHEN 'IN_REVIEW' THEN 'DOR_IN_PROGRESS'
        WHEN 'READY' THEN 'DOR_DONE'
        WHEN 'IN_PROGRESS' THEN 'IN_DEVELOPMENT'
        WHEN 'COMPLETED' THEN 'DONE'
        WHEN 'REJECTED' THEN 'CANCELLED'
        -- Values already aligned with the new enum
        WHEN 'NEW' THEN 'NEW'
        WHEN 'IN_ANALYSIS' THEN 'IN_ANALYSIS'
        WHEN 'DOR_IN_PROGRESS' THEN 'DOR_IN_PROGRESS'
        WHEN 'DOR_DONE' THEN 'DOR_DONE'
        WHEN 'READY_FOR_DEVELOPMENT' THEN 'READY_FOR_DEVELOPMENT'
        WHEN 'IN_DEVELOPMENT' THEN 'IN_DEVELOPMENT'
        WHEN 'READY_FOR_QA' THEN 'READY_FOR_QA'
        WHEN 'DOD_IN_PROGRESS' THEN 'DOD_IN_PROGRESS'
        WHEN 'DOD_DONE' THEN 'DOD_DONE'
        WHEN 'DONE' THEN 'DONE'
        WHEN 'BLOCKED' THEN 'BLOCKED'
        WHEN 'CANCELLED' THEN 'CANCELLED'
        WHEN 'ARCHIVED' THEN 'ARCHIVED'
      END,
      'NEW'
    )
  )::"UserStoryStatus_new";
DROP TYPE "UserStoryStatus";
ALTER TYPE "UserStoryStatus_new" RENAME TO "UserStoryStatus";

-- Prisma always sends a value for scalar list fields, including explicit NULL
-- when the list is omitted, so existing rows must be backfilled before
-- enforcing NOT NULL.
UPDATE "UserStory" SET "acceptanceCriteria" = ARRAY[]::TEXT[] WHERE "acceptanceCriteria" IS NULL;
ALTER TABLE "UserStory"
  ALTER COLUMN "acceptanceCriteria" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS "externalSystem" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "syncStatus" "SyncStatus" NOT NULL DEFAULT 'UNSYNCED',
  ADD COLUMN IF NOT EXISTS "syncMetadata" JSONB,
  ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "workflowState" "UserStoryStatus" NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS "lastStatusChangeAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "UserStory_externalSystem_externalId_idx" ON "UserStory"("externalSystem", "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserStory_projectId_externalSystem_externalId_key" ON "UserStory"("projectId", "externalSystem", "externalId");
