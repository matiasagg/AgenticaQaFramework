/**
 * GitHub Sync Routes
 *
 * Endpoints para integrar GitHub con el SaaS:
 * - GET  /api/github-sync/:projectId/issues     → Vista previa de issues importables
 * - POST /api/github-sync/:projectId/import     → Importa issues como HDUs
 * - GET  /api/github-sync/:projectId/branches   → Lista ramas del repo
 * - GET  /api/github-sync/:projectId/pulls      → Lista PRs del repo
 */
import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import {
  fetchIssues,
  fetchBranches,
  fetchPullRequests,
  mapIssueToUserStory,
} from '../services/githubIntegration';
import { decryptApiKey } from '../utils/encryption';

const router = Router();
const prisma = new PrismaClient();

const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) =>
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

/**
 * GET /api/github-sync/:projectId/issues?state=open
 * Vista previa de los issues de GitHub del proyecto (no los importa aún).
 */
router.get('/:projectId/issues', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  if (!project.repository) throw new ApiError('El proyecto no tiene repositorio configurado', 400);

  const state = (req.query.state as 'open' | 'closed' | 'all') || 'open';
  const token = project.githubToken ? decryptApiKey(project.githubToken) : undefined;
  const issues = await fetchIssues(project.repository, state, token);

  // Detectar cuáles issues ya fueron importados (por número guardado en title prefix)
  const existingStories = await prisma.userStory.findMany({
    where: { projectId: project.id },
    select: { title: true },
  });
  const existingTitles = new Set(existingStories.map((s) => s.title));

  const preview = issues.map((issue) => ({
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    labels: issue.labels.map((l) => l.name),
    alreadyImported: existingTitles.has(issue.title),
    mapped: mapIssueToUserStory(issue),
  }));

  res.json({ issues: preview, repository: project.repository });
}));

/**
 * POST /api/github-sync/:projectId/import
 * Importa issues seleccionados de GitHub como HDUs.
 *
 * Body: { issueNumbers: number[], epicId?: string, featureId?: string }
 */
router.post('/:projectId/import', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { issueNumbers, epicId, featureId } = req.body;
  if (!Array.isArray(issueNumbers) || issueNumbers.length === 0) {
    throw new ApiError('Falta issueNumbers (array de números de issue)', 400);
  }

  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  if (!project.repository) throw new ApiError('El proyecto no tiene repositorio configurado', 400);

  // Validar epic/feature si se especifican
  if (epicId) {
    const epic = await prisma.epic.findFirst({
      where: { id: epicId, projectId: project.id },
    });
    if (!epic) throw new ApiError('Épica no encontrada', 404);
  }
  if (featureId) {
    const feature = await prisma.feature.findFirst({
      where: { id: featureId, epicId: epicId || undefined },
    });
    if (!feature) throw new ApiError('Feature no encontrada', 404);
  }

  const token = project.githubToken ? decryptApiKey(project.githubToken) : undefined;
  const allIssues = await fetchIssues(project.repository, 'all', token);
  const toImport = allIssues.filter((i) => issueNumbers.includes(i.number));

  if (toImport.length === 0) {
    throw new ApiError('No se encontraron issues con esos números', 404);
  }

  const imported: Array<{ id: string; title: string; issueNumber: number }> = [];
  const errors: Array<{ issueNumber: number; error: string }> = [];

  for (const issue of toImport) {
    try {
      const mapped = mapIssueToUserStory(issue);
      // Agregar referencia al issue en la descripción
      const descriptionWithRef = `${mapped.description}\n\n---\n🔗 Issue: ${mapped.githubUrl}`;

      const userStory = await prisma.userStory.create({
        data: {
          title: mapped.title,
          description: descriptionWithRef,
          acceptanceCriteria: mapped.acceptanceCriteria,
          priority: mapped.priority as any,
          projectId: project.id,
          userId: req.user!.id,
          epicId: epicId || null,
          featureId: featureId || null,
          status: 'DRAFT',
        },
      });
      imported.push({ id: userStory.id, title: userStory.title, issueNumber: issue.number });
    } catch (err: any) {
      errors.push({ issueNumber: issue.number, error: err.message });
    }
  }

  res.status(201).json({
    imported,
    errors,
    summary: {
      total: toImport.length,
      success: imported.length,
      failed: errors.length,
    },
  });
}));

/**
 * GET /api/github-sync/:projectId/branches
 * Lista las ramas del repositorio del proyecto.
 */
router.get('/:projectId/branches', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  if (!project.repository) throw new ApiError('El proyecto no tiene repositorio configurado', 400);

  const token = project.githubToken ? decryptApiKey(project.githubToken) : undefined;
  const branches = await fetchBranches(project.repository, token);
  res.json({ branches });
}));

/**
 * GET /api/github-sync/:projectId/pulls?state=open
 * Lista los PRs del repositorio del proyecto.
 */
router.get('/:projectId/pulls', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  if (!project.repository) throw new ApiError('El proyecto no tiene repositorio configurado', 400);

  const state = (req.query.state as 'open' | 'closed' | 'all') || 'open';
  const token = project.githubToken ? decryptApiKey(project.githubToken) : undefined;
  const pulls = await fetchPullRequests(project.repository, state, token);
  res.json({ pulls });
}));

/**
 * PUT /api/github-sync/:projectId/associate-branch
 * Asocia una rama (y opcionalmente PR) a una HDU.
 *
 * Body: { userStoryId, branchName, prNumber?, prUrl? }
 */
router.put('/:projectId/associate-branch', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userStoryId, branchName, prNumber, prUrl } = req.body;
  if (!userStoryId || !branchName) {
    throw new ApiError('Faltan campos requeridos: userStoryId, branchName', 400);
  }

  const story = await prisma.userStory.findFirst({
    where: { id: userStoryId, userId: req.user!.id },
  });
  if (!story) throw new ApiError('HDU no encontrada', 404);

  const updated = await prisma.userStory.update({
    where: { id: userStoryId },
    data: {
      branchName,
      ...(prNumber && { prNumber: String(prNumber) }),
      ...(prUrl && { prUrl }),
    },
  });

  res.json({ userStory: updated, message: 'Rama asociada correctamente' });
}));

export default router;