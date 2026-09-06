import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient, PrismaClientKnownRequestError } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError('Session invalid or expired', 401);
    }

    res.json({ user });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch user profile', 500);
  }
}));

/**
 * PUT /api/users/me
 * Update current user profile
 */
router.put('/me', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, avatar },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ user });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new ApiError('Session invalid or expired', 401);
    }

    throw new ApiError('Failed to update user profile', 500);
  }
}));

export default router;