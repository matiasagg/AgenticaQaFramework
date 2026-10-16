-- Repair migration for databases that drifted from the migration history.
--
-- `UserStory.hduNumber` and `UserStory.displayId` are declared in
-- schema.prisma (and used by the HDU creation and GitHub sync flows), but no
-- migration ever created the columns. Prisma therefore generates a client that
-- selects them, and every query on UserStory fails with:
--
--   Invalid `prisma.userStory.findFirst()` invocation:
--   The column `UserStory.hduNumber` does not exist in the current database.
--
-- Every statement is idempotent: it only applies the change when needed, so it
-- is safe to re-run on databases that already contain part of these changes.

-- 1) Create the missing identity columns. They are nullable (`Int?` / `String?`)
--    so the alteration never breaks existing rows.
ALTER TABLE "UserStory"
  ADD COLUMN IF NOT EXISTS "hduNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "displayId" TEXT;

-- 2) Unique indexes required by the Prisma `@unique` attributes. Names follow
--    the Prisma convention "<Model>_<field>_key" used across the project.
CREATE UNIQUE INDEX IF NOT EXISTS "UserStory_hduNumber_key" ON "UserStory"("hduNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "UserStory_displayId_key" ON "UserStory"("displayId");

-- 3) Backfill the correlative identifier for rows that still have no number.
--
--    The application computes the next HDU as:
--      (last row ordered by hduNumber desc) + 1
--    so any row left NULL would make the next created/synced HDU reuse HDU-001
--    and collide with the unique index. We number only the NULL rows, starting
--    after the current maximum, ordered by creation date and id for a stable,
--    reproducible assignment. For a fully drifted table (all NULLs) this yields
--    HDU-001, HDU-002, ... in chronological order.
--
--    Note: `scripts/migrate-hdu-ids.ts` (`npm run repair:hdu-ids`) performs the
--    same repair but prioritising the GitHub issue order; run it afterwards if
--    you prefer that ordering.
WITH numbered AS (
  SELECT
    "id",
    (SELECT COALESCE(MAX("hduNumber"), 0) FROM "UserStory")
      + ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS rn
  FROM "UserStory"
  WHERE "hduNumber" IS NULL OR "displayId" IS NULL
)
UPDATE "UserStory" AS u
SET
  "hduNumber" = COALESCE(u."hduNumber", numbered.rn),
  "displayId" = COALESCE(u."displayId", 'HDU-' || LPAD(numbered.rn::TEXT, 3, '0'))
FROM numbered
WHERE u."id" = numbered."id";