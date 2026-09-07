-- Repair migration for databases that drifted from the migration history
-- (e.g. "UserStoryStatus" still contains the legacy values 'DRAFT',
-- 'IN_REVIEW', ... so queries fail with: Value 'IN_REVIEW' not found in enum
-- 'UserStoryStatus', and "TestPlan"."tags" is still nullable so creating a
-- project fails with: Null constraint violation on the fields: (tags)).
-- Every statement is idempotent: it only applies the change when needed.

-- 1) Align the UserStoryStatus enum with the workflow values defined in
--    schema.prisma, converting legacy values and surviving partial runs of
--    20260907033000_align_user_story_schema.
DO $$
DECLARE
  has_legacy_value BOOLEAN;
  status_udt TEXT;
  workflow_udt TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.typname = 'UserStoryStatus' AND e.enumlabel = 'IN_REVIEW'
  ) INTO has_legacy_value;

  SELECT c.udt_name INTO status_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'UserStory' AND c.column_name = 'status';

  SELECT c.udt_name INTO workflow_udt
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'UserStory' AND c.column_name = 'workflowState';

  IF has_legacy_value OR status_udt = 'UserStoryStatus_new' OR workflow_udt = 'UserStoryStatus_new' THEN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStoryStatus_new') THEN
      CREATE TYPE "UserStoryStatus_new" AS ENUM ('NEW', 'IN_ANALYSIS', 'DOR_IN_PROGRESS', 'DOR_DONE', 'READY_FOR_DEVELOPMENT', 'IN_DEVELOPMENT', 'READY_FOR_QA', 'DOD_IN_PROGRESS', 'DOD_DONE', 'DONE', 'BLOCKED', 'CANCELLED', 'ARCHIVED');
    END IF;

    ALTER TABLE "UserStory" ALTER COLUMN "status" DROP DEFAULT;

    ALTER TABLE "UserStory"
      ALTER COLUMN "status" TYPE "UserStoryStatus_new"
      USING (
        COALESCE(
          CASE "status"::TEXT
            WHEN 'DRAFT' THEN 'NEW'
            WHEN 'IN_REVIEW' THEN 'DOR_IN_PROGRESS'
            WHEN 'READY' THEN 'DOR_DONE'
            WHEN 'IN_PROGRESS' THEN 'IN_DEVELOPMENT'
            WHEN 'COMPLETED' THEN 'DONE'
            WHEN 'REJECTED' THEN 'CANCELLED'
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

    IF workflow_udt IS NOT NULL AND workflow_udt <> 'UserStoryStatus_new' THEN
      ALTER TABLE "UserStory" ALTER COLUMN "workflowState" DROP DEFAULT;
      ALTER TABLE "UserStory"
        ALTER COLUMN "workflowState" TYPE "UserStoryStatus_new"
        USING (COALESCE("workflowState"::TEXT, 'NEW'))::"UserStoryStatus_new";
    END IF;

    DROP TYPE "UserStoryStatus";
    ALTER TYPE "UserStoryStatus_new" RENAME TO "UserStoryStatus";

    ALTER TABLE "UserStory"
      ALTER COLUMN "status" SET DEFAULT 'NEW',
      ALTER COLUMN "status" SET NOT NULL;

    IF workflow_udt IS NOT NULL THEN
      ALTER TABLE "UserStory"
        ALTER COLUMN "workflowState" SET DEFAULT 'NEW',
        ALTER COLUMN "workflowState" SET NOT NULL;
    END IF;
  END IF;
END $$;

-- 2) Ensure the sync / workflow columns and indexes exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SyncStatus') THEN
    CREATE TYPE "SyncStatus" AS ENUM ('UNSYNCED', 'SYNCED', 'OUT_OF_SYNC', 'MANUAL');
  END IF;
END $$;

ALTER TABLE "UserStory"
  ADD COLUMN IF NOT EXISTS "externalSystem" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "syncMetadata" JSONB,
  ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastStatusChangeAt" TIMESTAMP(3);

ALTER TABLE "UserStory"
  ADD COLUMN IF NOT EXISTS "syncStatus" TEXT;

UPDATE "UserStory" SET "syncStatus" = 'UNSYNCED' WHERE "syncStatus" IS NULL;

ALTER TABLE "UserStory"
  ALTER COLUMN "syncStatus" SET DEFAULT 'UNSYNCED',
  ALTER COLUMN "syncStatus" SET NOT NULL,
  ALTER COLUMN "syncStatus" TYPE "SyncStatus" USING ("syncStatus"::"SyncStatus");

ALTER TABLE "UserStory"
  ADD COLUMN IF NOT EXISTS "workflowState" TEXT;

UPDATE "UserStory" SET "workflowState" = 'NEW' WHERE "workflowState" IS NULL;

ALTER TABLE "UserStory"
  ALTER COLUMN "workflowState" SET DEFAULT 'NEW',
  ALTER COLUMN "workflowState" SET NOT NULL,
  ALTER COLUMN "workflowState" TYPE "UserStoryStatus" USING (
    COALESCE(
      CASE "workflowState"::TEXT
        WHEN 'DRAFT' THEN 'NEW'
        WHEN 'IN_REVIEW' THEN 'DOR_IN_PROGRESS'
        WHEN 'READY' THEN 'DOR_DONE'
        WHEN 'IN_PROGRESS' THEN 'IN_DEVELOPMENT'
        WHEN 'COMPLETED' THEN 'DONE'
        WHEN 'REJECTED' THEN 'CANCELLED'
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
  )::"UserStoryStatus";

-- Prisma always sends a value for scalar list fields, including explicit NULL
-- when the list is omitted, so rows must be backfilled before enforcing NOT NULL.
UPDATE "UserStory" SET "acceptanceCriteria" = ARRAY[]::TEXT[] WHERE "acceptanceCriteria" IS NULL;
ALTER TABLE "UserStory" ALTER COLUMN "acceptanceCriteria" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "UserStory_externalSystem_externalId_idx" ON "UserStory"("externalSystem", "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserStory_projectId_externalSystem_externalId_key" ON "UserStory"("projectId", "externalSystem", "externalId");

-- 3) Harden the scalar list columns introduced by 20260907030000_test_hierarchy.
ALTER TABLE "TestPlan" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
UPDATE "TestPlan" SET "tags" = ARRAY[]::TEXT[] WHERE "tags" IS NULL;
ALTER TABLE "TestPlan"
  ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "tags" SET NOT NULL;

ALTER TABLE "TestSuite" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
UPDATE "TestSuite" SET "tags" = ARRAY[]::TEXT[] WHERE "tags" IS NULL;
ALTER TABLE "TestSuite"
  ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "tags" SET NOT NULL;
