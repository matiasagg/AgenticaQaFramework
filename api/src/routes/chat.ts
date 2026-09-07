/**
 * Chat AI - Endpoint multifuncion
 * Permite al usuario interactuar con la plataforma via lenguaje natural.
 * Intenciones soportadas: validate_dor, assign_agent, generate_tests,
 * create_bug, change_status, sync_github, create_epic.
 */
import { Router, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { validateDoR } from '../services/dorValidator';
import { generateTestSuite } from '../services/testSuiteGenerator';

const router = Router();
const prisma = new PrismaClient();

const asyncHandler = (fn: (req: any, res: Response, next: NextFunction) => Promise<any>) =>
  (req: any, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

router.use(authenticateToken);

/**
 * POST /api/chat
 * Procesa un mensaje del usuario y ejecuta la accion correspondiente.
 */
router.post('/', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { message, projectId, context } = req.body;
  if (!message) {
    throw new ApiError('Falta el campo message', 400);
  }

  const msg = message.toLowerCase();
  const userId = req.user!.id;

  // ── Validar DoR ──
  if (msg.includes('validar') && msg.includes('dor')) {
    const storyId = context?.userStoryId || extractId(msg);
    if (!storyId) throw new ApiError('Especifica la HDU (ej: hdu-ID)', 400);
    const story = await prisma.userStory.findFirst({ where: { id: storyId, userId } });
    if (!story) throw new ApiError('HDU no encontrada', 404);
    const input = {
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria,
      priority: story.priority,
      storyPoints: story.storyPoints || undefined,
    };
    const validation = validateDoR(input);
    return res.json({ intent: 'validate_dor', result: validation, storyId });
  }

  // ── Asignar agente a HDU ──
  if (msg.includes('asigna') && (msg.includes('agente') || msg.includes('sdet') || msg.includes('qa'))) {
    const storyId = context?.userStoryId || extractId(msg);
    if (!storyId) throw new ApiError('Especifica la HDU', 400);
    const agentName = extractAgentName(msg);
    const agent = await prisma.agent.findFirst({
      where: { name: { contains: agentName, mode: 'insensitive' }, userId },
    });
    if (!agent) throw new ApiError('Agente no encontrado', 404);
    const assignment = await prisma.agentAssignment.upsert({
      where: { agentId_userStoryId: { agentId: agent.id, userStoryId: storyId } },
      create: { agentId: agent.id, userStoryId: storyId },
      update: {},
    });
    return res.json({ intent: 'assign_agent', result: 'Agente asignado', agent: { id: agent.id, name: agent.name }, assignment });
  }

  // ── Generar tests para HDU ──
  if (msg.includes('generar') && (msg.includes('test') || msg.includes('prueba'))) {
    const storyId = context?.userStoryId || extractId(msg);
    if (!storyId) throw new ApiError('Especifica la HDU', 400);
    const story = await prisma.userStory.findFirst({ where: { id: storyId, userId } });
    if (!story) throw new ApiError('HDU no encontrada', 404);
    if (!story.isReady) throw new ApiError('La HDU debe cumplir DoR antes de generar tests', 422);
    const input = {
      id: story.id,
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria,
      priority: story.priority,
      storyPoints: story.storyPoints || undefined,
    };
    const suite = generateTestSuite(input, story.projectId);
    const saved = await prisma.testSuite.create({
      data: {
        title: suite.title,
        description: suite.description,
        testCases: JSON.parse(JSON.stringify(suite.testCases)),
        coverage: JSON.parse(JSON.stringify(suite.coverage)),
        status: 'READY',
        userStoryId: story.id,
        projectId: story.projectId,
      },
    });
    await prisma.userStory.update({ where: { id: story.id }, data: { status: 'IN_DEVELOPMENT' } });
    return res.json({ intent: 'generate_tests', result: 'Suite generada', testSuite: saved, totalTestCases: suite.testCases.length });
  }

  // ── Crear bug desde HDU ──
  if (msg.includes('crear bug') || msg.includes('reportar bug')) {
    const storyId = context?.userStoryId || extractId(msg);
    if (!storyId) throw new ApiError('Especifica la HDU', 400);
    const story = await prisma.userStory.findFirst({ where: { id: storyId, userId } });
    if (!story) throw new ApiError('HDU no encontrada', 404);
    const severity = msg.includes('crit') ? 'CRITICAL' : msg.includes('alta') ? 'HIGH' : msg.includes('baja') ? 'LOW' : 'MEDIUM';
    const bug = await prisma.bugReport.create({
      data: {
        title: 'Bug: ' + story.title,
        description: story.description,
        severity,
        stepsToReproduce: [],
        expectedResult: 'Sin resultado esperado especificado',
        actualResult: 'Bug reportado vía chat IA',
        projectId: story.projectId,
        userId,
      },
    });
    return res.json({ intent: 'create_bug', result: 'Bug creado', bug });
  }

  // ── Sincronizar rama GitHub ──
  if (msg.includes('sync') || msg.includes('sincroniza')) {
    const storyId = context?.userStoryId || extractId(msg);
    const branch = context?.branchName || extractBranch(msg);
    if (!storyId || !branch) throw new ApiError('Especifica la HDU y la rama', 400);
    const updated = await prisma.userStory.update({ where: { id: storyId }, data: { branchName: branch } });
    return res.json({ intent: 'sync_github', result: 'Rama asociada', branch, story: updated });
  }

  // ── Crear epic ──
  if (msg.includes('crear epic')) {
    const name = context?.name;
    if (!name) throw new ApiError('Especifica el nombre en context.name', 400);
    const epic = await prisma.epic.create({
      data: { name, description: context?.description || '', projectId: context?.projectId || '' },
    });
    return res.json({ intent: 'create_epic', result: 'Epic creado', epic });
  }

  // ── Crear feature ──
  if (msg.includes('crear feature')) {
    const { name, epicId, description } = context || {};
    if (!name || !epicId) throw new ApiError('Especifica name y epicId en context', 400);
    const feature = await prisma.feature.create({ data: { name, description: description || '', epicId } });
    return res.json({ intent: 'create_feature', result: 'Feature creado', feature });
  }

  // Fallback
  return res.json({
    intent: 'unknown',
    result: 'No reconozco esa solicitud. Intenta: "valida dor hdu-001", "asigna agente sdet hdu-001", "genera tests hdu-001", "crea bug hdu-001", "sync rama feature/login", "crear epic"',
    supportedIntents: ['validate_dor', 'assign_agent', 'generate_tests', 'create_bug', 'sync_github', 'create_epic', 'create_feature'],
  });
}));

// ── Helpers ──

/** Extrae un ID de HDU o entidad del mensaje */
function extractId(msg: string): string | null {
  const match = msg.match(/(hdu-?\d+|us-?\d+)/i);
  return match ? match[0] : null;
}

/** Extrae el nombre de la rama del mensaje */
function extractBranch(msg: string): string | null {
  const match = msg.match(/(?:rama|branch)[:\s]+([a-zA-Z0-9/_-]+)/i);
  return match ? match[1] : null;
}

/** Extrae el nombre del agente del mensaje */
function extractAgentName(msg: string): string {
  if (msg.includes('sdet')) return 'sdet';
  if (msg.includes('qa engineering') || msg.includes('qa engineer')) return 'qa engineer';
  if (msg.includes('tech lead')) return 'tech lead';
  if (msg.includes('test generator')) return 'test generator';
  if (msg.includes('bug reporter')) return 'bug reporter';
  if (msg.includes('coverage')) return 'coverage analyst';
  if (msg.includes('improvement')) return 'improvement planner';
  return 'sdet';
}

export default router;