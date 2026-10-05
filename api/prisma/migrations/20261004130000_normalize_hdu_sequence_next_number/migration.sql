-- The first allocator migration stored MAX + 2 while the allocator now uses
-- nextNumber as the next candidate. Normalize it before using recovery logic.
INSERT INTO "HduSequence" ("id", "nextNumber", "createdAt", "updatedAt")
SELECT 'GLOBAL', COALESCE(MAX("hduNumber") + 1, 1), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "UserStory"
ON CONFLICT ("id") DO NOTHING;

UPDATE "HduSequence"
SET "nextNumber" = COALESCE((SELECT MAX("hduNumber") + 1 FROM "UserStory"), 1),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'GLOBAL';