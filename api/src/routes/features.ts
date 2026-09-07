import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) =>
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

// GET /api/features - Obtener todas las features del usuario
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, epicId } = req.query;
  const where: any = {
    epic: {
      project: { userId: req.user!.id },
      ...(projectId ? { projectId: projectId as string } : {}),
    },
    ...(epicId ? { epicId: epicId as string } : {}),
  };

  const features = await prisma.feature.findMany({
    where,
    include: { epic: true, userStories: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ features });
}));

// POST /api/features - Crear feature
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, epicId } = req.body;
  if (!name || !epicId) throw new ApiError('Faltan campos requeridos: name, epicId', 400);

  const epic = await prisma.epic.findFirst({ where: { id: epicId, project: { userId: req.user!.id } } });
  if (!epic) throw new ApiError('Epic not found', 404);

  const feature = await prisma.feature.create({
    data: { name, description, epicId },
    include: { epic: true, userStories: true },
  });
  res.status(201).json({ feature });
}));

// GET /api/features/:id - Obtener feature por ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const feature = await prisma.feature.findFirst({
    where: { id: req.params.id, epic: { project: { userId: req.user!.id } } },
    include: { epic: true, userStories: true },
  });
  if (!feature) throw new ApiError('Feature not found', 404);
  res.json({ feature });
}));

// PUT /api/features/:id - Actualizar feature
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, status } = req.body;
  const existing = await prisma.feature.findFirst({ where: { id: req.params.id, epic: { project: { userId: req.user!.id } } } });
  if (!existing) throw new ApiError('Feature not found', 404);

  const feature = await prisma.feature.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(description && { description }), ...(status && { status }) },
    include: { epic: true, userStories: true },
  });
  res.json({ feature });
}));

// DELETE /api/features/:id - Eliminar feature
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.feature.deleteMany({ where: { id: req.params.id, epic: { project: { userId: req.user!.id } } } });
  if (result.count === 0) throw new ApiError('Feature not found', 404);
  res.json({ message: 'Feature deleted successfully' });
}));

export default router;
