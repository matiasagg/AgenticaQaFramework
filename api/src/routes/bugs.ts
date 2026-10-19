import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { validateDoR } from '../services/dorValidator';
import { analyzeUserStoryWithAI } from '../services/geminiAI';
import { updateGitHubIssue, buildIssueBodyFromBug, buildGitHubBugTitle } from '../services/githubIntegration';
import { decryptApiKey } from '../utils/encryption';
import {
  buildPortfolioDorPreview,
  parsePortfolioDorFixRequest,
  portfolioDorRequestError,
  validatePortfolioDor,
  PortfolioDorInput,
} from '../services/portfolioDor';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/bugs - Get all bugs
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bugs = await prisma.bugReport.findMany({
      where: { userId: req.user!.id },
      include: { evidence: true, project: true, agent: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ bugs });
  } catch (error) {
    throw new ApiError('Failed to fetch bugs', 500);
  }
});

// POST /api/bugs - Create bug report
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, severity, stepsToReproduce, expectedResult, actualResult, environment, projectId, agentId, assignee, labels, branchName } = req.body;
    const bug = await prisma.bugReport.create({
      data: {
        title, description, severity, stepsToReproduce, expectedResult, actualResult, environment,
        projectId, agentId, userId: req.user!.id, assignee, labels: labels || [], branchName,
      },
    });
    res.status(201).json({ bug });
  } catch (error) {
    throw new ApiError('Failed to create bug report', 500);
  }
});

// GET /api/bugs/:id - Get bug by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bug = await prisma.bugReport.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { evidence: true, project: true, agent: true },
    });
    if (!bug) throw new ApiError('Bug not found', 404);
    res.json({ bug });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch bug', 500);
  }
});

// PUT /api/bugs/:id - Update bug
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, severity, status, stepsToReproduce, expectedResult, actualResult, environment, assignee, labels, branchName } = req.body;
    const bug = await prisma.bugReport.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: {
        title, description, severity, status, stepsToReproduce, expectedResult,
        actualResult, environment, assignee, labels, branchName,
        dorScore: null,
        // Prisma exige Prisma.DbNull (SQL NULL) para limpiar campos Json opcionales.
        dorChecklist: Prisma.DbNull,
        isReady: false,
        staticAnalysis: Prisma.DbNull,
      },
    });
    if (bug.count === 0) throw new ApiError('Bug not found', 404);
    const updatedBug = await prisma.bugReport.findUnique({ where: { id: req.params.id }, include: { evidence: true } });
    res.json({ bug: updatedBug });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to update bug', 500);
  }
});

