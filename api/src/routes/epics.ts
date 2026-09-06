/**
 * Epic Routes
 * CRUD para épicas que agrupan features y user stories.
 */
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

// GET /api/epics - Obtener todas las épicas del usuario
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.query;
  const where: any = { project: { userId: req.user!.id } };
  if (projectId) where.projectId = projectId as string;

  const epics = await prisma.epic.findMany({
    where,
    include: {
      project: true,
      features: true,
      userStories: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ epics });
}));

// POST /api/epics - Crear una nueva épica
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, projectId } = req.body;
  if (!name || !projectId) {
    throw new ApiError('Faltan campos requeridos: name, projectId', 400);
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);

  const epic = await prisma.epic.create({
    data: { name, description, projectId },
    include: { project: true, features: true, userStories: true },
  });
  res.status(201).json({ epic });
}));

// GET /api/epics/:id - Obtener épica por ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const epic = await prisma.epic.findFirst({
    where: { id: req.params.id, project: { userId: req.user!.id } },
    include: {
      project: true,
      features: { include: { userStories: true } },
      userStories: true,
    },
  });
  if (!epic) throw new ApiError('Épica no encontrada', 404);
  res.json({ epic });
}));

// PUT /api/epics/:id - Actualizar épica
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, status } = req.body;
  const existing = await prisma.epic.findFirst({
    where: { id: req.params.id, project: { userId: req.user!.id } },
  });
  if (!existing) throw new ApiError('Épica no encontrada', 404);

  const epic = await prisma.epic.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(description && { description }), ...(status && { status }) },
    include: { project: true, features: true, userStories: true },
  });
  res.json({ epic });
}));

// DELETE /api/epics/:id - Eliminar épica
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.epic.deleteMany({
    where: { id: req.params.id, project: { userId: req.user!.id } },
  });
  if (result.count === 0) throw new ApiError('Épica no encontrada', 404);
  res.json({ message: 'Épica eliminada correctamente' });
}));

export default router;