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
  fetchCollaborators,
  fetchPullRequests,
  mapIssueToUserStory,
  mapIssueToBugReport,
  buildIssueDescription,
  buildGitHubImportedWorkItemTitle,
  updateGitHubIssue,
  cleanIssueDescription,
  hasGitHubIssueChanged,
} from '../services/githubIntegration';
import { decryptApiKey } from '../utils/encryption';
import { extractSourceHduDisplayId, parseHduNumber, reserveHduIdentity } from '../services/hduIdentity';

const router = Router();
const prisma = new PrismaClient();

const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) =>
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

type IssueTargetType = 'EPIC' | 'FEATURE' | 'HDU' | 'BUG';

type GitHubContainerSyncRecord = {
  id: string;
  name: string;
  description?: string;
  externalId: string | null;
  syncedAt: Date | null;
  syncMetadata?: unknown;
};

type GitHubSyncValue = string | string[] | number | null;

type GitHubSyncChange = {
  field: string;
  label: string;
  localValue: GitHubSyncValue;
  githubValue: GitHubSyncValue;
};

function getLastGitHubUpdate(record: { syncedAt?: Date | null; syncMetadata?: unknown }): Date | string | null | undefined {
  if (record.syncMetadata && typeof record.syncMetadata === 'object') {
    const sourceUpdatedAt = (record.syncMetadata as { sourceUpdatedAt?: unknown }).sourceUpdatedAt;
    if (typeof sourceUpdatedAt === 'string' || sourceUpdatedAt instanceof Date) return sourceUpdatedAt;
  }
  return record.syncedAt;
}

function normalizeSyncValue(value: unknown): GitHubSyncValue {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).sort();
  if (typeof value === 'number' || typeof value === 'string') return typeof value === 'string' ? value.trim() : value;
  return String(value);
}

