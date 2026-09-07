import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/tests - Get all test cases
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, suiteId } = req.query;
    const tests = await prisma.testCase.findMany({
      where: {
        userId: req.user!.id,
        ...(projectId && { projectId: projectId as string }),
        ...(suiteId && { suiteLinks: { some: { testSuiteId: suiteId as string } } }),
      },
      include: { project: true, agent: true, suiteLinks: { include: { testSuite: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ tests });
  } catch (error) {
    throw new ApiError('Failed to fetch tests', 500);
  }
});

// POST /api/tests - Create test case
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, preconditions, steps, expectedResults, priority, type, projectId, agentId, suiteIds, suiteId } = req.body;
    const requestedSuiteIds = Array.isArray(suiteIds) ? suiteIds : (suiteId ? [suiteId] : []);
    if (!title || !projectId || requestedSuiteIds.length === 0) {
      throw new ApiError('Faltan campos requeridos: title, projectId, suiteId', 400);
    }
    const suites = await prisma.testSuite.findMany({
      where: { id: { in: requestedSuiteIds }, projectId, project: { userId: req.user!.id } },
      select: { id: true },
    });
    if (suites.length !== requestedSuiteIds.length) throw new ApiError('Una o más suites no encontradas', 404);
    const test = await prisma.testCase.create({
      data: {
        title, description, preconditions, steps, expectedResults, priority, type,
        projectId, agentId, userId: req.user!.id,
        suiteLinks: { create: requestedSuiteIds.map((testSuiteId: string) => ({ testSuiteId })) },
      },
      include: { suiteLinks: { include: { testSuite: true } } },
    });
    res.status(201).json({ test });
  } catch (error) {
    throw new ApiError('Failed to create test case', 500);
  }
});

// GET /api/tests/:id - Get test by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const test = await prisma.testCase.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { project: true, agent: true, suiteLinks: { include: { testSuite: true } } },
    });
    if (!test) throw new ApiError('Test not found', 404);
    res.json({ test });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch test', 500);
  }
});

// PUT /api/tests/:id - Update test
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, preconditions, steps, expectedResults, priority, type, status, automationStatus } = req.body;
    const test = await prisma.testCase.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { title, description, preconditions, steps, expectedResults, priority, type, status, automationStatus },
    });
    if (test.count === 0) throw new ApiError('Test not found', 404);
    const updatedTest = await prisma.testCase.findUnique({ where: { id: req.params.id } });
    res.json({ test: updatedTest });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to update test', 500);
  }
});

// DELETE /api/tests/:id - Delete test
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const test = await prisma.testCase.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (test.count === 0) throw new ApiError('Test not found', 404);
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to delete test', 500);
  }
});

export default router;