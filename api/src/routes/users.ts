import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { encryptApiKey } from '../utils/encryption';

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
    if ((error as any)?.code === 'P2025') {
      throw new ApiError('Session invalid or expired', 401);
    }

  throw new ApiError('Failed to update user profile', 500);
  }
}));

/**
 * GET /api/users/me/gemini-key
 * Indica si el usuario tiene una key BYO de Gemini configurada (sin exponerla).
 * Devuelve { configured: boolean } para que la UI muestre el estado.
 */
router.get('/me/gemini-key', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { geminiApiKey: true },
  });

  if (!user) {
    throw new ApiError('Session invalid or expired', 401);
  }

  res.json({ configured: !!user.geminiApiKey });
}));

/**
 * PUT /api/users/me/gemini-key
 * Guarda (encriptada con AES-256-GCM) la key de Gemini del usuario (BYO).
 * Esta key se usará para el análisis DoR con IA, independiente del .env global.
 *
 * Body: { geminiApiKey: string }
 */
router.put('/me/gemini-key', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { geminiApiKey } = req.body;

  if (!geminiApiKey || typeof geminiApiKey !== 'string' || !geminiApiKey.trim()) {
    throw new ApiError('Falta el campo geminiApiKey', 400);
  }

  // Cifrar antes de persistir (nunca en texto plano)
  const encrypted = encryptApiKey(geminiApiKey.trim());

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { geminiApiKey: encrypted },
  });

  res.json({ configured: true, message: 'Key de Gemini guardada correctamente (encriptada)' });
}));

/**
 * DELETE /api/users/me/gemini-key
 * Elimina la key BYO del usuario (volverá a usarse la key global si existe).
 */
router.delete('/me/gemini-key', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { geminiApiKey: null },
  });

  res.json({ configured: false, message: 'Key de Gemini eliminada' });
}));

export default router;
