import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Wrapper for async route handlers
const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) => 
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

// GET /api/projects - Get all projects
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ projects });
}));

// POST /api/projects - Create project
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, repository, website } = req.body;
  const project = await prisma.project.create({
    data: { name, description, repository, website, userId: req.user!.id },
  });
  res.status(201).json({ project });
}));

// GET /api/projects/:id - Get project by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Project not found', 404);
  res.json({ project });
}));

// PUT /api/projects/:id - Update project
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, repository, website, isActive } = req.body;
  const result = await prisma.project.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { name, description, repository, website, isActive },
  });
  if (result.count === 0) throw new ApiError('Project not found', 404);
  const updatedProject = await prisma.project.findUnique({ where: { id: req.params.id } });
  res.json({ project: updatedProject });
}));

// DELETE /api/projects/:id - Delete project
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.project.deleteMany({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (result.count === 0) throw new ApiError('Project not found', 404);
  res.json({ message: 'Project deleted successfully' });
}));

export default router;
