import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/plans - Get all improvement plans
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await prisma.improvementPlan.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ plans });
  } catch (error) {
    throw new ApiError('Failed to fetch improvement plans', 500);
  }
});

// POST /api/plans - Create improvement plan
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentSkills, targetSkills, actions, resources, timeline } = req.body;
    const plan = await prisma.improvementPlan.create({
      data: {
        currentSkills, targetSkills, actions, resources, timeline,
        userId: req.user!.id,
      },
    });
    res.status(201).json({ plan });
  } catch (error) {
    throw new ApiError('Failed to create improvement plan', 500);
  }
});

// GET /api/plans/:id - Get plan by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await prisma.improvementPlan.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!plan) throw new ApiError('Improvement plan not found', 404);
    res.json({ plan });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch improvement plan', 500);
  }
});

// PUT /api/plans/:id - Update plan
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentSkills, targetSkills, actions, resources, timeline, progress } = req.body;
    const plan = await prisma.improvementPlan.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { currentSkills, targetSkills, actions, resources, timeline, progress },
    });
    if (plan.count === 0) throw new ApiError('Improvement plan not found', 404);
    const updatedPlan = await prisma.improvementPlan.findUnique({ where: { id: req.params.id } });
    res.json({ plan: updatedPlan });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to update improvement plan', 500);
  }
});

// DELETE /api/plans/:id - Delete plan
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const plan = await prisma.improvementPlan.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (plan.count === 0) throw new ApiError('Improvement plan not found', 404);
    res.json({ message: 'Improvement plan deleted successfully' });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to delete improvement plan', 500);
  }
});

export default router;