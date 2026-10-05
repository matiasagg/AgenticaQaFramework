-- Preserve every DoR validation and every explicit application of a fix.
CREATE TABLE "UserStoryDorValidation" (
    "id" TEXT NOT NULL,
    "userStoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "isReady" BOOLEAN NOT NULL,
    "checklist" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "aiAnalysis" JSONB,
    "syncRecommendation" JSONB,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStoryDorValidation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserStoryDorAudit" (
    "id" TEXT NOT NULL,
    "userStoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'APPLY_FIXES',
    "changedFields" JSONB NOT NULL,
    "appliedRecommendations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserStoryDorAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserStoryDorValidation_userStoryId_validatedAt_idx"
  ON "UserStoryDorValidation"("userStoryId", "validatedAt");
CREATE INDEX "UserStoryDorValidation_userId_validatedAt_idx"
  ON "UserStoryDorValidation"("userId", "validatedAt");
CREATE INDEX "UserStoryDorAudit_userStoryId_createdAt_idx"
  ON "UserStoryDorAudit"("userStoryId", "createdAt");
CREATE INDEX "UserStoryDorAudit_userId_createdAt_idx"
  ON "UserStoryDorAudit"("userId", "createdAt");

ALTER TABLE "UserStoryDorValidation"
  ADD CONSTRAINT "UserStoryDorValidation_userStoryId_fkey"
  FOREIGN KEY ("userStoryId") REFERENCES "UserStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserStoryDorValidation"
  ADD CONSTRAINT "UserStoryDorValidation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserStoryDorAudit"
  ADD CONSTRAINT "UserStoryDorAudit_userStoryId_fkey"
  FOREIGN KEY ("userStoryId") REFERENCES "UserStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserStoryDorAudit"
  ADD CONSTRAINT "UserStoryDorAudit_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;