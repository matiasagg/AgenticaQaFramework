import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/coverage - Get all coverage analyses
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coverage = await prisma.coverageAnalysis.findMany({
      where: { userId: req.user!.id },
      include: { project: true },
      orderBy: { generatedAt: 'desc' },
    });
    res.json({ coverage });
  } catch (error) {
    throw new ApiError('Failed to fetch coverage analysis', 500);
  }
});

// POST /api/coverage - Create coverage analysis
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, overallCoverage, uncoveredAreas, recommendations } = req.body;
    const coverage = await prisma.coverageAnalysis.create({
      data: {
        projectId, overallCoverage, uncoveredAreas, recommendations,
        userId: req.user!.id,
      },
    });
    res.status(201).json({ coverage });
  } catch (error) {
    throw new ApiError('Failed to create coverage analysis', 500);
  }
});

// GET /api/coverage/:id - Get coverage by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coverage = await prisma.coverageAnalysis.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { project: true },
    });
    if (!coverage) throw new ApiError('Coverage analysis not found', 404);
    res.json({ coverage });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch coverage analysis', 500);
  }
});

export default router;