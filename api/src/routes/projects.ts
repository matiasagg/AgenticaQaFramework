import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { decryptApiKey, encryptApiKey } from '../utils/encryption';

const router = Router();
const prisma = new PrismaClient();

// Wrapper for async route handlers
const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) => 
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

const sanitizeProject = (project: any) => {
  if (!project) return project;

  const { githubToken, ...safeProject } = project;
  return {
    ...safeProject,
    githubTokenConfigured: Boolean(githubToken),
  };
};

// GET /api/projects - Get all projects
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ projects: projects.map(sanitizeProject) });
}));

// POST /api/projects - Create project
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, repository, website, githubToken } = req.body;
  const project = await prisma.project.create({
    data: {
      name,
      description,
      repository,
      website,
      githubToken: githubToken ? encryptApiKey(String(githubToken).trim()) : null,
      userId: req.user!.id,
      testPlans: {
        create: [
          { name: 'Repo', description: 'Pruebas derivadas del repositorio', planType: 'REPO', status: 'ACTIVE', tags: [] },
          { name: 'SDLC', description: 'Pruebas del ciclo de vida de desarrollo', planType: 'SDLC', status: 'ACTIVE', tags: ['regression'] },
          { name: 'Continuous Testing', description: 'Combinación configurable de Repo y SDLC', planType: 'CONTINUOUS', status: 'ACTIVE', tags: ['smoke', 'regression'] },
        ],
      },
    },
  });
  res.status(201).json({ project: sanitizeProject(project) });
}));

// GET /api/projects/:id - Get project by ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Project not found', 404);
  res.json({ project: sanitizeProject(project) });
}));

// PUT /api/projects/:id - Update project
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, repository, website, isActive, githubToken } = req.body;

  const existingProject = await prisma.project.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existingProject) throw new ApiError('Project not found', 404);

  const data: Record<string, any> = {};

  if (Object.prototype.hasOwnProperty.call(req.body, 'name')) data.name = name;
  if (Object.prototype.hasOwnProperty.call(req.body, 'description')) data.description = description;
  if (Object.prototype.hasOwnProperty.call(req.body, 'repository')) data.repository = repository ?? null;
  if (Object.prototype.hasOwnProperty.call(req.body, 'website')) data.website = website ?? null;
  if (Object.prototype.hasOwnProperty.call(req.body, 'isActive')) data.isActive = isActive;

  if (Object.prototype.hasOwnProperty.call(req.body, 'githubToken')) {
    data.githubToken = githubToken === null || githubToken === '' ? null : encryptApiKey(String(githubToken).trim());
  }

  const updatedProject = await prisma.project.update({
    where: { id: req.params.id },
    data,
  });

  res.json({ project: sanitizeProject(updatedProject) });
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
