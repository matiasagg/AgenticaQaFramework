ALTER TABLE "Epic"
  ADD COLUMN IF NOT EXISTS "dorScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dorChecklist" JSONB,
  ADD COLUMN IF NOT EXISTS "isReady" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "staticAnalysis" JSONB;

ALTER TABLE "Feature"
  ADD COLUMN IF NOT EXISTS "dorScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dorChecklist" JSONB,
  ADD COLUMN IF NOT EXISTS "isReady" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "staticAnalysis" JSONB;

CREATE TABLE "DorEntityValidation" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "isReady" BOOLEAN NOT NULL,
    "checklist" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "aiAnalysis" JSONB,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DorEntityValidation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DorEntityAudit" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'APPLY_FIXES',
    "changedFields" JSONB NOT NULL,
    "appliedRecommendations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DorEntityAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DorEntityValidation_entityType_entityId_validatedAt_idx"
  ON "DorEntityValidation"("entityType", "entityId", "validatedAt");
CREATE INDEX "DorEntityValidation_userId_validatedAt_idx"
  ON "DorEntityValidation"("userId", "validatedAt");
CREATE INDEX "DorEntityAudit_entityType_entityId_createdAt_idx"
  ON "DorEntityAudit"("entityType", "entityId", "createdAt");
CREATE INDEX "DorEntityAudit_userId_createdAt_idx"
  ON "DorEntityAudit"("userId", "createdAt");

ALTER TABLE "DorEntityValidation"
  ADD CONSTRAINT "DorEntityValidation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DorEntityAudit"
  ADD CONSTRAINT "DorEntityAudit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;