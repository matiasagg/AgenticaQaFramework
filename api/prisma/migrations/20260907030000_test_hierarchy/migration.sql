-- Add the explicit hierarchy and reusable test-case associations.
CREATE TYPE "TestPlanType" AS ENUM ('REPO', 'CONTINUOUS', 'SDLC', 'CUSTOM');
CREATE TYPE "TestSuiteType" AS ENUM ('QUERY', 'STATIC', 'REQUIREMENT');

ALTER TABLE "TestPlan"
  ADD COLUMN "planType" "TestPlanType" NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "sourcePlanId" TEXT;

ALTER TABLE "TestSuite"
  ADD COLUMN "suiteType" "TestSuiteType" NOT NULL DEFAULT 'STATIC',
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "parentSuiteId" TEXT;

CREATE TABLE "TestSuiteTestCase" (
  "testSuiteId" TEXT NOT NULL,
  "testCaseId" TEXT NOT NULL,
  CONSTRAINT "TestSuiteTestCase_pkey" PRIMARY KEY ("testSuiteId", "testCaseId")
);

CREATE INDEX "TestSuiteTestCase_testCaseId_idx" ON "TestSuiteTestCase"("testCaseId");
CREATE INDEX "TestPlan_sourcePlanId_idx" ON "TestPlan"("sourcePlanId");
CREATE INDEX "TestSuite_parentSuiteId_idx" ON "TestSuite"("parentSuiteId");

ALTER TABLE "TestPlan"
  ADD CONSTRAINT "TestPlan_sourcePlanId_fkey"
  FOREIGN KEY ("sourcePlanId") REFERENCES "TestPlan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TestSuite"
  ADD CONSTRAINT "TestSuite_parentSuiteId_fkey"
  FOREIGN KEY ("parentSuiteId") REFERENCES "TestSuite"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestSuiteTestCase"
  ADD CONSTRAINT "TestSuiteTestCase_testSuiteId_fkey"
  FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TestSuiteTestCase_testCaseId_fkey"
  FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