// POST /api/bugs/:id/validate-dor - Valida DoR del bug con reglas estáticas + IA (Gemini)
// Soporta ?refresh=true para forzar re-ejecutar el análisis con IA
router.post('/:id/validate-dor', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';

    const bug = await prisma.bugReport.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bug) throw new ApiError('Bug not found', 404);

    // Modo caché: devolver el análisis persistido si existe y no se fuerza refresh
    if (!forceRefresh && bug.staticAnalysis) {
      const cached = bug.staticAnalysis as any;
      if (cached?.aiAnalysis) {
        const cachedValidation = {
          score: bug.dorScore ?? cached.qualityScore ?? 0,
          isReady: bug.isReady,
          checklist: cached.checklist || bug.dorChecklist || [],
          summary: cached.summary || 'Resultado de validación guardado (usando caché). Usa "Refrescar análisis" para re-evaluar con IA.',
          recommendations: cached.recommendations || [],
          recommendationsDetailed: cached.recommendationsDetailed || [],
          cached: true,
          validatedAt: cached.validatedAt,
        };
        return res.json({
          bug,
          validation: cachedValidation,
          aiAnalysis: cached.aiAnalysis,
        });
      }
    }

    // Preparar input para validación DoR
    const input = {
      title: bug.title,
      description: bug.description,
      acceptanceCriteria: [
        ...(bug.stepsToReproduce || []).map((step: string) => `Reproducir: ${step}`),
        bug.expectedResult ? `Resultado esperado: ${bug.expectedResult}` : '',
        bug.actualResult ? `Resultado actual: ${bug.actualResult}` : '',
      ].filter(Boolean),
      priority: bug.severity === 'CRITICAL' ? 'HIGH' : bug.severity,
      storyPoints: 1,
    };

    // Ejecutar validación DoR estática
    const validationResult = validateDoR(input);

    // Obtener la key BYO del usuario para el análisis IA
    let userGeminiKey: string | null = null;
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { geminiApiKey: true },
      });
      userGeminiKey = user?.geminiApiKey ?? null;
    } catch (err) {
      console.error('Error obteniendo key BYO del usuario:', err);
    }

    // Ejecutar validación con IA (Gemini)
    let aiAnalysis = null;
    let aiError: string | null = null;
    try {
      aiAnalysis = await analyzeUserStoryWithAI(input, userGeminiKey);
    } catch (error) {
      aiError = error instanceof Error ? error.message : String(error);
      console.error('Error en análisis IA del bug:', error);
    }

    // Combinar scores (ponderación: 60% reglas, 40% IA)
    const finalScore = aiAnalysis
      ? Math.round(validationResult.score * 0.6 + aiAnalysis.score * 0.4)
      : validationResult.score;

    const isReady = finalScore >= 70 && validationResult.isReady;

    // Combinar recomendaciones
    const allRecommendations = [
      ...validationResult.recommendations,
      ...(aiAnalysis?.suggestions || []),
    ];

    // Construir recomendaciones detalladas
    const aiDetailed = (aiAnalysis?.suggestionsDetailed || []).map((s: any) => ({
      checkId: s.checkId,
      checkName: s.checkId,
      message: s.message,
      source: 'ai' as const,
    }));

    const allRecommendationsDetailed = [
      ...validationResult.recommendationsDetailed,
      ...aiDetailed,
    ];

    // Actualizar el bug con los resultados combinados
    const validatedAt = new Date().toISOString();
    const staticAnalysis = JSON.parse(JSON.stringify({
      validatedAt,
      qualityScore: finalScore,
      summary: validationResult.summary,
      checklist: validationResult.checklist,
      recommendations: allRecommendations,
      recommendationsDetailed: allRecommendationsDetailed,
      aiAnalysis: aiAnalysis && !aiError ? {
        score: aiAnalysis.score,
        suggestions: aiAnalysis.suggestions,
        suggestionsDetailed: aiAnalysis.suggestionsDetailed,
        missingElements: aiAnalysis.missingElements,
        riskAreas: aiAnalysis.riskAreas,
        improvedDescription: aiAnalysis.improvedDescription,
      } : null,
      aiError,
    }));

    const updatedBug = await prisma.$transaction(async (tx) => {
      const updated = await tx.bugReport.update({
        where: { id: bug.id },
        data: {
        dorScore: finalScore,
        dorChecklist: JSON.parse(JSON.stringify(validationResult.checklist)),
        isReady,
        staticAnalysis,
        },
        include: { evidence: true, project: true, agent: true },
      });

      await tx.dorEntityValidation.create({
        data: {
          entityType: 'BUG',
          entityId: bug.id,
          userId: req.user!.id,
          source: aiAnalysis && !aiError ? 'AI' : 'RULES',
          score: finalScore,
          isReady,
          checklist: JSON.parse(JSON.stringify(validationResult.checklist)),
          recommendations: JSON.parse(JSON.stringify(allRecommendationsDetailed)),
          aiAnalysis: aiAnalysis && !aiError ? JSON.parse(JSON.stringify(aiAnalysis)) : undefined,
          validatedAt: new Date(validatedAt),
        },
      });

      return updated;
    });

    res.json({
      bug: updatedBug,
      validation: {
        ...validationResult,
        score: finalScore,
        isReady,
        recommendations: allRecommendations,
        recommendationsDetailed: allRecommendationsDetailed,
        syncRecommendation: bug.githubId
          ? { action: 'SYNC', pendingChanges: false, message: 'El bug está vinculado a GitHub. Puedes revisar y sincronizar cambios explícitamente.' }
          : { action: 'NONE', pendingChanges: false, message: 'El bug no está vinculado a GitHub.' },
        cached: false,
        validatedAt,
      },
      aiAnalysis,
      aiError,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to validate bug DoR', 500);
  }
});

