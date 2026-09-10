import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { calculateCoverageMetrics } from '../services/coverageMetrics';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /api/coverage - Get all coverage analyses
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coverage = await prisma.coverageAnalysis.findMany({
      where: { userId: req.user!.id },
      include: { project: true },
      orderBy: { generatedAt: 'desc' },
    });
    res.json({ coverage });
  } catch (error) {
    throw new ApiError('Failed to fetch coverage analysis', 500);
  }
});

// POST /api/coverage - Create coverage analysis
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, overallCoverage, uncoveredAreas, recommendations } = req.body;
    const coverage = await prisma.coverageAnalysis.create({
      data: {
        projectId, overallCoverage, uncoveredAreas, recommendations,
        userId: req.user!.id,
      },
    });
    res.status(201).json({ coverage });
  } catch (error) {
    throw new ApiError('Failed to create coverage analysis', 500);
  }
});

// GET /api/coverage/metrics/:projectId - Calculate real-time coverage metrics
// Este endpoint calcula las métricas de cobertura directamente desde la base de datos,
// proporcionando datos actualizados sin necesidad de un análisis previo.
// La lógica de cálculo se delega al servicio puro `coverageMetrics.ts` para poder
// testearla de forma unitaria sin depender de la base de datos.
router.get('/metrics/:projectId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    });
    if (!project) throw new ApiError('Proyecto no encontrado', 404);

    // ── Obtener datos base de la base de datos ──
    const userStories = await prisma.userStory.findMany({
      where: { projectId, userId: req.user!.id },
      include: {
        epic: true,
        feature: true,
        testSuite: {
          include: {
            testLinks: { include: { testCase: true } },
          },
        },
      },
    });

    const testCases = await prisma.testCase.findMany({
      where: { projectId, userId: req.user!.id },
    });

    const epics = await prisma.epic.findMany({
      where: { projectId },
      include: {
        features: true,
        userStories: { include: { testSuite: true } },
      },
    });

    // Delegar todo el cálculo de métricas al servicio puro
    // (los datos de Prisma son compatibles con los tipos de entrada del servicio)
    const metrics = calculateCoverageMetrics(
      project,
      userStories as any,
      testCases as any,
      epics as any
    );

    res.json(metrics);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to calculate coverage metrics', 500);
  }
});

// GET /api/coverage/trend/:projectId - Historical execution trend
// Retorna el historial de análisis de cobertura para mostrar tendencia
router.get('/trend/:projectId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    // Verificar que el proyecto pertenece al usuario
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.user!.id },
    });
    if (!project) throw new ApiError('Proyecto no encontrado', 404);

    // Obtener historial de análisis de cobertura (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalData = await prisma.coverageAnalysis.findMany({
      where: {
        projectId,
        userId: req.user!.id,
        generatedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { generatedAt: 'asc' },
      select: {
        id: true,
        overallCoverage: true,
        generatedAt: true,
      },
    });

    // Si no hay datos históricos, generar punto actual desde las métricas en tiempo real
    if (historicalData.length === 0) {
      // Calcular métrica actual simplificada
      const totalHDUs = await prisma.userStory.count({
        where: { projectId, userId: req.user!.id },
      });
      const hduWithSuites = await prisma.userStory.count({
        where: { projectId, userId: req.user!.id, testPlanId: { not: null } },
      });
      const currentCoverage = totalHDUs > 0 ? Math.round((hduWithSuites / totalHDUs) * 100) : 0;

      res.json({
        trend: [{
          date: new Date().toISOString().split('T')[0],
          coverage: currentCoverage,
        }],
        message: 'No hay datos históricos. Se muestra el punto actual.',
      });
      return;
    }

    const trend = historicalData.map((entry) => ({
      date: entry.generatedAt.toISOString().split('T')[0],
      coverage: Math.round(entry.overallCoverage),
    }));

    res.json({ trend });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch coverage trend', 500);
  }
});

// GET /api/coverage/:id - Get coverage by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coverage = await prisma.coverageAnalysis.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { project: true },
    });
    if (!coverage) throw new ApiError('Coverage analysis not found', 404);
    res.json({ coverage });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to fetch coverage analysis', 500);
  }
});

export default router;