function normalizeDescriptionForComparison(value: unknown): string {
  return cleanIssueDescription(String(value || '')
    .replace(/(?:^|\n)\s*---\s*\n?\s*🔗\s*Issue original:\s*https?:\/\/\S+\s*/gim, '\n')
    .replace(/(?:^|\n)\s*🔗\s*Issue original:\s*https?:\/\/\S+\s*/gim, '\n')
    .replace(/(?:^|\n)\s*\*\*ID:\*\*\s*HDU-\d+\s*/gim, '\n'))
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function addSyncChange(
  changes: GitHubSyncChange[],
  field: string,
  label: string,
  localValue: unknown,
  githubValue: unknown,
): void {
  const normalizedLocal = normalizeSyncValue(localValue);
  const normalizedGitHub = normalizeSyncValue(githubValue);
  const comparisonLocal = field === 'description' ? normalizeDescriptionForComparison(localValue) : normalizedLocal;
  const comparisonGitHub = field === 'description' ? normalizeDescriptionForComparison(githubValue) : normalizedGitHub;
  if (JSON.stringify(comparisonLocal) !== JSON.stringify(comparisonGitHub)) {
    changes.push({ field, label, localValue: normalizedLocal, githubValue: normalizedGitHub });
  }
}

function buildGitHubSyncChanges(
  targetType: IssueTargetType,
  existing: Record<string, unknown> | null,
  mapped: Record<string, unknown>,
): GitHubSyncChange[] {
  if (!existing) return [];
  const changes: GitHubSyncChange[] = [];
  const normalizedTitle = normalizeIssueTitle(String(mapped.title || ''));
  const syncedDescription = buildIssueDescription(String(mapped.description || ''), String(mapped.githubUrl || ''));

  if (targetType === 'HDU') {
    addSyncChange(changes, 'title', 'Título', existing.title, normalizedTitle);
    addSyncChange(changes, 'description', 'Descripción', existing.description, syncedDescription);
    addSyncChange(changes, 'acceptanceCriteria', 'Criterios de aceptación', existing.acceptanceCriteria, mapped.acceptanceCriteria);
    addSyncChange(changes, 'definitionOfDone', 'Definition of Done', existing.definitionOfDone, mapped.definitionOfDone);
    addSyncChange(changes, 'technicalNotes', 'Notas técnicas', existing.technicalNotes, mapped.technicalNotes);
    addSyncChange(changes, 'evidences', 'Evidencias', existing.evidences, mapped.evidences);
    addSyncChange(changes, 'dependencies', 'Dependencias', existing.dependencies, mapped.dependencies);
    addSyncChange(changes, 'priority', 'Prioridad', existing.priority, mapped.priority);
    addSyncChange(changes, 'storyPoints', 'Story points', existing.storyPoints, mapped.storyPoints);
    addSyncChange(changes, 'labels', 'Labels', existing.labels, mapped.labels);
    addSyncChange(changes, 'assignee', 'Asignado a', existing.assignee, mapped.assignee);
    addSyncChange(changes, 'branchName', 'Rama', existing.branchName, mapped.branchName);
    return changes;
  }

  if (targetType === 'BUG') {
    addSyncChange(changes, 'title', 'Título', existing.title, normalizeIssueTitle(String(mapped.title || '')));
    addSyncChange(changes, 'description', 'Descripción', existing.description, mapped.description);
    addSyncChange(changes, 'severity', 'Severidad', existing.severity, mapped.severity);
    addSyncChange(changes, 'stepsToReproduce', 'Pasos para reproducir', existing.stepsToReproduce, mapped.stepsToReproduce);
    addSyncChange(changes, 'expectedResult', 'Resultado esperado', existing.expectedResult, mapped.expectedResult);
    addSyncChange(changes, 'actualResult', 'Resultado actual', existing.actualResult, mapped.actualResult);
    addSyncChange(changes, 'labels', 'Labels', existing.labels, mapped.labels);
    addSyncChange(changes, 'assignee', 'Asignado a', existing.assignee, mapped.assignee);
    addSyncChange(changes, 'branchName', 'Rama', existing.branchName, mapped.branchName);
    return changes;
  }

  addSyncChange(changes, 'name', 'Nombre', existing.name, normalizedTitle);
  addSyncChange(changes, 'description', 'Descripción', existing.description, syncedDescription);
  return changes;
}

async function upsertPendingSyncEvent(
  projectId: string,
  userId: string,
  issue: { number: number; updated_at: string },
  targetType: IssueTargetType,
  existing: { id?: string } | null | undefined,
  changes: GitHubSyncChange[],
  mapped: Record<string, unknown>,
): Promise<{ id: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED' } | null> {
  if (!existing?.id || changes.length === 0) return null;

  const externalId = String(issue.number);
  const normalizedTitle = normalizeIssueTitle(String(mapped.title || ''));
  const snapshot = {
    targetType,
    issueNumber: issue.number,
    sourceUpdatedAt: issue.updated_at,
    title: normalizedTitle,
    description: buildIssueDescription(String(mapped.description || ''), String(mapped.githubUrl || '')),
    mapped,
  };

  return prisma.syncEvent.upsert({
    where: {
      projectId_externalSystem_externalId_sourceVersion: {
        projectId,
        externalSystem: 'GITHUB',
        externalId,
        sourceVersion: issue.updated_at,
      },
    },
    create: {
      projectId,
      userId,
      entityType: targetType,
      entityId: existing.id,
      externalSystem: 'GITHUB',
      externalId,
      sourceVersion: issue.updated_at,
      operation: 'UPDATE',
      status: 'PENDING',
      changes: JSON.parse(JSON.stringify(changes)),
      snapshot: JSON.parse(JSON.stringify(snapshot)),
    },
    update: {
      changes: JSON.parse(JSON.stringify(changes)),
      snapshot: JSON.parse(JSON.stringify(snapshot)),
    },
    select: { id: true, status: true },
  });
}

function detectIssueTarget(issue: { title: string; labels: Array<{ name: string }> }): IssueTargetType {
  const labels = issue.labels.map((l) => l.name.toLowerCase());
  const title = issue.title.toLowerCase();
  const hasTitlePrefix = (type: string) =>
    new RegExp(`^\\[\\s*${type}(?:\\s*[-_:]\\s*[^\\]]+|\\s*)\\]`).test(title);

  // Detectar bugs primero (prioridad sobre otros tipos)
  if (
    labels.includes('bug') ||
    labels.includes('bugfix') ||
    labels.includes('error') ||
    labels.includes('defect') ||
    hasTitlePrefix('bug') ||
    hasTitlePrefix('bugfix') ||
    hasTitlePrefix('error') ||
    hasTitlePrefix('defect')
  ) {
    return 'BUG';
  }

  if (labels.includes('epic') || labels.includes('epica') || hasTitlePrefix('epic') || hasTitlePrefix('epica')) {
    return 'EPIC';
  }

  if (labels.includes('feature') || hasTitlePrefix('feature')) {
    return 'FEATURE';
  }

  return 'HDU';
}

function normalizeIssueTitle(title: string): string {
  return title
    .replace(/^\s*\[(bug|bugfix|error|defect|epic|epica|feature|hdu)(?:\s*[-_:]\s*[^\]]+)?\]\s*/i, '')
    .replace(/^\s*HDU\s*[-_:]\s*\d+\s*[-–—:]\s*/i, '')
    .trim();
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

  const existingStories: Array<Record<string, unknown> & { id: string; externalId: string | null; title: string; syncedAt: Date | null; syncMetadata: unknown; displayId: string | null; sourceDisplayId: string | null }> = await prisma.userStory.findMany({
    where: {
      projectId: project.id,
      externalSystem: 'GITHUB',
    },
    select: {
      id: true,
      externalId: true,
      title: true,
      description: true,
      acceptanceCriteria: true,
      definitionOfDone: true,
      technicalNotes: true,
      evidences: true,
      dependencies: true,
      priority: true,
      storyPoints: true,
      labels: true,
      assignee: true,
      branchName: true,
      syncedAt: true,
      syncMetadata: true,
      displayId: true,
      sourceDisplayId: true,
    },
  });
  const existingBugs: Array<Record<string, unknown> & { id: string; githubId: string | null; title: string; updatedAt: Date | null; githubSyncedAt: Date | null }> = await prisma.bugReport.findMany({
    where: {
      projectId: project.id,
      githubId: { not: null },
    },
    select: {
      id: true,
      githubId: true,
      title: true,
      description: true,
      severity: true,
      stepsToReproduce: true,
      expectedResult: true,
      actualResult: true,
      labels: true,
      assignee: true,
      branchName: true,
      githubSyncedAt: true,
      updatedAt: true,
    },
  });
  const existingEpics: GitHubContainerSyncRecord[] = await prisma.epic.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true, description: true, externalId: true, syncedAt: true, syncMetadata: true },
  });
  const existingFeatures: GitHubContainerSyncRecord[] = await prisma.feature.findMany({
    where: { epic: { projectId: project.id } },
    select: { id: true, name: true, description: true, externalId: true, syncedAt: true, syncMetadata: true },
  });
  const importedExternalIds = new Set([
    ...existingStories.map((s) => s.externalId).filter(Boolean),
    ...existingBugs.map((b) => b.githubId).filter(Boolean),
    ...existingEpics.map((epic) => epic.externalId).filter(Boolean),
    ...existingFeatures.map((feature) => feature.externalId).filter(Boolean),
  ]);

  const preview = await Promise.all(issues.map(async (issue) => {
    const targetType = detectIssueTarget(issue);
    const story = existingStories.find((item) => item.externalId === String(issue.number));
    const bug = existingBugs.find((item) => item.githubId === String(issue.number));
    const normalizedIssueTitle = normalizeIssueTitle(issue.title);
    const epic = existingEpics.find((item) => item.externalId === String(issue.number))
      || (targetType === 'EPIC' ? existingEpics.find((item) => item.name === normalizedIssueTitle) : undefined);
    const feature = existingFeatures.find((item) => item.externalId === String(issue.number))
      || (targetType === 'FEATURE' ? existingFeatures.find((item) => item.name === normalizedIssueTitle) : undefined);
    const existing = story || bug || epic || feature;
    const syncedAt = story
      ? getLastGitHubUpdate(story)
      : bug?.githubSyncedAt || bug?.updatedAt || (epic ? getLastGitHubUpdate(epic) : undefined) || (feature ? getLastGitHubUpdate(feature) : undefined);
    const mapped = targetType === 'BUG' ? mapIssueToBugReport(issue) : mapIssueToUserStory(issue);

    const needsSync = existing ? hasGitHubIssueChanged(issue, syncedAt) : false;
    const syncEvent = needsSync
      ? await upsertPendingSyncEvent(
        project.id,
        req.user!.id,
        issue,
        targetType,
        existing,
        buildGitHubSyncChanges(targetType, (existing || null) as Record<string, unknown> | null, mapped as unknown as Record<string, unknown>),
        mapped as unknown as Record<string, unknown>,
      )
      : null;

    const actionableSyncEvent = syncEvent?.status === 'PENDING' ? syncEvent : null;
    return {
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
      state: issue.state,
      updatedAt: issue.updated_at,
      labels: issue.labels.map((l) => l.name),
      targetType,
      alreadyImported: importedExternalIds.has(String(issue.number)) || Boolean(existing),
      needsSync: needsSync && (!syncEvent || syncEvent.status === 'PENDING'),
      syncEventId: actionableSyncEvent?.id || null,
      sourceDisplayId: story?.sourceDisplayId || extractSourceHduDisplayId(issue.title, issue.body),
      canonicalDisplayId: story?.displayId || null,
      mapped,
      changes: buildGitHubSyncChanges(targetType, (existing || null) as Record<string, unknown> | null, mapped as unknown as Record<string, unknown>),
    };
  }));

  res.json({ issues: preview, repository: project.repository });
}));

