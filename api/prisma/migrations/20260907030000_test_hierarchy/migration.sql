-- Add the explicit hierarchy and reusable test-case associations.
-- Idempotent: safe to re-apply on databases that already contain parts of
-- these changes (e.g. TestPlan.tags / TestSuite.tags created manually).
CREATE TYPE "TestPlanType" AS ENUM ('REPO', 'CONTINUOUS', 'SDLC', 'CUSTOM');
CREATE TYPE "TestSuiteType" AS ENUM ('QUERY', 'STATIC', 'REQUIREMENT');

ALTER TABLE "TestPlan"
  ADD COLUMN IF NOT EXISTS "planType" "TestPlanType" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN IF NOT EXISTS "tags" TEXT[],
  ADD COLUMN IF NOT EXISTS "sourcePlanId" TEXT;

-- Prisma always sends a value for scalar list fields, including explicit NULL
-- when the list is omitted, so existing/legacy rows must be backfilled before
-- enforcing NOT NULL to avoid "Null constraint violation on the fields: (tags)".
UPDATE "TestPlan" SET "tags" = ARRAY[]::TEXT[] WHERE "tags" IS NULL;
ALTER TABLE "TestPlan"
  ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "tags" SET NOT NULL;

ALTER TABLE "TestSuite"
  ADD COLUMN IF NOT EXISTS "suiteType" "TestSuiteType" NOT NULL DEFAULT 'STATIC',
  ADD COLUMN IF NOT EXISTS "tags" TEXT[],
  ADD COLUMN IF NOT EXISTS "parentSuiteId" TEXT;

UPDATE "TestSuite" SET "tags" = ARRAY[]::TEXT[] WHERE "tags" IS NULL;
ALTER TABLE "TestSuite"
  ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
  ALTER COLUMN "tags" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "TestSuiteTestCase" (
  "testSuiteId" TEXT NOT NULL,
  "testCaseId" TEXT NOT NULL,
  CONSTRAINT "TestSuiteTestCase_pkey" PRIMARY KEY ("testSuiteId", "testCaseId")
);

CREATE INDEX IF NOT EXISTS "TestSuiteTestCase_testCaseId_idx" ON "TestSuiteTestCase"("testCaseId");
CREATE INDEX IF NOT EXISTS "TestPlan_sourcePlanId_idx" ON "TestPlan"("sourcePlanId");
CREATE INDEX IF NOT EXISTS "TestSuite_parentSuiteId_idx" ON "TestSuite"("parentSuiteId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestPlan_sourcePlanId_fkey') THEN
    ALTER TABLE "TestPlan"
      ADD CONSTRAINT "TestPlan_sourcePlanId_fkey"
      FOREIGN KEY ("sourcePlanId") REFERENCES "TestPlan"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestSuite_parentSuiteId_fkey') THEN
    ALTER TABLE "TestSuite"
      ADD CONSTRAINT "TestSuite_parentSuiteId_fkey"
      FOREIGN KEY ("parentSuiteId") REFERENCES "TestSuite"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestSuiteTestCase_testSuiteId_fkey') THEN
    ALTER TABLE "TestSuiteTestCase"
      ADD CONSTRAINT "TestSuiteTestCase_testSuiteId_fkey"
      FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TestSuiteTestCase_testCaseId_fkey') THEN
    ALTER TABLE "TestSuiteTestCase"
      ADD CONSTRAINT "TestSuiteTestCase_testCaseId_fkey"
      FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
