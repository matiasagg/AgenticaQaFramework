/**
 * Test Plan Routes
 * CRUD para planes de prueba que agrupan suites de tests.
 */
import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) =>
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

// GET /api/test-plans - Obtener todos los planes de prueba
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId } = req.query;
  const where: any = { project: { userId: req.user!.id } };
  if (projectId) where.projectId = projectId as string;

  const testPlans = await prisma.testPlan.findMany({
    where,
    include: {
      project: true,
      testSuites: { include: { userStory: true, childSuites: true, testLinks: { include: { testCase: true } } } },
      userStories: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Generar título dinámico para suites basado en displayId actual de la HDU
  for (const plan of testPlans) {
    plan.testSuites = plan.testSuites.map((suite) => {
      if (suite.userStory) {
        const hduRef = suite.userStory.displayId || suite.userStory.id
        const expectedTitle = `${hduRef} - ${suite.userStory.title}`
        if (suite.title !== expectedTitle && suite.title.startsWith('HDU-')) {
          return { ...suite, title: expectedTitle }
        }
      }
      return suite
    }) as any
  }

  res.json({ testPlans });
}));

// POST /api/test-plans - Crear plan de prueba
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, projectId, planType, tags, sourcePlanId } = req.body;
  if (!name || !projectId) {
    throw new ApiError('Faltan campos requeridos: name, projectId', 400);
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: req.user!.id },
  });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  if (sourcePlanId) {
    const sourcePlan = await prisma.testPlan.findFirst({
      where: { id: sourcePlanId, projectId, project: { userId: req.user!.id } },
    });
    if (!sourcePlan) throw new ApiError('Plan origen no encontrado', 404);
  }

  const testPlan = await prisma.testPlan.create({
    data: {
      name,
      description: description || '',
      projectId,
      planType: planType || 'CUSTOM',
      tags: Array.isArray(tags) ? tags : [],
      sourcePlanId: sourcePlanId || null,
    },
    include: { project: true, testSuites: true },
  });
  res.status(201).json({ testPlan });
}));

// GET /api/test-plans/:id - Obtener plan por ID
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const testPlan = await prisma.testPlan.findFirst({
    where: { id: req.params.id, project: { userId: req.user!.id } },
    include: {
      project: true,
      testSuites: { include: { userStory: true, childSuites: true, testLinks: { include: { testCase: true } } } },
      userStories: true,
    },
  });
  if (!testPlan) throw new ApiError('TestPlan no encontrado', 404);

  // Generar título dinámico para suites basado en displayId actual de la HDU
  testPlan.testSuites = testPlan.testSuites.map((suite) => {
    if (suite.userStory) {
      const hduRef = suite.userStory.displayId || suite.userStory.id
      const expectedTitle = `${hduRef} - ${suite.userStory.title}`
      if (suite.title !== expectedTitle && suite.title.startsWith('HDU-')) {
        return { ...suite, title: expectedTitle }
      }
    }
    return suite
  }) as any

  res.json({ testPlan });
}));

// PUT /api/test-plans/:id - Actualizar plan
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name, description, status, tags, sourcePlanId } = req.body;
  const existing = await prisma.testPlan.findFirst({
    where: { id: req.params.id, project: { userId: req.user!.id } },
  });
  if (!existing) throw new ApiError('TestPlan no encontrado', 404);
  if (sourcePlanId) {
    const sourcePlan = await prisma.testPlan.findFirst({
      where: { id: sourcePlanId, projectId: existing.projectId, project: { userId: req.user!.id } },
    });
    if (!sourcePlan || sourcePlan.id === existing.id) throw new ApiError('Plan origen no válido', 400);
  }

  const testPlan = await prisma.testPlan.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
      ...(sourcePlanId !== undefined && { sourcePlanId: sourcePlanId || null }),
    },
    include: { project: true, testSuites: true },
  });
  res.json({ testPlan });
}));

// DELETE /api/test-plans/:id - Eliminar plan
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.testPlan.deleteMany({
    where: { id: req.params.id, project: { userId: req.user!.id } },
  });
  if (result.count === 0) throw new ApiError('TestPlan no encontrado', 404);
  res.json({ message: 'TestPlan eliminado correctamente' });
}));

// POST /api/test-plans/:id/associate-suite - Asociar suite existente al plan
router.post('/:id/associate-suite', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { suiteId } = req.body;
  if (!suiteId) throw new ApiError('Falta suiteId', 400);

  const testPlan = await prisma.testPlan.findFirst({
    where: { id: req.params.id, project: { userId: req.user!.id } },
  });
  if (!testPlan) throw new ApiError('TestPlan no encontrado', 404);

  const suite = await prisma.testSuite.update({
    where: { id: suiteId },
    data: { testPlanId: testPlan.id },
  });
  res.json({ suite, message: 'Suite asociada al plan' });
}));

export default router;