// POST /api/bugs/:id/preview-dor-fixes - Previsualiza cambios DoR sin mutar el bug
router.post('/:id/preview-dor-fixes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const request = parsePortfolioDorFixRequest(req.body, 'BUG');
    const bug = await prisma.bugReport.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!bug) throw new ApiError('Bug not found', 404);
    const preview = buildPortfolioDorPreview('BUG', bug as unknown as Record<string, unknown>, request);
    res.json({ bug, preview });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw portfolioDorRequestError(error);
  }
});

// POST /api/bugs/:id/apply-dor-fixes - Confirma cambios DoR atómicamente
router.post('/:id/apply-dor-fixes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const request = parsePortfolioDorFixRequest(req.body, 'BUG');
    const result = await prisma.$transaction(async (tx) => {
      const existingBug = await tx.bugReport.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
      if (!existingBug) throw new ApiError('Bug not found', 404);
      if (request.baseUpdatedAt && new Date(request.baseUpdatedAt).getTime() !== existingBug.updatedAt.getTime()) {
        throw new ApiError('El bug cambió mientras revisabas el preview. Genera una nueva previsualización.', 409);
      }

      const preview = buildPortfolioDorPreview('BUG', existingBug as unknown as Record<string, unknown>, request);
      if (preview.conflicts.length) throw new ApiError('La selección contiene recomendaciones incompatibles.', 409);

      const updateData: any = {};
      for (const change of preview.changes) {
        switch (change.field) {
          case 'title':
          case 'description':
          case 'severity':
          case 'expectedResult':
          case 'actualResult':
          case 'environment':
            updateData[change.field] = change.proposedValue;
            break;
          case 'priority':
            updateData.severity = change.proposedValue;
            break;
          case 'stepsToReproduce':
          case 'acceptanceCriteria':
            updateData.stepsToReproduce = { set: change.proposedValue as string[] };
            break;
          default:
            break;
        }
      }
      if (!preview.changes.length) throw new ApiError('Ninguno de los parches enviados modifica el bug.', 400);

      const mergedInput: PortfolioDorInput = {
        kind: 'BUG',
        title: updateData.title ?? existingBug.title,
        description: updateData.description ?? existingBug.description,
        severity: updateData.severity ?? existingBug.severity,
        stepsToReproduce: updateData.stepsToReproduce?.set ?? existingBug.stepsToReproduce,
        expectedResult: updateData.expectedResult ?? existingBug.expectedResult,
        actualResult: updateData.actualResult ?? existingBug.actualResult,
      };
      const validation = validatePortfolioDor(mergedInput);
      updateData.dorScore = validation.score;
      updateData.dorChecklist = JSON.parse(JSON.stringify(validation.checklist));
      updateData.isReady = validation.isReady;
      updateData.staticAnalysis = Prisma.DbNull;

      const updatedBug = await tx.bugReport.update({
        where: { id: existingBug.id },
        data: updateData,
        include: { evidence: true, project: true, agent: true },
      });
      await tx.dorEntityAudit.create({
        data: {
          entityType: 'BUG',
          entityId: existingBug.id,
          userId: req.user!.id,
          changedFields: JSON.parse(JSON.stringify(preview.changes)),
          appliedRecommendations: JSON.parse(JSON.stringify(request.recommendations)),
        },
      });
      await tx.dorEntityValidation.create({
        data: {
          entityType: 'BUG',
          entityId: existingBug.id,
          userId: req.user!.id,
          source: 'APPLY_STATIC',
          score: validation.score,
          isReady: validation.isReady,
          checklist: JSON.parse(JSON.stringify(validation.checklist)),
          recommendations: JSON.parse(JSON.stringify(validation.recommendationsDetailed)),
        },
      });
      return { updatedBug, validation, preview };
    });

    res.json({
      bug: result.updatedBug,
      validation: { ...result.validation, cached: false },
      changedFields: result.preview.changedFields,
      appliedRecommendations: result.preview.selectedRecommendations,
      pendingRecommendations: result.preview.pendingRecommendations,
      appliedCount: result.preview.changes.length,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw portfolioDorRequestError(error);
  }
});

