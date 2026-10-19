-- Track external changes that require explicit user approval.
CREATE TYPE "SyncEventStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

ALTER TABLE "BugReport"
  ADD COLUMN IF NOT EXISTS "githubSyncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "githubSyncMetadata" JSONB;

CREATE TABLE "SyncEvent" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "resolvedById" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "externalSystem" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "sourceVersion" TEXT NOT NULL,
  "operation" TEXT NOT NULL DEFAULT 'UPDATE',
  "status" "SyncEventStatus" NOT NULL DEFAULT 'PENDING',
  "changes" JSONB NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SyncEvent_projectId_externalSystem_externalId_sourceVersion_key"
  ON "SyncEvent"("projectId", "externalSystem", "externalId", "sourceVersion");
CREATE INDEX "SyncEvent_projectId_status_createdAt_idx"
  ON "SyncEvent"("projectId", "status", "createdAt");
CREATE INDEX "SyncEvent_entityType_entityId_createdAt_idx"
  ON "SyncEvent"("entityType", "entityId", "createdAt");

ALTER TABLE "SyncEvent"
  ADD CONSTRAINT "SyncEvent_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SyncEvent_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "SyncEvent_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
