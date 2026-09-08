-- DropIndex
DROP INDEX "TestPlan_sourcePlanId_idx";

-- DropIndex
DROP INDEX "TestSuite_parentSuiteId_idx";

-- AlterTable
ALTER TABLE "TestPlan" ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TestSuite" ALTER COLUMN "tags" DROP DEFAULT;