/**
 * GET /api/github-sync/:projectId/events?status=PENDING
 * Lista cambios externos que requieren decisión explícita.
 */
router.get('/:projectId/events', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
    select: { id: true },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);

  const status = typeof req.query.status === 'string' ? req.query.status : 'PENDING';
  const events = await prisma.syncEvent.findMany({
    where: { projectId: project.id, status: status as any },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json({ events });
}));

/**
 * POST /api/github-sync/:projectId/events/:eventId/accept
 * Aplica el snapshot externo en la entidad local y registra la aprobación.
 */
router.post('/:projectId/events/:eventId/accept', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const event = await prisma.syncEvent.findFirst({
    where: {
      id: req.params.eventId,
      projectId: req.params.projectId,
      project: { userId: req.user!.id },
    },
    include: { project: { select: { repository: true, githubToken: true } } },
  });
  if (!event) throw new ApiError('Evento de sincronización no encontrado', 404);
  if (event.status !== 'PENDING') throw new ApiError('El evento ya fue resuelto', 409);

  if (!event.project.repository) throw new ApiError('El proyecto no tiene repositorio configurado', 400);
  const currentIssues = await fetchIssues(
    event.project.repository,
    'all',
    event.project.githubToken ? decryptApiKey(event.project.githubToken) : undefined,
  );
  const currentIssue = currentIssues.find((issue) => String(issue.number) === event.externalId);
  if (!currentIssue || currentIssue.updated_at !== event.sourceVersion) {
    throw new ApiError('El issue de GitHub cambió nuevamente. Actualiza la vista y genera un nuevo evento.', 409);
  }

  const snapshot = event.snapshot as { title?: string; description?: string; mapped?: Record<string, unknown>; sourceUpdatedAt?: string };
  const mapped = snapshot.mapped || {};
  let entity: unknown;

  if (event.entityType === 'HDU') {
    const existing = await prisma.userStory.findFirst({ where: { id: event.entityId, projectId: event.projectId, userId: req.user!.id } });
    if (!existing) throw new ApiError('HDU vinculada al evento no encontrada', 404);
    entity = await prisma.userStory.update({
      where: { id: existing.id },
      data: {
        title: normalizeIssueTitle(String(snapshot.title || mapped.title || existing.title)),
        description: String(snapshot.description || existing.description),
        acceptanceCriteria: Array.isArray(mapped.acceptanceCriteria) ? mapped.acceptanceCriteria as string[] : existing.acceptanceCriteria,
        definitionOfDone: Array.isArray(mapped.definitionOfDone) ? mapped.definitionOfDone as string[] : existing.definitionOfDone,
        technicalNotes: Array.isArray(mapped.technicalNotes) ? mapped.technicalNotes as string[] : existing.technicalNotes,
        evidences: Array.isArray(mapped.evidences) ? mapped.evidences as string[] : existing.evidences,
        dependencies: Array.isArray(mapped.dependencies) ? mapped.dependencies as string[] : existing.dependencies,
        priority: typeof mapped.priority === 'string' ? mapped.priority as any : existing.priority,
        storyPoints: typeof mapped.storyPoints === 'number' ? mapped.storyPoints : null,
        labels: Array.isArray(mapped.labels) ? mapped.labels as string[] : existing.labels,
        assignee: typeof mapped.assignee === 'string' ? mapped.assignee : null,
        branchName: typeof mapped.branchName === 'string' ? mapped.branchName : null,
        syncStatus: 'SYNCED',
        syncMetadata: { issueNumber: event.externalId, source: 'github', sourceUpdatedAt: event.sourceVersion, acceptedAt: new Date().toISOString() },
        syncedAt: new Date(event.sourceVersion),
      },
    });
  } else if (event.entityType === 'BUG') {
    const existing = await prisma.bugReport.findFirst({ where: { id: event.entityId, projectId: event.projectId, userId: req.user!.id } });
    if (!existing) throw new ApiError('Bug vinculado al evento no encontrado', 404);
    entity = await prisma.bugReport.update({
      where: { id: existing.id },
      data: {
        title: normalizeIssueTitle(String(snapshot.title || mapped.title || existing.title)),
        description: String(snapshot.description || existing.description),
        severity: typeof mapped.severity === 'string' ? mapped.severity as any : existing.severity,
        stepsToReproduce: Array.isArray(mapped.stepsToReproduce) ? mapped.stepsToReproduce as string[] : existing.stepsToReproduce,
        expectedResult: typeof mapped.expectedResult === 'string' ? mapped.expectedResult : existing.expectedResult,
        actualResult: typeof mapped.actualResult === 'string' ? mapped.actualResult : existing.actualResult,
        labels: Array.isArray(mapped.labels) ? mapped.labels as string[] : existing.labels,
        assignee: typeof mapped.assignee === 'string' ? mapped.assignee : null,
        branchName: typeof mapped.branchName === 'string' ? mapped.branchName : null,
        githubSyncedAt: new Date(event.sourceVersion),
        githubSyncMetadata: { issueNumber: event.externalId, source: 'github', sourceUpdatedAt: event.sourceVersion, acceptedAt: new Date().toISOString() },
      },
    });
  } else if (event.entityType === 'EPIC' || event.entityType === 'FEATURE') {
    const name = normalizeIssueTitle(String(snapshot.title || mapped.title || ''));
    if (event.entityType === 'EPIC') {
      entity = await prisma.epic.update({
        where: { id: event.entityId },
        data: {
          name,
          description: String(snapshot.description || ''),
          externalSystem: 'GITHUB',
          externalId: event.externalId,
          syncStatus: 'SYNCED',
          syncMetadata: { issueNumber: event.externalId, source: 'github', sourceUpdatedAt: event.sourceVersion, acceptedAt: new Date().toISOString() },
          syncedAt: new Date(event.sourceVersion),
        },
      });
    } else {
      entity = await prisma.feature.update({
        where: { id: event.entityId },
        data: {
          name,
          description: String(snapshot.description || ''),
          externalSystem: 'GITHUB',
          externalId: event.externalId,
          syncStatus: 'SYNCED',
          syncMetadata: { issueNumber: event.externalId, source: 'github', sourceUpdatedAt: event.sourceVersion, acceptedAt: new Date().toISOString() },
          syncedAt: new Date(event.sourceVersion),
        },
      });
    }
  } else {
    throw new ApiError(`Tipo de work item no soportado: ${event.entityType}`, 400);
  }

  const resolved = await prisma.syncEvent.update({
    where: { id: event.id },
    data: { status: 'ACCEPTED', resolvedById: req.user!.id, resolvedAt: new Date() },
  });
  res.json({ event: resolved, entity, message: 'Cambio de GitHub aplicado en el SaaS' });
}));

