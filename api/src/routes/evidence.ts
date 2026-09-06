import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/evidence - Get all evidence
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const evidence = await prisma.evidence.findMany({
      where: { userId: req.user!.id },
      include: { bugReport: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ evidence });
  } catch (error) {
    throw new ApiError('Failed to fetch evidence', 500);
  }
});

// POST /api/evidence - Upload evidence (metadata only, file upload handled separately)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, url, thumbnailUrl, filename, size, mimeType, metadata, bugReportId } = req.body;
    const evidence = await prisma.evidence.create({
      data: {
        type, url, thumbnailUrl, filename, size, mimeType, metadata, bugReportId,
        userId: req.user!.id,
      },
    });
    res.status(201).json({ evidence });
  } catch (error) {
    throw new ApiError('Failed to create evidence', 500);
  }
});

// GET /api/evidence/:id - Get evidence by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const evidence = await prisma.evidence.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { bugReport: true },
    });
    if (!evidence) throw new ApiError('Evidence not found', 404);
    res.json({ evidence });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch evidence', 500);
  }
});

// DELETE /api/evidence/:id - Delete evidence
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const evidence = await prisma.evidence.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (evidence.count === 0) throw new ApiError('Evidence not found', 404);
    res.json({ message: 'Evidence deleted successfully' });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to delete evidence', 500);
  }
});

export default router;