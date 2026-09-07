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

// GET /api/test-suites - listar suites (filtro por projectId, testPlanId, userStoryId)
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, testPlanId, userStoryId } = req.query;
  const where: any = { project: { userId: req.user!.id } };
  if (projectId) where.projectId = projectId as string;
  if (testPlanId) where.testPlanId = testPlanId as string;
  if (userStoryId) where.userStoryId = userStoryId as string;

  const suites = await prisma.testSuite.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ suites });
}));

// POST /api/test-suites - crear suite
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, projectId, testPlanId, userStoryId, environment } = req.body;
  if (!title || !projectId) throw new ApiError('Faltan campos requeridos: title, projectId', 400);

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user!.id } });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);

  const suite = await prisma.testSuite.create({
    data: {
      title,
      description: description || '',
      projectId,
      testPlanId: testPlanId || null,
      userStoryId: userStoryId || null,
      environment: environment || 'staging',
      status: 'DRAFT',
      testCases: [],
    },
  });

  res.status(201).json({ suite });
}));

// GET /api/test-suites/:id - detalle
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const suite = await prisma.testSuite.findFirst({
    where: { id: req.params.id, project: { userId: req.user!.id } },
  });
  if (!suite) throw new ApiError('Suite no encontrada', 404);
  res.json({ suite });
}));

// PUT /api/test-suites/:id - actualizar
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, status, environment, testPlanId } = req.body;
  const existing = await prisma.testSuite.findFirst({ where: { id: req.params.id, project: { userId: req.user!.id } } });
  if (!existing) throw new ApiError('Suite no encontrada', 404);

  const updated = await prisma.testSuite.update({
    where: { id: req.params.id },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(status && { status }),
      ...(environment && { environment }),
      ...(testPlanId !== undefined && { testPlanId: testPlanId || null }),
    },
  });

  res.json({ suite: updated });
}));

// DELETE /api/test-suites/:id - eliminar
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.testSuite.deleteMany({ where: { id: req.params.id, project: { userId: req.user!.id } } });
  if (result.count === 0) throw new ApiError('Suite no encontrada', 404);
  res.json({ message: 'Suite eliminada correctamente' });
}));

export default router;