/** Rechaza un cambio externo sin modificar la entidad local. */
router.post('/:projectId/events/:eventId/reject', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const event = await prisma.syncEvent.findFirst({
    where: { id: req.params.eventId, projectId: req.params.projectId, project: { userId: req.user!.id } },
  });
  if (!event) throw new ApiError('Evento de sincronización no encontrado', 404);
  if (event.status !== 'PENDING') throw new ApiError('El evento ya fue resuelto', 409);
  const resolved = await prisma.syncEvent.update({
    where: { id: event.id },
    data: { status: 'REJECTED', resolvedById: req.user!.id, resolvedAt: new Date() },
  });
  res.json({ event: resolved, message: 'Cambio de GitHub rechazado; el SaaS no fue modificado' });
}));

/**
 * POST /api/github-sync/:projectId/push
 * Publica cambios de una épica o feature local en su issue vinculado.
 * HDUs y bugs conservan sus endpoints especializados por compatibilidad.
 */
router.post('/:projectId/push', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { entityType, entityId } = req.body as { entityType?: string; entityId?: string };
  if (!['EPIC', 'FEATURE'].includes(entityType || '') || !entityId) {
    throw new ApiError('Faltan entityType (EPIC o FEATURE) y entityId', 400);
  }

  const project = await prisma.project.findFirst({ where: { id: req.params.projectId, userId: req.user!.id } });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  if (!project.repository || !/^https?:\/\/(?:www\.)?github\.com\//i.test(project.repository)) {
    throw new ApiError('El proyecto no tiene un repositorio de GitHub válido.', 400);
  }

  const entity = entityType === 'EPIC'
    ? await prisma.epic.findFirst({ where: { id: entityId, projectId: project.id }, select: { id: true, name: true, description: true, externalId: true, externalUrl: true } })
    : await prisma.feature.findFirst({ where: { id: entityId, epic: { projectId: project.id } }, select: { id: true, name: true, description: true, externalId: true, externalUrl: true } });
  if (!entity) throw new ApiError(`${entityType === 'EPIC' ? 'Épica' : 'Feature'} no encontrada`, 404);
  const issueNumber = entity.externalId ? Number(entity.externalId) : NaN;
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) throw new ApiError('El work item no tiene un issue de GitHub válido.', 400);

  const projectToken = project.githubToken ? decryptApiKey(project.githubToken) : undefined;
  const githubResult = await updateGitHubIssue(
    project.repository,
    issueNumber,
    {
      title: buildGitHubImportedWorkItemTitle(entityType as 'EPIC' | 'FEATURE', entity.name),
      body: entity.description,
    },
    projectToken,
  );
  const syncedAt = githubResult.updated_at ? new Date(githubResult.updated_at) : new Date();
  const updated = entityType === 'EPIC'
    ? await prisma.epic.update({ where: { id: entity.id }, data: { syncStatus: 'SYNCED', syncMetadata: { issueNumber, source: 'github', sourceUpdatedAt: githubResult.updated_at, syncedAt: syncedAt.toISOString() }, syncedAt } })
    : await prisma.feature.update({ where: { id: entity.id }, data: { syncStatus: 'SYNCED', syncMetadata: { issueNumber, source: 'github', sourceUpdatedAt: githubResult.updated_at, syncedAt: syncedAt.toISOString() }, syncedAt } });

  res.json({ message: `${entityType === 'EPIC' ? 'Épica' : 'Feature'} sincronizada con GitHub`, entity: updated, github: githubResult });
}));

