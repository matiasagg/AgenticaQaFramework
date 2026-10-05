/**
 * Epic Routes
 * CRUD para épicas que agrupan features y user stories.
 */
import { Router, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import {
  buildPortfolioDorPreview,
  parsePortfolioDorFixRequest,
  portfolioDorRequestError,
  validatePortfolioDor,
} from '../services/portfolioDor';

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

  const contentChanged = name !== undefined || description !== undefined;
  const epic = await prisma.epic.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(contentChanged ? { dorScore: null, dorChecklist: Prisma.DbNull, isReady: false, staticAnalysis: Prisma.DbNull } : {}),
    },
    include: { project: true, features: true, userStories: true },
  });
  res.json({ epic });
}));

// POST /api/epics/:id/validate-dor - Validación DoR estática de la épica
router.post('/:id/validate-dor', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const epic = await prisma.epic.findFirst({
    where: { id: req.params.id, project: { userId: req.user!.id } },
    include: { features: { select: { id: true } }, userStories: { select: { id: true } } },
  });
  if (!epic) throw new ApiError('Épica no encontrada', 404);

  const validation = validatePortfolioDor({
    kind: 'EPIC', name: epic.name, description: epic.description,
    featureCount: epic.features.length, storyCount: epic.userStories.length,
  });
  const validatedAt = new Date();
  const staticAnalysis = JSON.parse(JSON.stringify({ ...validation, validatedAt: validatedAt.toISOString() }));
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.epic.update({
      where: { id: epic.id },
      data: { dorScore: validation.score, dorChecklist: JSON.parse(JSON.stringify(validation.checklist)), isReady: validation.isReady, staticAnalysis },
      include: { project: true, features: true, userStories: true },
    });
    await tx.dorEntityValidation.create({
      data: { entityType: 'EPIC', entityId: epic.id, userId: req.user!.id, source: 'RULES', score: validation.score, isReady: validation.isReady, checklist: JSON.parse(JSON.stringify(validation.checklist)), recommendations: JSON.parse(JSON.stringify(validation.recommendationsDetailed)), validatedAt },
    });
    return result;
  });
  res.json({ epic: updated, entity: updated, validation: { ...validation, cached: false, validatedAt: validatedAt.toISOString() } });
}));

// POST /api/epics/:id/preview-dor-fixes - Preview sin mutar la épica
router.post('/:id/preview-dor-fixes', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  let request;
  try { request = parsePortfolioDorFixRequest(req.body, 'EPIC'); } catch (error) { throw portfolioDorRequestError(error); }
  const epic = await prisma.epic.findFirst({ where: { id: req.params.id, project: { userId: req.user!.id } }, include: { features: { select: { id: true } }, userStories: { select: { id: true } } } });
  if (!epic) throw new ApiError('Épica no encontrada', 404);
  const preview = buildPortfolioDorPreview('EPIC', epic as unknown as Record<string, unknown>, request);
  res.json({ epic, entity: epic, preview });
}));

// POST /api/epics/:id/apply-dor-fixes - Confirmación atómica de mejoras
router.post('/:id/apply-dor-fixes', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  let request;
  try { request = parsePortfolioDorFixRequest(req.body, 'EPIC'); } catch (error) { throw portfolioDorRequestError(error); }
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.epic.findFirst({ where: { id: req.params.id, project: { userId: req.user!.id } }, include: { features: { select: { id: true } }, userStories: { select: { id: true } } } });
    if (!existing) throw new ApiError('Épica no encontrada', 404);
    if (request.baseUpdatedAt && new Date(request.baseUpdatedAt).getTime() !== existing.updatedAt.getTime()) throw new ApiError('La épica cambió mientras revisabas el preview. Genera uno nuevo.', 409);
    const preview = buildPortfolioDorPreview('EPIC', existing as unknown as Record<string, unknown>, request);
    if (preview.conflicts.length) throw new ApiError('La selección contiene recomendaciones incompatibles.', 409);
    if (!preview.changes.length) throw new ApiError('Ninguno de los parches enviados modifica la épica.', 400);
    const updateData: any = {};
    for (const change of preview.changes) if (['name', 'description', 'status'].includes(change.field)) updateData[change.field] = change.proposedValue;
    const validation = validatePortfolioDor({ kind: 'EPIC', name: updateData.name ?? existing.name, description: updateData.description ?? existing.description, featureCount: existing.features.length, storyCount: existing.userStories.length });
    Object.assign(updateData, { dorScore: validation.score, dorChecklist: JSON.parse(JSON.stringify(validation.checklist)), isReady: validation.isReady, staticAnalysis: Prisma.DbNull });
    const epic = await tx.epic.update({ where: { id: existing.id }, data: updateData, include: { project: true, features: true, userStories: true } });
    await tx.dorEntityAudit.create({ data: { entityType: 'EPIC', entityId: existing.id, userId: req.user!.id, changedFields: JSON.parse(JSON.stringify(preview.changes)), appliedRecommendations: JSON.parse(JSON.stringify(request.recommendations)) } });
    await tx.dorEntityValidation.create({ data: { entityType: 'EPIC', entityId: existing.id, userId: req.user!.id, source: 'APPLY_STATIC', score: validation.score, isReady: validation.isReady, checklist: JSON.parse(JSON.stringify(validation.checklist)), recommendations: JSON.parse(JSON.stringify(validation.recommendationsDetailed)) } });
    return { epic, validation, preview };
  });
  res.json({ epic: result.epic, entity: result.epic, validation: { ...result.validation, cached: false }, changedFields: result.preview.changedFields, appliedRecommendations: result.preview.selectedRecommendations, pendingRecommendations: result.preview.pendingRecommendations, appliedCount: result.preview.changes.length });
}));

// GET /api/epics/:id/dor-history - Historial y auditoría de la épica
router.get('/:id/dor-history', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const epic = await prisma.epic.findFirst({ where: { id: req.params.id, project: { userId: req.user!.id } }, select: { id: true } });
  if (!epic) throw new ApiError('Épica no encontrada', 404);
  const [validations, audits] = await Promise.all([
    prisma.dorEntityValidation.findMany({ where: { entityType: 'EPIC', entityId: epic.id, userId: req.user!.id }, orderBy: { validatedAt: 'desc' }, take: 50 }),
    prisma.dorEntityAudit.findMany({ where: { entityType: 'EPIC', entityId: epic.id, userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  res.json({ validations, audits });
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