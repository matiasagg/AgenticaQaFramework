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

// GET /api/test-suites - listar suites (filtro por projectId, testPlanId, userStoryId)
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { projectId, testPlanId, userStoryId, parentSuiteId, suiteType } = req.query;
  const where: any = { project: { userId: req.user!.id } };
  if (projectId) where.projectId = projectId as string;
  if (testPlanId) where.testPlanId = testPlanId as string;
  if (userStoryId) where.userStoryId = userStoryId as string;
  if (parentSuiteId) where.parentSuiteId = parentSuiteId as string;
  if (suiteType) where.suiteType = suiteType as string;

  const suites = await prisma.testSuite.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { userStory: true },
  });

  // Generar título dinámico basado en el displayId actual de la HDU
  // para que las suites siempre reflejen el correlativo más reciente
  const suitesWithDynamicTitle = suites.map((suite) => {
    if (suite.userStory) {
      const hduRef = suite.userStory.displayId || suite.userStory.id
      const expectedTitle = `${hduRef} - ${suite.userStory.title}`
      // Actualizar siempre que el título actual no coincida con el esperado
      if (suite.title !== expectedTitle) {
        return { ...suite, title: expectedTitle }
      }
    }
    return suite
  })

  res.json({ suites: suitesWithDynamicTitle });
}));

// POST /api/test-suites - crear suite
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, projectId, testPlanId, userStoryId, environment, suiteType, tags, parentSuiteId } = req.body;
  if (!title || !projectId || !testPlanId) {
    throw new ApiError('Faltan campos requeridos: title, projectId, testPlanId', 400);
  }

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.user!.id } });
  if (!project) throw new ApiError('Proyecto no encontrado', 404);
  const plan = await prisma.testPlan.findFirst({ where: { id: testPlanId, projectId, project: { userId: req.user!.id } } });
  if (!plan) throw new ApiError('TestPlan no encontrado', 404);
  if (parentSuiteId) {
    const parent = await prisma.testSuite.findFirst({ where: { id: parentSuiteId, projectId, testPlanId } });
    if (!parent) throw new ApiError('Suite padre no encontrada', 404);
  }

  const suite = await prisma.testSuite.create({
    data: {
      title,
      description: description || '',
      projectId,
      testPlanId,
      userStoryId: userStoryId || null,
      parentSuiteId: parentSuiteId || null,
      suiteType: suiteType || 'STATIC',
      tags: Array.isArray(tags) ? tags : [],
      environment: environment || 'staging',
      status: 'DRAFT',
      testCases: [],
    },
  });

  res.status(201).json({ suite });
}));

// GET /api/test-suites/:id - detalle
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const suite = await prisma.testSuite.findFirst({
    where: { id: req.params.id, project: { userId: req.user!.id } },
    include: { testPlan: true, parentSuite: true, childSuites: true, testLinks: { include: { testCase: true } }, userStory: true },
  });
  if (!suite) throw new ApiError('Suite no encontrada', 404);

  // Generar título dinámico basado en el displayId actual de la HDU
  if (suite.userStory) {
    const hduRef = suite.userStory.displayId || suite.userStory.id
    const expectedTitle = `${hduRef} - ${suite.userStory.title}`
    if (suite.title !== expectedTitle) {
      ;(suite as any).title = expectedTitle
    }
  }

  res.json({ suite });
}));

// PUT /api/test-suites/:id - actualizar
router.put('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, status, environment, testPlanId, parentSuiteId, suiteType, tags } = req.body;
  const existing = await prisma.testSuite.findFirst({ where: { id: req.params.id, project: { userId: req.user!.id } } });
  if (!existing) throw new ApiError('Suite no encontrada', 404);
  if (testPlanId !== undefined) {
    if (!testPlanId) throw new ApiError('Cada suite debe pertenecer a un TestPlan', 400);
    const plan = await prisma.testPlan.findFirst({ where: { id: testPlanId, projectId: existing.projectId, project: { userId: req.user!.id } } });
    if (!plan) throw new ApiError('TestPlan no encontrado', 404);
  }
  if (parentSuiteId) {
    if (parentSuiteId === existing.id) throw new ApiError('Una suite no puede ser su propio padre', 400);
    const parent = await prisma.testSuite.findFirst({
      where: { id: parentSuiteId, projectId: existing.projectId, testPlanId: testPlanId ?? existing.testPlanId },
    });
    if (!parent) throw new ApiError('Suite padre no encontrada', 404);
  }

  const updated = await prisma.testSuite.update({
    where: { id: req.params.id },
    data: {
      ...(title && { title }),
      ...(description && { description }),
      ...(status && { status }),
      ...(environment && { environment }),
      ...(testPlanId !== undefined && { testPlanId }),
      ...(parentSuiteId !== undefined && { parentSuiteId: parentSuiteId || null }),
      ...(suiteType && { suiteType }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
    },
  });

  res.json({ suite: updated });
}));

// POST /api/test-suites/:id/tests - associate a reusable test case
router.post('/:id/tests', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { testCaseId } = req.body;
  if (!testCaseId) throw new ApiError('Falta testCaseId', 400);
  const suite = await prisma.testSuite.findFirst({ where: { id: req.params.id, project: { userId: req.user!.id } } });
  if (!suite) throw new ApiError('Suite no encontrada', 404);
  const testCase = await prisma.testCase.findFirst({ where: { id: testCaseId, projectId: suite.projectId, userId: req.user!.id } });
  if (!testCase) throw new ApiError('Test no encontrado', 404);
  const link = await prisma.testSuiteTestCase.upsert({
    where: { testSuiteId_testCaseId: { testSuiteId: suite.id, testCaseId } },
    create: { testSuiteId: suite.id, testCaseId },
    update: {},
    include: { testCase: true },
  });
  res.status(201).json({ link });
}));

router.delete('/:id/tests/:testCaseId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const suite = await prisma.testSuite.findFirst({ where: { id: req.params.id, project: { userId: req.user!.id } } });
  if (!suite) throw new ApiError('Suite no encontrada', 404);
  await prisma.testSuiteTestCase.deleteMany({ where: { testSuiteId: suite.id, testCaseId: req.params.testCaseId } });
  res.json({ message: 'Test retirado de la suite' });
}));

// DELETE /api/test-suites/:id - eliminar
router.delete('/:id', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await prisma.testSuite.deleteMany({ where: { id: req.params.id, project: { userId: req.user!.id } } });
  if (result.count === 0) throw new ApiError('Suite no encontrada', 404);
  res.json({ message: 'Suite eliminada correctamente' });
}));

export default router;