/**
 * POST /api/github-sync/:projectId/sync
 * Actualiza HDUs importadas cuando su issue de GitHub cambió.
 *
 * Body: { issueNumbers: number[], force?: boolean }
 */
router.post('/:projectId/sync', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { issueNumbers, force = false } = req.body;
  if (!Array.isArray(issueNumbers) || issueNumbers.length === 0) {
    throw new ApiError('Falta issueNumbers (array de números de issue)', 400);
  }
  if (issueNumbers.some((number) => !Number.isInteger(number) || number <= 0)) {
    throw new ApiError('issueNumbers debe contener números enteros positivos', 400);
  }
  const normalizedIssueNumbers = [...new Set(issueNumbers as number[])];

  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  if (!project.repository) throw new ApiError('El proyecto no tiene repositorio configurado', 400);

  const token = project.githubToken ? decryptApiKey(project.githubToken) : undefined;
  const issues = await fetchIssues(project.repository, 'all', token);
  const stories: Array<{ id: string; externalId: string | null; syncedAt: Date | null; syncMetadata: unknown; displayId: string | null; sourceDisplayId: string | null }> = await prisma.userStory.findMany({
    where: {
      projectId: project.id,
      userId: req.user!.id,
      externalSystem: 'GITHUB',
      externalId: { in: normalizedIssueNumbers.map(String) },
    },
  });
  const bugs: Array<{ id: string; githubId: string | null; updatedAt: Date | null; githubSyncedAt: Date | null }> = await prisma.bugReport.findMany({
    where: {
      projectId: project.id,
      userId: req.user!.id,
      githubId: { in: normalizedIssueNumbers.map(String) },
    },
  });
  const epics: GitHubContainerSyncRecord[] = await prisma.epic.findMany({
    where: { projectId: project.id },
    select: { id: true, name: true, externalId: true, syncedAt: true, syncMetadata: true },
  });
  const features: GitHubContainerSyncRecord[] = await prisma.feature.findMany({
    where: { epic: { projectId: project.id } },
    select: { id: true, name: true, externalId: true, syncedAt: true, syncMetadata: true },
  });

  const synced: Array<{ id: string; issueNumber: number; type: IssueTargetType }> = [];
  const skipped: number[] = [];
  for (const issue of issues.filter((item) => normalizedIssueNumbers.includes(item.number))) {
    const targetType = detectIssueTarget(issue);

    if (targetType === 'BUG') {
      // Sincronizar bug
      const bug = bugs.find((item) => item.githubId === String(issue.number));
      if (!bug || !hasGitHubIssueChanged(issue, bug.githubSyncedAt || bug.updatedAt)) {
        skipped.push(issue.number);
        continue;
      }

      const bugMapped = mapIssueToBugReport(issue);
      const bugDescriptionWithRef = buildIssueDescription(bugMapped.description, bugMapped.githubUrl);
      const normalizedTitle = normalizeIssueTitle(bugMapped.title);

      await prisma.bugReport.update({
        where: { id: bug.id },
        data: {
          title: normalizedTitle,
          description: bugDescriptionWithRef,
          severity: bugMapped.severity as any,
          stepsToReproduce: bugMapped.stepsToReproduce,
          expectedResult: bugMapped.expectedResult,
          actualResult: bugMapped.actualResult,
          assignee: bugMapped.assignee,
          labels: bugMapped.labels,
          branchName: bugMapped.branchName ?? null,
          githubSyncedAt: new Date(issue.updated_at),
          githubSyncMetadata: { issueNumber: issue.number, source: 'github', sourceUpdatedAt: issue.updated_at, syncedAt: new Date().toISOString() },
        },
      });
      synced.push({ id: bug.id, issueNumber: issue.number, type: 'BUG' });
    } else if (targetType === 'EPIC') {
      const mapped = mapIssueToUserStory(issue);
      const normalizedTitle = normalizeIssueTitle(mapped.title);
      const epic = epics.find((item) => item.externalId === String(issue.number))
        || epics.find((item) => item.name === normalizedTitle);
      if (!epic || (!force && !hasGitHubIssueChanged(issue, getLastGitHubUpdate(epic)))) {
        skipped.push(issue.number);
        continue;
      }

      const syncedAt = new Date();
      await prisma.epic.update({
        where: { id: epic.id },
        data: {
          name: normalizedTitle,
          description: buildIssueDescription(mapped.description, mapped.githubUrl),
          externalSystem: 'GITHUB',
          externalId: String(issue.number),
          externalUrl: mapped.githubUrl,
          syncStatus: 'SYNCED',
          syncMetadata: {
            issueNumber: issue.number,
            source: 'github',
            sourceUpdatedAt: issue.updated_at,
            syncedAt: syncedAt.toISOString(),
          },
          syncedAt,
        },
      });
      synced.push({ id: epic.id, issueNumber: issue.number, type: 'EPIC' });
    } else if (targetType === 'FEATURE') {
      const mapped = mapIssueToUserStory(issue);
      const normalizedTitle = normalizeIssueTitle(mapped.title);
      const feature = features.find((item) => item.externalId === String(issue.number))
        || features.find((item) => item.name === normalizedTitle);
      if (!feature || (!force && !hasGitHubIssueChanged(issue, getLastGitHubUpdate(feature)))) {
        skipped.push(issue.number);
        continue;
      }

      const syncedAt = new Date();
      await prisma.feature.update({
        where: { id: feature.id },
        data: {
          name: normalizedTitle,
          description: buildIssueDescription(mapped.description, mapped.githubUrl),
          externalSystem: 'GITHUB',
          externalId: String(issue.number),
          externalUrl: mapped.githubUrl,
          syncStatus: 'SYNCED',
          syncMetadata: {
            issueNumber: issue.number,
            source: 'github',
            sourceUpdatedAt: issue.updated_at,
            syncedAt: syncedAt.toISOString(),
          },
          syncedAt,
        },
      });
      synced.push({ id: feature.id, issueNumber: issue.number, type: 'FEATURE' });
    } else {
      // Sincronizar HDU
      const story = stories.find((item) => item.externalId === String(issue.number));
      // `force` is used when opening the DoR editor. This is important for
      // fields added after the original import (assignee, labels and branch):
      // GitHub may not have changed the issue since the last regular sync,
      // but the local record can still be missing those values.
      if (!story || (!force && !hasGitHubIssueChanged(issue, getLastGitHubUpdate(story)))) {
        skipped.push(issue.number);
        continue;
      }

      const mapped = mapIssueToUserStory(issue);
      const sourceDisplayId = extractSourceHduDisplayId(issue.title, issue.body);
      await prisma.userStory.update({
        where: { id: story.id },
        data: {
          // GitHub puede contener el correlativo publicado por el SaaS; no lo
          // persistas como parte del nombre funcional de la HDU.
          title: normalizeIssueTitle(mapped.title),
          description: buildIssueDescription(mapped.description, mapped.githubUrl),
          acceptanceCriteria: mapped.acceptanceCriteria,
          definitionOfDone: mapped.definitionOfDone,
          technicalNotes: mapped.technicalNotes,
          evidences: mapped.evidences,
          dependencies: mapped.dependencies,
          storyPoints: mapped.storyPoints,
          labels: mapped.labels,
          assignee: mapped.assignee,
          // A null value is intentional: it removes a stale local branch when
          // the GitHub issue no longer declares one in its metadata.
          branchName: mapped.branchName ?? null,
          priority: mapped.priority as any,
          syncStatus: 'SYNCED',
          sourceDisplayId: story.sourceDisplayId || sourceDisplayId,
          syncMetadata: {
            issueNumber: issue.number,
            source: 'github',
            sourceUpdatedAt: issue.updated_at,
            sourceDisplayId,
            canonicalDisplayId: story.displayId,
            syncedAt: new Date().toISOString(),
          },
          syncedAt: new Date(),
        },
      });
      synced.push({ id: story.id, issueNumber: issue.number, type: 'HDU' });
    }
  }

  res.json({ synced, skipped, summary: { total: normalizedIssueNumbers.length, synced: synced.length, skipped: skipped.length } });
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
      where: {
        id: featureId,
        epicId: epicId || undefined,
        epic: { projectId: project.id },
      },
    });
    if (!feature) throw new ApiError('Feature no encontrada', 404);
  }

  const projectToken = project.githubToken ? decryptApiKey(project.githubToken) : undefined;
  const allIssues = await fetchIssues(project.repository, 'all', projectToken);
  // El correlativo del SaaS debe seguir el orden histórico de GitHub:
  // issue más antiguo primero, independientemente del orden de la API.
  const toImport = allIssues
    .filter((i) => issueNumbers.includes(i.number))
    .sort((left, right) => {
      const leftSource = parseHduNumber(extractSourceHduDisplayId(left.title, left.body));
      const rightSource = parseHduNumber(extractSourceHduDisplayId(right.title, right.body));
      if (leftSource !== null && rightSource !== null && leftSource !== rightSource) return leftSource - rightSource;
      if ((leftSource !== null) !== (rightSource !== null)) return leftSource !== null ? -1 : 1;
      return left.number - right.number;
    });

  if (toImport.length === 0) {
    throw new ApiError('No se encontraron issues con esos números', 404);
  }

  const imported: Array<{ id: string; title: string; issueNumber: number; targetType: IssueTargetType }> = [];
  const skipped: Array<{ issueNumber: number; reason: string }> = [];
  const errors: Array<{ issueNumber: number; error: string }> = [];

  const publishImportedTitle = async (
    issue: typeof toImport[number],
    targetType: IssueTargetType,
    title: string,
    displayId?: string | null,
  ) => updateGitHubIssue(
    project.repository!,
    issue.number,
    { title: buildGitHubImportedWorkItemTitle(targetType, title, displayId) },
    projectToken,
  );

  for (const issue of toImport) {
    try {
      const externalId = String(issue.number);
      const targetType = detectIssueTarget(issue);

      // Verificar si ya existe (como HDU o como Bug)
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

      const existingBug = await prisma.bugReport.findFirst({
        where: {
          projectId: project.id,
          githubId: externalId,
        },
      });
      if (existingBug) {
        skipped.push({ issueNumber: issue.number, reason: 'Ya existe un Bug sincronizado para este issue' });
        continue;
      }

      const mapped = mapIssueToUserStory(issue);
      const descriptionWithRef = buildIssueDescription(mapped.description, mapped.githubUrl);
      const normalizedTitle = normalizeIssueTitle(mapped.title);

      if (targetType === 'EPIC') {
        const existingEpic = await prisma.epic.findFirst({
          where: { projectId: project.id, externalSystem: 'GITHUB', externalId },
          select: { id: true, name: true, externalId: true },
        }) || await prisma.epic.findFirst({
          // Compatibilidad con épicas importadas antes de guardar identidad externa.
          where: { projectId: project.id, name: normalizedTitle },
          select: { id: true, name: true, externalId: true },
        });

        const epic = existingEpic
          ? await prisma.epic.update({
            where: { id: existingEpic.id },
            data: {
              name: normalizedTitle,
              description: descriptionWithRef,
              externalSystem: 'GITHUB',
              externalId,
              externalUrl: mapped.githubUrl,
              syncStatus: 'SYNCED',
              syncMetadata: { issueNumber: issue.number, source: 'github', sourceUpdatedAt: issue.updated_at, syncedAt: new Date().toISOString() },
              syncedAt: new Date(),
            },
            select: { id: true, name: true },
          })
          : await prisma.epic.create({
          data: {
            name: normalizedTitle,
            description: descriptionWithRef,
            projectId: project.id,
            externalSystem: 'GITHUB',
            externalId,
            externalUrl: mapped.githubUrl,
            syncStatus: 'SYNCED',
            syncMetadata: { issueNumber: issue.number, source: 'github', sourceUpdatedAt: issue.updated_at, importedAt: new Date().toISOString() },
            syncedAt: new Date(),
          },
          select: { id: true, name: true },
        });

        const githubResult = await publishImportedTitle(issue, targetType, epic.name);
        await prisma.epic.update({
          where: { id: epic.id },
          data: {
            syncMetadata: {
              issueNumber: issue.number,
              source: 'github',
              sourceUpdatedAt: githubResult.updated_at || issue.updated_at,
              syncedAt: new Date().toISOString(),
            },
            syncedAt: githubResult.updated_at ? new Date(githubResult.updated_at) : new Date(),
          },
        });

        imported.push({ id: epic.id, title: epic.name, issueNumber: issue.number, targetType });
        continue;
      }

      if (targetType === 'FEATURE') {
        const resolvedEpicId = epicId || (await ensureDefaultEpic(project.id)).id;
        const existingFeature = await prisma.feature.findFirst({
          where: { epicId: resolvedEpicId, externalSystem: 'GITHUB', externalId },
          select: { id: true, name: true, externalId: true },
        }) || await prisma.feature.findFirst({
          // Compatibilidad con features importadas antes de guardar identidad externa.
          where: { epicId: resolvedEpicId, name: normalizedTitle },
          select: { id: true, name: true, externalId: true },
        });

        const feature = existingFeature
          ? await prisma.feature.update({
            where: { id: existingFeature.id },
            data: {
              name: normalizedTitle,
              description: descriptionWithRef,
              externalSystem: 'GITHUB',
              externalId,
              externalUrl: mapped.githubUrl,
              syncStatus: 'SYNCED',
              syncMetadata: { issueNumber: issue.number, source: 'github', sourceUpdatedAt: issue.updated_at, syncedAt: new Date().toISOString() },
              syncedAt: new Date(),
            },
            select: { id: true, name: true },
          })
          : await prisma.feature.create({
          data: {
            name: normalizedTitle,
            description: descriptionWithRef,
            epicId: resolvedEpicId,
            externalSystem: 'GITHUB',
            externalId,
            externalUrl: mapped.githubUrl,
            syncStatus: 'SYNCED',
            syncMetadata: { issueNumber: issue.number, source: 'github', sourceUpdatedAt: issue.updated_at, importedAt: new Date().toISOString() },
            syncedAt: new Date(),
          },
          select: { id: true, name: true },
        });

        const githubResult = await publishImportedTitle(issue, targetType, feature.name);
        await prisma.feature.update({
          where: { id: feature.id },
          data: {
            syncMetadata: {
              issueNumber: issue.number,
              source: 'github',
              sourceUpdatedAt: githubResult.updated_at || issue.updated_at,
              syncedAt: new Date().toISOString(),
            },
            syncedAt: githubResult.updated_at ? new Date(githubResult.updated_at) : new Date(),
          },
        });

        imported.push({ id: feature.id, title: feature.name, issueNumber: issue.number, targetType });
        continue;
      }

      if (targetType === 'BUG') {
        // Importar como BugReport
        const bugMapped = mapIssueToBugReport(issue);
        const bugDescriptionWithRef = buildIssueDescription(bugMapped.description, bugMapped.githubUrl);

        const bug = await prisma.bugReport.create({
          data: {
            title: normalizedTitle,
            description: bugDescriptionWithRef,
            severity: bugMapped.severity as any,
            stepsToReproduce: bugMapped.stepsToReproduce,
            expectedResult: bugMapped.expectedResult,
            actualResult: bugMapped.actualResult,
            projectId: project.id,
            userId: req.user!.id,
            githubId: externalId,
            githubSyncedAt: new Date(issue.updated_at),
            githubSyncMetadata: { issueNumber: issue.number, source: 'github', sourceUpdatedAt: issue.updated_at, importedAt: new Date().toISOString() },
            status: 'OPEN',
            assignee: bugMapped.assignee,
            labels: bugMapped.labels,
            branchName: bugMapped.branchName,
          },
        });

        await publishImportedTitle(issue, targetType, bug.title);

        imported.push({ id: bug.id, title: bug.title, issueNumber: issue.number, targetType });
        continue;
      }

      // targetType === 'HDU'
      const resolvedFeature = featureId
        ? await prisma.feature.findFirst({
          where: { id: featureId, epic: { projectId: project.id } },
          select: { id: true, epicId: true },
        })
        : await ensureDefaultFeature(project.id, epicId || null);

      if (!resolvedFeature) {
        throw new ApiError('No se pudo resolver una Feature válida para importar la HDU', 400);
      }

      const sourceDisplayId = extractSourceHduDisplayId(issue.title, issue.body);
      const userStory = await prisma.$transaction(async (tx) => {
        // El ID del issue o el HDU-### de GitHub no gobierna la identidad
        // interna. Si el HDU canónico de la fuente sigue libre, se recupera;
        // si no, el SaaS reserva el siguiente correlativo libre.
        const identity = await reserveHduIdentity(tx, parseHduNumber(sourceDisplayId));
        return tx.userStory.create({
          data: {
            title: normalizedTitle,
            description: descriptionWithRef,
            acceptanceCriteria: mapped.acceptanceCriteria,
            definitionOfDone: mapped.definitionOfDone,
            technicalNotes: mapped.technicalNotes,
            evidences: mapped.evidences,
            dependencies: mapped.dependencies,
            storyPoints: mapped.storyPoints,
            labels: mapped.labels,
            assignee: mapped.assignee,
            branchName: mapped.branchName,
            priority: mapped.priority as any,
            projectId: project.id,
            userId: req.user!.id,
            epicId: resolvedFeature.epicId,
            featureId: resolvedFeature.id,
            hduNumber: identity.hduNumber,
            displayId: identity.displayId,
            sourceDisplayId,
            status: 'NEW',
            externalSystem: 'GITHUB',
            externalId,
            externalUrl: mapped.githubUrl,
            syncStatus: 'SYNCED',
            syncMetadata: {
              issueNumber: issue.number,
              source: 'github',
              importedAt: new Date().toISOString(),
              targetType,
              sourceDisplayId,
              canonicalDisplayId: identity.displayId,
              identityResolution: identity.resolution,
            },
            syncedAt: new Date(),
          },
        });
      });
      const githubResult = await publishImportedTitle(issue, targetType, userStory.title, userStory.displayId);
      await prisma.userStory.update({
        where: { id: userStory.id },
        data: {
          syncMetadata: {
            issueNumber: issue.number,
            source: 'github',
            importedAt: new Date().toISOString(),
            sourceUpdatedAt: githubResult.updated_at || issue.updated_at,
            targetType,
            sourceDisplayId,
            canonicalDisplayId: userStory.displayId,
            identityResolution: 'ALLOCATED_NEW',
          },
          syncedAt: githubResult.updated_at ? new Date(githubResult.updated_at) : new Date(),
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

/** GET /api/github-sync/:projectId/collaborators */
router.get('/:projectId/collaborators', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  if (!project.repository) throw new ApiError('El proyecto no tiene repositorio configurado', 400);
  const token = project.githubToken ? decryptApiKey(project.githubToken) : undefined;
  const collaborators = await fetchCollaborators(project.repository, token);
  res.json({ collaborators });
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
    where: { id: userStoryId, projectId: req.params.projectId, userId: req.user!.id },
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