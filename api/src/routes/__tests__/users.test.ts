import { vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { errorHandler } from '../../middleware/errorHandler'

const mocks = vi.hoisted(() => ({
  mockUserId: 'user-test-123',
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = {
      id: mocks.mockUserId,
      email: 'test@example.com',
      role: 'QA_ANALYST',
    }
    next()
  },
  AuthenticatedRequest: {} as any,
}))

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mocks.mockPrisma),
}))

import userRoutes from '../../routes/users'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/users', userRoutes)
  app.use(errorHandler)
  return app
}

describe('Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when the current user no longer exists in the database', async () => {
    mocks.mockPrisma.user.findUnique.mockResolvedValue(null)

    const app = createApp()
    const res = await request(app).get('/api/users/me')

    expect(res.status).toBe(401)
    expect(res.body.error.message).toMatch(/invalid session|session/i)
  })
})
