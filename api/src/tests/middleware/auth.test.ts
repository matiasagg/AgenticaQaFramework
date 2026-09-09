/**
 * Tests unitarios para el middleware de autenticación.
 * Valida la verificación JWT y autorización por roles.
 */

import { vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from '../../middleware/auth';

// Mock de objetos Request, Response, NextFunction
function createMockReq(headers: Record<string, string> = {}): AuthenticatedRequest {
  return {
    headers,
  } as unknown as AuthenticatedRequest;
}

function createMockRes() {
  const res: any = {
    statusCode: 200,
    jsonData: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.jsonData = data;
      return this;
    },
  };
  return res;
}

function createMockNext() {
  return vi.fn();
}

describe('Auth Middleware', () => {
  const validPayload = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'QA_ANALYST',
  };

  let validToken: string;

  beforeEach(() => {
    validToken = jwt.sign(validPayload, config.jwt.secret, { expiresIn: '1h' });
  });

  describe('authenticateToken', () => {
    it('debe rechazar request sin token (401)', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.jsonData.error.message).toBe('Access token required');
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar token mal formado (401)', () => {
      const req = createMockReq({ authorization: 'InvalidFormat token123' });
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar token inválido (403)', () => {
      const req = createMockReq({ authorization: 'Bearer invalidtoken' });
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error.message).toBe('Invalid or expired token');
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar token expirado (403)', () => {
      const expiredToken = jwt.sign(validPayload, config.jwt.secret, { expiresIn: '0s' });
      const req = createMockReq({ authorization: `Bearer ${expiredToken}` });
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('debe aceptar token válido y adjuntar usuario al request', () => {
      const req = createMockReq({ authorization: `Bearer ${validToken}` });
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe(validPayload.userId);
      expect(req.user?.email).toBe(validPayload.email);
      expect(req.user?.role).toBe(validPayload.role);
    });

    it('debe extraer correctamente el token del header Bearer', () => {
      const req = createMockReq({ authorization: `Bearer ${validToken}` });
      const res = createMockRes();
      const next = createMockNext();

      authenticateToken(req, res, next);

      expect(req.user?.id).toBe('user-123');
    });
  });

  describe('authorizeRoles', () => {
    it('debe permitir acceso a usuario con rol autorizado', () => {
      const req = createMockReq();
      req.user = { id: 'user-123', email: 'test@example.com', role: 'QA_ANALYST' };
      const res = createMockRes();
      const next = createMockNext();

      const middleware = authorizeRoles('QA_ANALYST', 'SDET');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
    });

    it('debe rechazar acceso a usuario con rol no autorizado (403)', () => {
      const req = createMockReq();
      req.user = { id: 'user-123', email: 'test@example.com', role: 'QA_ANALYST' };
      const res = createMockRes();
      const next = createMockNext();

      const middleware = authorizeRoles('ADMIN');
      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(res.jsonData.error.message).toBe('Insufficient permissions');
      expect(next).not.toHaveBeenCalled();
    });

    it('debe rechazar acceso a usuario no autenticado (401)', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      const middleware = authorizeRoles('QA_ANALYST');
      middleware(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.jsonData.error.message).toBe('Authentication required');
      expect(next).not.toHaveBeenCalled();
    });

    it('debe permitir múltiples roles autorizados', () => {
      const req = createMockReq();
      req.user = { id: 'user-123', email: 'test@example.com', role: 'SDET' };
      const res = createMockRes();
      const next = createMockNext();

      const middleware = authorizeRoles('QA_ANALYST', 'SDET', 'ADMIN');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('debe ser case-sensitive con los roles', () => {
      const req = createMockReq();
      req.user = { id: 'user-123', email: 'test@example.com', role: 'qa_analyst' };
      const res = createMockRes();
      const next = createMockNext();

      const middleware = authorizeRoles('QA_ANALYST');
      middleware(req, res, next);

      expect(res.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});