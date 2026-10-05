ALTER TABLE "UserStory"
  ADD COLUMN IF NOT EXISTS "sourceDisplayId" TEXT;

CREATE TABLE "HduSequence" (
    "id" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HduSequence_pkey" PRIMARY KEY ("id")
);

-- `nextNumber` is the next value after the one most recently reserved.
-- The allocator returns nextNumber - 1, so initialize it to max + 2.
INSERT INTO "HduSequence" ("id", "nextNumber", "createdAt", "updatedAt")
SELECT 'GLOBAL', COALESCE(MAX("hduNumber") + 2, 2), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "UserStory";