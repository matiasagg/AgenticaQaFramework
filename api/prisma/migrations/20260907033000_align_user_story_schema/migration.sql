CREATE TYPE "UserStoryStatus_new" AS ENUM ('NEW', 'IN_ANALYSIS', 'DOR_IN_PROGRESS', 'DOR_DONE', 'READY_FOR_DEVELOPMENT', 'IN_DEVELOPMENT', 'READY_FOR_QA', 'DOD_IN_PROGRESS', 'DOD_DONE', 'DONE', 'BLOCKED', 'CANCELLED', 'ARCHIVED');
CREATE TYPE "SyncStatus" AS ENUM ('UNSYNCED', 'SYNCED', 'OUT_OF_SYNC', 'MANUAL');

ALTER TABLE "UserStory" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "UserStory"
  ALTER COLUMN "status" TYPE "UserStoryStatus_new"
  USING (
    CASE "status"::TEXT
      WHEN 'DRAFT' THEN 'NEW'
      WHEN 'IN_REVIEW' THEN 'DOR_IN_PROGRESS'
      WHEN 'READY' THEN 'DOR_DONE'
      WHEN 'IN_PROGRESS' THEN 'IN_DEVELOPMENT'
      WHEN 'COMPLETED' THEN 'DONE'
      WHEN 'REJECTED' THEN 'CANCELLED'
    END
  )::"UserStoryStatus_new";
DROP TYPE "UserStoryStatus";
ALTER TYPE "UserStoryStatus_new" RENAME TO "UserStoryStatus";

UPDATE "UserStory" SET "acceptanceCriteria" = ARRAY[]::TEXT[] WHERE "acceptanceCriteria" IS NULL;
ALTER TABLE "UserStory"
  ALTER COLUMN "acceptanceCriteria" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'NEW',
  ADD COLUMN "externalSystem" TEXT,
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "externalUrl" TEXT,
  ADD COLUMN "syncStatus" "SyncStatus" NOT NULL DEFAULT 'UNSYNCED',
  ADD COLUMN "syncMetadata" JSONB,
  ADD COLUMN "syncedAt" TIMESTAMP(3),
  ADD COLUMN "workflowState" "UserStoryStatus" NOT NULL DEFAULT 'NEW',
  ADD COLUMN "lastStatusChangeAt" TIMESTAMP(3);

CREATE INDEX "UserStory_externalSystem_externalId_idx" ON "UserStory"("externalSystem", "externalId");
CREATE UNIQUE INDEX "UserStory_projectId_externalSystem_externalId_key" ON "UserStory"("projectId", "externalSystem", "externalId");
