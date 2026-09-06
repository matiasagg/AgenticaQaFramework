import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/bugs - Get all bugs
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bugs = await prisma.bugReport.findMany({
      where: { userId: req.user!.id },
      include: { evidence: true, project: true, agent: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ bugs });
  } catch (error) {
    throw new ApiError('Failed to fetch bugs', 500);
  }
});

// POST /api/bugs - Create bug report
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, severity, stepsToReproduce, expectedResult, actualResult, environment, projectId, agentId } = req.body;
    const bug = await prisma.bugReport.create({
      data: {
        title, description, severity, stepsToReproduce, expectedResult, actualResult, environment,
        projectId, agentId, userId: req.user!.id,
      },
    });
    res.status(201).json({ bug });
  } catch (error) {
    throw new ApiError('Failed to create bug report', 500);
  }
});

// GET /api/bugs/:id - Get bug by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bug = await prisma.bugReport.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { evidence: true, project: true, agent: true },
    });
    if (!bug) throw new ApiError('Bug not found', 404);
    res.json({ bug });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch bug', 500);
  }
});

// PUT /api/bugs/:id - Update bug
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, severity, status, stepsToReproduce, expectedResult, actualResult, environment, assignee } = req.body;
    const bug = await prisma.bugReport.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { title, description, severity, status, stepsToReproduce, expectedResult, actualResult, environment, assignee },
    });
    if (bug.count === 0) throw new ApiError('Bug not found', 404);
    const updatedBug = await prisma.bugReport.findUnique({ where: { id: req.params.id }, include: { evidence: true } });
    res.json({ bug: updatedBug });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to update bug', 500);
  }
});

// DELETE /api/bugs/:id - Delete bug
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bug = await prisma.bugReport.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (bug.count === 0) throw new ApiError('Bug not found', 404);
    res.json({ message: 'Bug deleted successfully' });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to delete bug', 500);
  }
});

export default router;