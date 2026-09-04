/**
 * User Stories (HDU) Routes
 * 
 * Endpoints para gestionar Historias de Usuario:
 * - CRUD de HDUs
 * - Validación DoR (Definition of Ready)
 * - Generación de suites de pruebas funcionales
 */
import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { validateDoR, UserStoryInput } from '../services/dorValidator';
import { generateTestSuite, UserStoryForGeneration } from '../services/testSuiteGenerator';
import { analyzeUserStoryWithAI } from '../services/geminiAI';

const router = Router();
const prisma = new PrismaClient();

// Wrapper for async route handlers
const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) => 
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

/**
 * GET /api/user-stories
 * Obtiene todas las historias de usuario del usuario autenticado
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, status } = req.query;
  
  const where: any = { userId: req.user!.id };
  if (projectId) where.projectId = projectId as string;
  if (status) where.status = status as string;

  const userStories = await prisma.userStory.findMany({
    where,
    include: {
      project: true,
      testSuite: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ userStories });
}));

/**
 * POST /api/user-stories
 * Crea una nueva historia de usuario (HDU)
 */
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, acceptanceCriteria, priority, storyPoints, projectId } = req.body;

  // Validar campos requeridos
  if (!title || !description || !acceptanceCriteria || !projectId) {
    throw new ApiError('Faltan campos requeridos: title, description, acceptanceCriteria, projectId', 400);
  }

  // Verificar que el proyecto existe y pertenece al usuario
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.user!.id },
  });
  if (!project) {
    throw new ApiError('Proyecto no encontrado', 404);
  }

  const userStory = await prisma.userStory.create({
    data: {
      title,
      description,
      acceptanceCriteria,
      priority: priority || 'MEDIUM',
      storyPoints,
      projectId,
      userId: req.user!.id,
      status: 'DRAFT',
    },
    include: {
      project: true,
    },
  });

  res.status(201).json({ userStory });
}));

/**
 * GET /api/user-stories/:id
 * Obtiene una historia de usuario por ID
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userStory = await prisma.userStory.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: {
      project: true,
      testSuite: true,
    },
  });

  if (!userStory) {
    throw new ApiError('Historia de usuario no encontrada', 404);
  }

  res.json({ userStory });
}));

/**
 * PUT /api/user-stories/:id
 * Actualiza una historia de usuario
 */
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, acceptanceCriteria, priority, storyPoints, status } = req.body;

  // Verificar que la HDU existe y pertenece al usuario
  const existingStory = await prisma.userStory.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!existingStory) {
    throw new ApiError('Historia de usuario no encontrada', 404);
  }

  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (acceptanceCriteria !== undefined) updateData.acceptanceCriteria = { set: acceptanceCriteria }
  if (priority !== undefined) updateData.priority = priority
  if (storyPoints !== undefined) updateData.storyPoints = storyPoints
  if (status !== undefined) updateData.status = status

  const updatedStory = await prisma.userStory.update({
    where: { id: req.params.id },
    data: updateData,
    include: { project: true, testSuite: true },
  });

  res.json({ userStory: updatedStory });
}));

/**
 * DELETE /api/user-stories/:id
 * Elimina una historia de usuario
 */
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.userStory.deleteMany({
    where: { id: req.params.id, userId: req.user!.id },
  });

  if (result.count === 0) {
    throw new ApiError('Historia de usuario no encontrada', 404);
  }

  res.json({ message: 'Historia de usuario eliminada correctamente' });
}));

/**
 * POST /api/user-stories/:id/validate-dor
 * Ejecuta la validación DoR sobre una HDU
 * 
 * Este endpoint aplica una prueba estática a la HDU para verificar
 * que cumple con los criterios de Definition of Ready.
 * 
 * Criterios evaluados:
 * 1. Título claro y descriptivo (10-100 caracteres)
 * 2. Descripción con formato estándar "Como [rol], quiero [acción], para [beneficio]"
 * 3. Mínimo 2 criterios de aceptación (cada uno con 10+ caracteres)
 * 4. Prioridad asignada (HIGH, MEDIUM, LOW)
 * 5. Story points definidos (Fibonacci: 1,2,3,5,8,13,21)
 * 6. Sin términos ambiguos (etc, quizás, tal vez, etc.)
 * 7. Criterios testeables (con verbos de acción)
 * 
 * Score mínimo para aprobar: 70%
 */
