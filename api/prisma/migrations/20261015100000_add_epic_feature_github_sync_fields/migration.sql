-- Add GitHub synchronization identity to Epic and Feature work items.
ALTER TABLE "Epic"
  ADD COLUMN IF NOT EXISTS "externalSystem" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "syncStatus" "SyncStatus" NOT NULL DEFAULT 'UNSYNCED',
  ADD COLUMN IF NOT EXISTS "syncMetadata" JSONB,
  ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);

ALTER TABLE "Feature"
  ADD COLUMN IF NOT EXISTS "externalSystem" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "syncStatus" "SyncStatus" NOT NULL DEFAULT 'UNSYNCED',
  ADD COLUMN IF NOT EXISTS "syncMetadata" JSONB,
  ADD COLUMN IF NOT EXISTS "syncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Epic_projectId_externalSystem_externalId_key"
  ON "Epic"("projectId", "externalSystem", "externalId");
CREATE INDEX IF NOT EXISTS "Epic_externalSystem_externalId_idx"
  ON "Epic"("externalSystem", "externalId");

CREATE UNIQUE INDEX IF NOT EXISTS "Feature_epicId_externalSystem_externalId_key"
  ON "Feature"("epicId", "externalSystem", "externalId");
CREATE INDEX IF NOT EXISTS "Feature_externalSystem_externalId_idx"
  ON "Feature"("externalSystem", "externalId");
