import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/agents
 * Get all agents for current user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agents = await prisma.agent.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ agents });
  } catch (error) {
    throw new ApiError('Failed to fetch agents', 500);
  }
});

/**
 * POST /api/agents
 * Create a new agent
 */
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, role, description, capabilities, systemPrompt, avatar } = req.body;

    const agent = await prisma.agent.create({
      data: {
        name,
        role,
        description,
        capabilities,
        systemPrompt,
        avatar,
        userId: req.user!.id,
      },
    });

    res.status(201).json({ agent });
  } catch (error) {
    throw new ApiError('Failed to create agent', 500);
  }
});

/**
 * GET /api/agents/:id
 * Get agent by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = await prisma.agent.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!agent) {
      throw new ApiError('Agent not found', 404);
    }

    res.json({ agent });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch agent', 500);
  }
});

/**
 * PUT /api/agents/:id
 * Update agent
 */
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description, capabilities, systemPrompt, isActive, avatar } = req.body;

    const agent = await prisma.agent.updateMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
      data: {
        name,
        description,
        capabilities,
        systemPrompt,
        isActive,
        avatar,
      },
    });

    if (agent.count === 0) {
      throw new ApiError('Agent not found', 404);
    }

    const updatedAgent = await prisma.agent.findUnique({
      where: { id: req.params.id },
    });

    res.json({ agent: updatedAgent });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update agent', 500);
  }
});

/**
 * DELETE /api/agents/:id
 * Delete agent
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const agent = await prisma.agent.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (agent.count === 0) {
      throw new ApiError('Agent not found', 404);
    }

    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to delete agent', 500);
  }
});

export default router;