// GET /api/bugs/:id/dor-history - Historial y auditoría del bug
router.get('/:id/dor-history', async (req: AuthenticatedRequest, res: Response) => {
  const bug = await prisma.bugReport.findFirst({ where: { id: req.params.id, userId: req.user!.id }, select: { id: true } });
  if (!bug) throw new ApiError('Bug not found', 404);
  const [validations, audits] = await Promise.all([
    prisma.dorEntityValidation.findMany({ where: { entityType: 'BUG', entityId: bug.id, userId: req.user!.id }, orderBy: { validatedAt: 'desc' }, take: 50 }),
    prisma.dorEntityAudit.findMany({ where: { entityType: 'BUG', entityId: bug.id, userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);
  res.json({ validations, audits });
});

// POST /api/bugs/:id/push-to-github - Sincroniza los cambios del bug con su issue de GitHub
//
// Solo funciona si el bug proviene de GitHub (githubId almacena el número del
// issue). Construye el cuerpo Markdown con `buildIssueBodyFromBug` y hace el
// PATCH contra la API de GitHub con `updateGitHubIssue`, replicando el flujo de
// `POST /api/user-stories/:id/push-hdu`.
router.post('/:id/push-to-github', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Obtener el bug con el proyecto (necesario para el repositorio y token)
    const bug = await prisma.bugReport.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { project: true },
    });

    if (!bug) throw new ApiError('Bug not found', 404);

    // Verificar que el bug está vinculado a un issue de GitHub
    if (!bug.githubId) {
      throw new ApiError(
        'El bug no está vinculado a un issue de GitHub (solo se pueden sincronizar bugs importados de GitHub).',
        400
      );
    }

    // Verificar que el proyecto tiene repositorio configurado
    if (!bug.project?.repository) {
      throw new ApiError('El proyecto no tiene un repositorio de GitHub configurado.', 400);
    }

    // githubId almacena el número del issue de GitHub
    const issueNumber = parseInt(bug.githubId, 10);
    if (!issueNumber || isNaN(issueNumber)) {
      throw new ApiError('El bug no tiene un número de issue de GitHub válido.', 400);
    }

    // Obtener el token del proyecto (si está configurado)
    const projectToken = bug.project.githubToken
      ? decryptApiKey(bug.project.githubToken)
      : undefined;

    // Construir el cuerpo del issue con los datos actuales del bug
    const issueBody = buildIssueBodyFromBug({
      title: bug.title,
      description: bug.description,
      stepsToReproduce: bug.stepsToReproduce,
      expectedResult: bug.expectedResult,
      actualResult: bug.actualResult,
      environment: bug.environment,
      severity: bug.severity,
      assignee: bug.assignee,
      labels: bug.labels,
      branchName: bug.branchName,
      githubUrl: null,
    });

    // Sincronizamos el cuerpo, el título y las propiedades nativas del issue
    // (labels y asignación), igual que hace el push de la HDU.
    const updates: { title?: string; body?: string; labels?: string[]; assignees?: string[] } = {
      body: issueBody,
      title: buildGitHubBugTitle(bug.title),
      labels: bug.labels || [],
      assignees: bug.assignee ? [bug.assignee] : [],
    };

    // Llamar a la API de GitHub para actualizar el issue
    let githubResult;
    try {
      githubResult = await updateGitHubIssue(
        bug.project.repository,
        issueNumber,
        updates,
        projectToken
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ApiError(`Error al sincronizar con GitHub: ${message}`, 502);
    }

    await prisma.bugReport.update({
      where: { id: bug.id },
      data: {
        githubSyncedAt: githubResult.updated_at ? new Date(githubResult.updated_at) : new Date(),
        githubSyncMetadata: {
          issueNumber,
          source: 'github',
          sourceUpdatedAt: githubResult.updated_at,
          syncedAt: new Date().toISOString(),
          direction: 'SAAS_TO_GITHUB',
        },
      },
    });

    res.json({
      message: 'Bug sincronizado con GitHub correctamente.',
      github: {
        issueNumber: githubResult.number,
        issueUrl: githubResult.html_url,
        title: githubResult.title,
        state: githubResult.state,
      },
      syncedFields: Object.keys(updates),
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to push bug to GitHub', 500);
  }
});

// DELETE /api/bugs/:id - Delete bug
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bug = await prisma.bugReport.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (bug.count === 0) throw new ApiError('Bug not found', 404);
    res.json({ message: 'Bug deleted successfully' });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to delete bug', 500);
  }
});

export default router;