router.post('/:id/validate-dor', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Si `refresh=true`, forzamos re-ejecutar el análisis (incluida la IA).
  // Por defecto, si ya existe un análisis guardado, se devuelve sin re-consultar
  // a Gemini (la IA es no-determinista: cada llamada produce un resultado distinto).
  const forceRefresh = req.query.refresh === 'true';

  // Obtener la HDU de la base de datos
  const userStory = await prisma.userStory.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });

  if (!userStory) {
    throw new ApiError('Historia de usuario no encontrada', 404);
  }

  // ── Modo caché: devolver el análisis persistido si existe ──
  // staticAnalysis guarda la validación completa (checklist, score, aiAnalysis).
  if (!forceRefresh && userStory.staticAnalysis) {
    const cached = userStory.staticAnalysis as any;
    // Solo usamos la caché si contiene análisis de IA; si la IA falló en la
    // validación anterior (aiAnalysis null), conviene reintentar.
    if (cached?.aiAnalysis) {
      const cachedValidation = {
        score: userStory.dorScore ?? cached.qualityScore ?? 0,
        isReady: userStory.isReady,
        checklist: cached.checklist || userStory.dorChecklist || [],
        summary: cached.summary || 'Resultado de validación guardado (usando caché). Usa "Refrescar análisis" para re-evaluar con IA.',
        recommendations: cached.recommendations || [],
        cached: true,
        validatedAt: cached.validatedAt,
      };
      return res.json({
        userStory,
        validation: cachedValidation,
        aiAnalysis: cached.aiAnalysis,
      });
    }
  }

  // Preparar input para validación DoR
  const input: UserStoryInput = {
    title: userStory.title,
    description: userStory.description,
    acceptanceCriteria: userStory.acceptanceCriteria,
    priority: userStory.priority,
    storyPoints: userStory.storyPoints || undefined,
  };

  // Ejecutar validación DoR estática
  const validationResult = validateDoR(input);

  // Ejecutar validación con IA (Gemini)
  let aiAnalysis = null;
  try {
    aiAnalysis = await analyzeUserStoryWithAI(input);
  } catch (error) {
    console.error('Error en análisis IA:', error);
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

  // Actualizar la HDU con los resultados combinados
  // Guardamos TODO el resultado (checklist, summary, recomendaciones y análisis IA)
  // en staticAnalysis para poder servirlo desde caché en las siguientes llamadas.
  const validatedAt = new Date().toISOString();
  const updatedStory = await prisma.userStory.update({
    where: { id: req.params.id },
    data: {
      dorScore: finalScore,
      dorChecklist: JSON.parse(JSON.stringify(validationResult.checklist)),
      isReady: isReady,
      staticAnalysis: JSON.parse(JSON.stringify({
        validatedAt,
        qualityScore: finalScore,
        summary: validationResult.summary,
        checklist: validationResult.checklist,
        recommendations: allRecommendations,
        aiAnalysis: aiAnalysis ? {
          score: aiAnalysis.score,
          suggestions: aiAnalysis.suggestions,
          missingElements: aiAnalysis.missingElements,
          riskAreas: aiAnalysis.riskAreas,
          improvedDescription: aiAnalysis.improvedDescription,
        } : null,
      })),
      qualityScore: finalScore,
      status: isReady ? 'READY' : 'IN_REVIEW',
    },
    include: {
      project: true,
      testSuite: true,
    },
  });

  res.json({
    userStory: updatedStory,
    validation: {
      ...validationResult,
      score: finalScore,
      isReady,
      recommendations: allRecommendations,
      cached: false,
      validatedAt,
    },
    aiAnalysis,
  });
}));

/**
 * POST /api/user-stories/:id/generate-tests
 * Genera la suite de pruebas funcionales para una HDU
 * 
 * Solo genera las pruebas si la HDU ha pasado la validación DoR.
 * Si no ha pasado, retorna un error con las recomendaciones.
 */
router.post('/:id/generate-tests', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Obtener la HDU de la base de datos
  const userStory = await prisma.userStory.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { testSuite: true },
  });

  if (!userStory) {
    throw new ApiError('Historia de usuario no encontrada', 404);
  }

  // Verificar si la HDU ha pasado la validación DoR
  if (!userStory.isReady) {
    // Si no tiene validación DoR, ejecutarla primero
    if (userStory.dorScore === null) {
      const input: UserStoryInput = {
        title: userStory.title,
        description: userStory.description,
        acceptanceCriteria: userStory.acceptanceCriteria,
        priority: userStory.priority,
        storyPoints: userStory.storyPoints || undefined,
      };
      const validationResult = validateDoR(input);
      
      // Actualizar con resultados de validación
      await prisma.userStory.update({
        where: { id: req.params.id },
        data: {
          dorScore: validationResult.score,
          dorChecklist: JSON.parse(JSON.stringify(validationResult.checklist)),
          isReady: validationResult.isReady,
          qualityScore: validationResult.score,
          status: validationResult.isReady ? 'READY' : 'IN_REVIEW',
        },
      });

      if (!validationResult.isReady) {
        throw new ApiError(
          `La HDU no cumple con los criterios DoR (score: ${validationResult.score}%). ` +
          `Recomendaciones: ${validationResult.recommendations.join('. ')}`,
          422
        );
      }
    } else {
      throw new ApiError(
        `La HDU no ha pasado la validación DoR (score: ${userStory.dorScore}%). ` +
        `Debe alcanzar al menos 70% para generar pruebas.`,
        422
      );
    }
  }

  // Preparar input para generación de pruebas
  const input: UserStoryForGeneration = {
    id: userStory.id,
    title: userStory.title,
    description: userStory.description,
    acceptanceCriteria: userStory.acceptanceCriteria,
    priority: userStory.priority,
    storyPoints: userStory.storyPoints || undefined,
  };

  // Generar suite de pruebas
  const testSuite = generateTestSuite(input, userStory.projectId);

  // Guardar la suite de pruebas en la base de datos
  const savedTestSuite = await prisma.testSuite.create({
    data: {
      title: testSuite.title,
      description: testSuite.description,
      testCases: JSON.parse(JSON.stringify(testSuite.testCases)),
      coverage: JSON.parse(JSON.stringify(testSuite.coverage)),
      status: 'READY',
      userStoryId: userStory.id,
      projectId: userStory.projectId,
    },
  });

  // Actualizar estado de la HDU
  await prisma.userStory.update({
    where: { id: req.params.id },
    data: { status: 'IN_PROGRESS' },
  });

  res.status(201).json({
    testSuite: savedTestSuite,
    summary: {
      totalTestCases: testSuite.testCases.length,
      coverage: testSuite.coverage,
      estimatedTime: testSuite.metadata.estimatedExecutionTime,
    },
  });
}));

/**
 * GET /api/user-stories/:id/test-suite
 * Obtiene la suite de pruebas asociada a una HDU
 */
router.get('/:id/test-suite', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userStory = await prisma.userStory.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: {
      testSuite: true,
    },
  });

  if (!userStory) {
    throw new ApiError('Historia de usuario no encontrada', 404);
  }

  res.json({ testSuite: userStory.testSuite });
}));

export default router;
