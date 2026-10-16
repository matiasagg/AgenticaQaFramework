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

  const contentChanged = name !== undefined || description !== undefined;
  const feature = await prisma.feature.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(contentChanged ? { dorScore: null, dorChecklist: Prisma.DbNull, isReady: false, staticAnalysis: Prisma.DbNull } : {}),
    },
    include: { epic: true, userStories: true },
  });
  res.json({ feature });
}));

// POST /api/features/:id/validate-dor - Validación DoR estática de la feature
router.post('/:id/validate-dor', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const feature = await prisma.feature.findFirst({
    where: { id: req.params.id, epic: { project: { userId: req.user!.id } } },
    include: { userStories: { select: { id: true } } },
  });
  if (!feature) throw new ApiError('Feature no encontrada', 404);
  const validation = validatePortfolioDor({ kind: 'FEATURE', name: feature.name, description: feature.description, storyCount: feature.userStories.length });
  const validatedAt = new Date();
  const staticAnalysis = JSON.parse(JSON.stringify({ ...validation, validatedAt: validatedAt.toISOString() }));
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.feature.update({ where: { id: feature.id }, data: { dorScore: validation.score, dorChecklist: JSON.parse(JSON.stringify(validation.checklist)), isReady: validation.isReady, staticAnalysis }, include: { epic: true, userStories: true } });
    await tx.dorEntityValidation.create({ data: { entityType: 'FEATURE', entityId: feature.id, userId: req.user!.id, source: 'RULES', score: validation.score, isReady: validation.isReady, checklist: JSON.parse(JSON.stringify(validation.checklist)), recommendations: JSON.parse(JSON.stringify(validation.recommendationsDetailed)), validatedAt } });
    return result;
  });
  res.json({ feature: updated, entity: updated, validation: { ...validation, cached: false, validatedAt: validatedAt.toISOString() } });
}));

// POST /api/features/:id/preview-dor-fixes - Preview sin mutar la feature
router.post('/:id/preview-dor-fixes', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  let request;
  try { request = parsePortfolioDorFixRequest(req.body, 'FEATURE'); } catch (error) { throw portfolioDorRequestError(error); }
  const feature = await prisma.feature.findFirst({ where: { id: req.params.id, epic: { project: { userId: req.user!.id } } }, include: { userStories: { select: { id: true } } } });
  if (!feature) throw new ApiError('Feature no encontrada', 404);
  const preview = buildPortfolioDorPreview('FEATURE', feature as unknown as Record<string, unknown>, request);
  res.json({ feature, entity: feature, preview });
}));

// POST /api/features/:id/apply-dor-fixes - Confirmación atómica de mejoras
router.post('/:id/apply-dor-fixes', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  let request;
  try { request = parsePortfolioDorFixRequest(req.body, 'FEATURE'); } catch (error) { throw portfolioDorRequestError(error); }
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.feature.findFirst({ where: { id: req.params.id, epic: { project: { userId: req.user!.id } } }, include: { userStories: { select: { id: true } } } });
    if (!existing) throw new ApiError('Feature no encontrada', 404);
    if (request.baseUpdatedAt && new Date(request.baseUpdatedAt).getTime() !== existing.updatedAt.getTime()) throw new ApiError('La feature cambió mientras revisabas el preview. Genera uno nuevo.', 409);
    const preview = buildPortfolioDorPreview('FEATURE', existing as unknown as Record<string, unknown>, request);
    if (preview.conflicts.length) throw new ApiError('La selección contiene recomendaciones incompatibles.', 409);
    if (!preview.changes.length) throw new ApiError('Ninguno de los parches enviados modifica la feature.', 400);
    const updateData: any = {};
    for (const change of preview.changes) if (['name', 'description', 'status'].includes(change.field)) updateData[change.field] = change.proposedValue;
    const validation = validatePortfolioDor({ kind: 'FEATURE', name: updateData.name ?? existing.name, description: updateData.description ?? existing.description, storyCount: existing.userStories.length });
    Object.assign(updateData, { dorScore: validation.score, dorChecklist: JSON.parse(JSON.stringify(validation.checklist)), isReady: validation.isReady, staticAnalysis: Prisma.DbNull });
    const feature = await tx.feature.update({ where: { id: existing.id }, data: updateData, include: { epic: true, userStories: true } });
    await tx.dorEntityAudit.create({ data: { entityType: 'FEATURE', entityId: existing.id, userId: req.user!.id, changedFields: JSON.parse(JSON.stringify(preview.changes)), appliedRecommendations: JSON.parse(JSON.stringify(request.recommendations)) } });
    await tx.dorEntityValidation.create({ data: { entityType: 'FEATURE', entityId: existing.id, userId: req.user!.id, source: 'APPLY_STATIC', score: validation.score, isReady: validation.isReady, checklist: JSON.parse(JSON.stringify(validation.checklist)), recommendations: JSON.parse(JSON.stringify(validation.recommendationsDetailed)) } });
    return { feature, validation, preview };
  });
  res.json({ feature: result.feature, entity: result.feature, validation: { ...result.validation, cached: false }, changedFields: result.preview.changedFields, appliedRecommendations: result.preview.selectedRecommendations, pendingRecommendations: result.preview.pendingRecommendations, appliedCount: result.preview.changes.length });
}));

// GET /api/features/:id/dor-history - Historial y auditoría de la feature
router.get('/:id/dor-history', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const feature = await prisma.feature.findFirst({ where: { id: req.params.id, epic: { project: { userId: req.user!.id } } }, select: { id: true } });
  if (!feature) throw new ApiError('Feature no encontrada', 404);
  const [validations, audits] = await Promise.all([
    prisma.dorEntityValidation.findMany({ where: { entityType: 'FEATURE', entityId: feature.id, userId: req.user!.id }, orderBy: { validatedAt: 'desc' }, take: 50 }),
    prisma.dorEntityAudit.findMany({ where: { entityType: 'FEATURE', entityId: feature.id, userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  res.json({ validations, audits });
}));

// DELETE /api/features/:id - Eliminar feature
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.feature.deleteMany({ where: { id: req.params.id, epic: { project: { userId: req.user!.id } } } });
  if (result.count === 0) throw new ApiError('Feature not found', 404);
  res.json({ message: 'Feature deleted successfully' });
}));

export default router;
