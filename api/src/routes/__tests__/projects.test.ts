/**
 * Tests de integración para projects.ts
 *
 * Verifica el update de proyectos, especialmente el manejo del PAT de GitHub
 * para no borrar el token actual si el usuario deja el campo en blanco.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

const mocks = vi.hoisted(() => ({
  mockUserId: 'user-test-123',
  mockPrisma: {
    project: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  mockEncryptApiKey: vi.fn(),
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

vi.mock('../../utils/encryption', () => ({
  encryptApiKey: (...args: any[]) => mocks.mockEncryptApiKey(...args),
  decryptApiKey: vi.fn((value) => value),
}))

import projectRoutes from '../../routes/projects'

function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/projects', projectRoutes)
  return app
}

describe('Projects Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockPrisma.project.findFirst.mockResolvedValue({
      id: 'proj-1',
      name: 'Proyecto',
      description: 'Desc',
      repository: 'https://github.com/org/repo',
      website: 'https://example.com',
      githubToken: 'enc:existing-token',
      isActive: true,
      userId: mocks.mockUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  it('should update githubToken when a new PAT is provided', async () => {
    mocks.mockEncryptApiKey.mockReturnValue('enc:github-token')
    mocks.mockPrisma.project.update.mockResolvedValue({
      id: 'proj-1',
      name: 'Proyecto',
      description: 'Desc',
      repository: 'https://github.com/org/repo',
      website: 'https://example.com',
      githubToken: 'enc:github-token',
      isActive: true,
      userId: mocks.mockUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const app = createApp()
    const res = await request(app)
      .put('/api/projects/proj-1')
      .send({
        name: 'Proyecto',
        description: 'Desc',
        repository: 'https://github.com/org/repo',
        website: 'https://example.com',
        githubToken: 'ghp_newtoken',
      })

    expect(res.status).toBe(200)
    expect(mocks.mockPrisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: expect.objectContaining({
        githubToken: 'enc:github-token',
      }),
    })
  })

  it('should preserve the existing PAT when the edit form leaves it empty', async () => {
    mocks.mockPrisma.project.update.mockResolvedValue({
      id: 'proj-1',
      name: 'Proyecto',
      description: 'Desc',
      repository: 'https://github.com/org/repo',
      website: 'https://example.com',
      githubToken: 'enc:existing-token',
      isActive: true,
      userId: mocks.mockUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const app = createApp()
    const res = await request(app)
      .put('/api/projects/proj-1')
      .send({
        name: 'Proyecto',
        description: 'Desc',
        repository: 'https://github.com/org/repo',
        website: 'https://example.com',
        githubToken: '',
      })

    expect(res.status).toBe(200)
    expect(mocks.mockPrisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: expect.not.objectContaining({ githubToken: expect.anything() }),
    })
  })

  it('should create the default test plans with defined tags', async () => {
    mocks.mockPrisma.project.create.mockResolvedValue({
      id: 'proj-new',
      name: 'Nuevo Proyecto',
      description: 'Desc',
      repository: null,
      website: null,
      githubToken: null,
      isActive: true,
      userId: mocks.mockUserId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const app = createApp()
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Nuevo Proyecto', description: 'Desc' })

    expect(res.status).toBe(201)
    const createArg = mocks.mockPrisma.project.create.mock.calls[0][0]
    expect(createArg.data.testPlans.create).toHaveLength(3)
    for (const plan of createArg.data.testPlans.create) {
      expect(Array.isArray(plan.tags)).toBe(true)
    }
    expect(createArg.data.testPlans.create).toEqual([
      expect.objectContaining({ planType: 'REPO', tags: [] }),
      expect.objectContaining({ planType: 'SDLC', tags: ['regression'] }),
      expect.objectContaining({ planType: 'CONTINUOUS', tags: ['smoke', 'regression'] }),
    ])
  })
})
