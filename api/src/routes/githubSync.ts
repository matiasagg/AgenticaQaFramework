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
  buildIssueDescription,
} from '../services/githubIntegration';
import { decryptApiKey } from '../utils/encryption';

const router = Router();
const prisma = new PrismaClient();

const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) =>
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

type IssueTargetType = 'EPIC' | 'FEATURE' | 'HDU';

function detectIssueTarget(issue: { title: string; labels: Array<{ name: string }> }): IssueTargetType {
  const labels = issue.labels.map((l) => l.name.toLowerCase());
  const title = issue.title.toLowerCase();

  if (labels.includes('epic') || labels.includes('epica') || title.startsWith('[epic]') || title.startsWith('[epica]')) {
    return 'EPIC';
  }

  if (labels.includes('feature') || title.startsWith('[feature]')) {
    return 'FEATURE';
  }

  return 'HDU';
}

function normalizeIssueTitle(title: string): string {
  return title.replace(/^\s*\[(epic|epica|feature|hdu)\]\s*/i, '').trim();
}

async function ensureDefaultEpic(projectId: string): Promise<{ id: string }> {
  let epic = await prisma.epic.findFirst({
    where: { projectId, name: 'GitHub Imported Epic' },
    select: { id: true },
  });

  if (!epic) {
    epic = await prisma.epic.create({
      data: {
        name: 'GitHub Imported Epic',
        description: 'Épica contenedora para elementos importados desde GitHub.',
        projectId,
      },
      select: { id: true },
    });
  }

  return epic;
}

async function ensureDefaultFeature(projectId: string, epicId?: string | null): Promise<{ id: string; epicId: string }> {
  const targetEpicId = epicId || (await ensureDefaultEpic(projectId)).id;

  let feature = await prisma.feature.findFirst({
    where: { epicId: targetEpicId, name: 'GitHub Imported Feature' },
    select: { id: true, epicId: true },
  });

  if (!feature) {
    feature = await prisma.feature.create({
      data: {
        name: 'GitHub Imported Feature',
        description: 'Feature contenedora para HDUs importadas desde GitHub.',
        epicId: targetEpicId,
      },
      select: { id: true, epicId: true },
    });
  }

  return feature;
}

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

  const existingStories = await prisma.userStory.findMany({
    where: { projectId: project.id, externalSystem: 'GITHUB' },
    select: { externalId: true },
  });
  const importedExternalIds = new Set(existingStories.map((s) => s.externalId).filter(Boolean));

  const preview = issues.map((issue) => ({
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    labels: issue.labels.map((l) => l.name),
    targetType: detectIssueTarget(issue),
    alreadyImported: importedExternalIds.has(String(issue.number)),
    mapped: mapIssueToUserStory(issue),
  }));

  res.json({ issues: preview, repository: project.repository });
}));

/**
 * POST /api/github-sync/:projectId/import
 * Importa issues seleccionados de GitHub y los clasifica en Epic/Feature/HDU por label.
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

  const imported: Array<{ id: string; title: string; issueNumber: number; targetType: IssueTargetType }> = [];
  const skipped: Array<{ issueNumber: number; reason: string }> = [];
  const errors: Array<{ issueNumber: number; error: string }> = [];

  for (const issue of toImport) {
    try {
      const externalId = String(issue.number);
      const existingStory = await prisma.userStory.findFirst({
        where: {
          projectId: project.id,
          externalSystem: 'GITHUB',
          externalId,
        },
      });
      if (existingStory) {
        skipped.push({ issueNumber: issue.number, reason: 'Ya existe una HDU sincronizada para este issue' });
        continue;
      }

      const mapped = mapIssueToUserStory(issue);
      const descriptionWithRef = buildIssueDescription(mapped.description, mapped.githubUrl);
      const normalizedTitle = normalizeIssueTitle(mapped.title);
      const targetType = detectIssueTarget(issue);

      if (targetType === 'EPIC') {
        const existingEpic = await prisma.epic.findFirst({
          where: { projectId: project.id, name: normalizedTitle },
          select: { id: true, name: true },
        });

        const epic = existingEpic || await prisma.epic.create({
          data: {
            name: normalizedTitle,
            description: descriptionWithRef,
            projectId: project.id,
          },
          select: { id: true, name: true },
        });

        imported.push({ id: epic.id, title: epic.name, issueNumber: issue.number, targetType });
        continue;
      }

      if (targetType === 'FEATURE') {
        const resolvedEpicId = epicId || (await ensureDefaultEpic(project.id)).id;
        const existingFeature = await prisma.feature.findFirst({
          where: { epicId: resolvedEpicId, name: normalizedTitle },
          select: { id: true, name: true },
        });

        const feature = existingFeature || await prisma.feature.create({
          data: {
            name: normalizedTitle,
            description: descriptionWithRef,
            epicId: resolvedEpicId,
          },
          select: { id: true, name: true },
        });

        imported.push({ id: feature.id, title: feature.name, issueNumber: issue.number, targetType });
        continue;
      }

      const resolvedFeature = featureId
        ? await prisma.feature.findFirst({ where: { id: featureId }, select: { id: true, epicId: true } })
        : await ensureDefaultFeature(project.id, epicId || null);

      if (!resolvedFeature) {
        throw new ApiError('No se pudo resolver una Feature válida para importar la HDU', 400);
      }

      const userStory = await prisma.userStory.create({
        data: {
          title: normalizedTitle,
          description: descriptionWithRef,
          acceptanceCriteria: mapped.acceptanceCriteria,
          priority: mapped.priority as any,
          projectId: project.id,
          userId: req.user!.id,
          epicId: resolvedFeature.epicId,
          featureId: resolvedFeature.id,
          status: 'DRAFT',
          externalSystem: 'GITHUB',
          externalId,
          externalUrl: mapped.githubUrl,
          syncStatus: 'SYNCED',
          syncMetadata: {
            issueNumber: issue.number,
            source: 'github',
            importedAt: new Date().toISOString(),
            targetType,
          },
          syncedAt: new Date(),
        },
      });
      imported.push({ id: userStory.id, title: userStory.title, issueNumber: issue.number, targetType });
    } catch (err: any) {
      errors.push({ issueNumber: issue.number, error: err.message });
    }
  }

  const byType = imported.reduce((acc, item) => {
    acc[item.targetType] = (acc[item.targetType] || 0) + 1;
    return acc;
  }, {} as Record<IssueTargetType, number>);

  res.status(201).json({
    imported,
    skipped,
    errors,
    summary: {
      total: toImport.length,
      success: imported.length,
      skipped: skipped.length,
      failed: errors.length,
      byType,
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