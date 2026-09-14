import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { validateDoR } from '../services/dorValidator';
import { analyzeUserStoryWithAI } from '../services/geminiAI';

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
      data: { title, description, severity, status, stepsToReproduce, expectedResult, actualResult, environment, assignee, labels, branchName },
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
      priority: bug.severity,
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
    const updatedBug = await prisma.bugReport.update({
      where: { id: bug.id },
      data: {
        dorScore: finalScore,
        dorChecklist: JSON.parse(JSON.stringify(validationResult.checklist)),
        isReady,
        staticAnalysis: JSON.parse(JSON.stringify({
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
        })),
      },
      include: { evidence: true, project: true, agent: true },
    });

    res.json({
      bug: updatedBug,
      validation: {
        ...validationResult,
        score: finalScore,
        isReady,
        recommendations: allRecommendations,
        recommendationsDetailed: allRecommendationsDetailed,
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

// POST /api/bugs/:id/apply-dor-fixes - Aplica parches DoR al bug
router.post('/:id/apply-dor-fixes', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fixes } = req.body;
    if (!Array.isArray(fixes) || fixes.length === 0) {
      throw new ApiError('Falta fixes (array de parches { field, value })', 400);
    }

    const existingBug = await prisma.bugReport.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!existingBug) {
      throw new ApiError('Bug not found', 404);
    }

    // Construir el update a partir de los parches
    const updateData: any = {};
    for (const fix of fixes) {
      if (!fix || typeof fix !== 'object') continue;
      switch (fix.field) {
        case 'title':
          updateData.title = String(fix.value);
          break;
        case 'description':
          updateData.description = String(fix.value);
          break;
        case 'severity':
          updateData.severity = String(fix.value);
          break;
        case 'stepsToReproduce':
          updateData.stepsToReproduce = {
            set: Array.isArray(fix.value) ? fix.value.map(String) : [String(fix.value)],
          };
          break;
        case 'expectedResult':
          updateData.expectedResult = String(fix.value);
          break;
        case 'actualResult':
          updateData.actualResult = String(fix.value);
          break;
        case 'environment':
          updateData.environment = String(fix.value);
          break;
        default:
          break;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError('Ninguno de los parches enviados es aplicable', 400);
    }

    // Revalidar el DoR estático con los nuevos valores
    const merged = {
      title: updateData.title ?? existingBug.title,
      description: updateData.description ?? existingBug.description,
      acceptanceCriteria: [
        ...((updateData.stepsToReproduce?.set ?? existingBug.stepsToReproduce) || []).map((step: string) => `Reproducir: ${step}`),
        (updateData.expectedResult ?? existingBug.expectedResult) ? `Resultado esperado: ${updateData.expectedResult ?? existingBug.expectedResult}` : '',
        (updateData.actualResult ?? existingBug.actualResult) ? `Resultado actual: ${updateData.actualResult ?? existingBug.actualResult}` : '',
      ].filter(Boolean),
      priority: updateData.severity ?? existingBug.severity,
      storyPoints: 1,
    };
    const validationResult = validateDoR(merged);

    updateData.dorScore = validationResult.score;
    updateData.dorChecklist = JSON.parse(JSON.stringify(validationResult.checklist));
    updateData.isReady = validationResult.isReady;

    const updatedBug = await prisma.bugReport.update({
      where: { id: req.params.id },
      data: updateData,
      include: { evidence: true, project: true, agent: true },
    });

    res.json({
      bug: updatedBug,
      validation: {
        ...validationResult,
        cached: false,
      },
      appliedCount: Object.keys(updateData).filter(
        (k) => !['dorScore', 'dorChecklist', 'isReady'].includes(k)
      ).length,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to apply bug DoR fixes', 500);
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