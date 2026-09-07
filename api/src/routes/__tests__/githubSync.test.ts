/**
 * Tests de integración para githubSync.ts
 *
 * Verifica los endpoints del router de sincronización con GitHub:
 * - GET  /api/github-sync/:projectId/issues      (preview de issues)
 * - POST /api/github-sync/:projectId/import      (importar issues como HDUs)
 * - GET  /api/github-sync/:projectId/branches     (listar ramas)
 * - GET  /api/github-sync/:projectId/pulls       (listar PRs)
 * - PUT  /api/github-sync/:projectId/associate-branch
 *
 * Se hacen mock de PrismaClient, del middleware de auth y de las
 * funciones del servicio githubIntegration.ts.
 *
 * NOTA: Se usa vi.hoisted() para que las variables mock estén disponibles
 * cuando vi.mock() se ejecuta (vitest hoistea los mocks al inicio).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

// ── Mocks con vi.hoisted ──────────────────────────────────────
// vi.hoisted garantiza que estas variables existan antes de que
// los factories de vi.mock sean invocados (vitest hoistea vi.mock).
const mocks = vi.hoisted(() => {
  const mockUserId = 'user-test-123'

  const mockPrisma = {
    project: {
      findFirst: vi.fn(),
    },
    userStory: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    epic: {
      findFirst: vi.fn(),
    },
    feature: {
      findFirst: vi.fn(),
    },
    testSuite: {
      update: vi.fn(),
    },
  }

  const mockFetchIssues = vi.fn()
  const mockFetchBranches = vi.fn()
  const mockFetchPullRequests = vi.fn()
  const mockMapIssueToUserStory = vi.fn()
  const mockBuildIssueDescription = vi.fn((description: string, githubUrl: string) => `${description}\n\n---\n🔗 Issue original: ${githubUrl}`)

  return {
    mockUserId,
    mockPrisma,
    mockFetchIssues,
    mockFetchBranches,
    mockFetchPullRequests,
    mockMapIssueToUserStory,
    mockBuildIssueDescription,
  }
})

// Mock del middleware de autenticación: simula un usuario autenticado
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

// Mock de PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mocks.mockPrisma),
}))

// Mock del servicio githubIntegration
vi.mock('../../services/githubIntegration', () => ({
  fetchIssues: (...args: any[]) => mocks.mockFetchIssues(...args),
  fetchBranches: (...args: any[]) => mocks.mockFetchBranches(...args),
  fetchPullRequests: (...args: any[]) => mocks.mockFetchPullRequests(...args),
  mapIssueToUserStory: (...args: any[]) => mocks.mockMapIssueToUserStory(...args),
  buildIssueDescription: (description: string, githubUrl: string) =>
    mocks.mockBuildIssueDescription(description, githubUrl),
  parseRepoUrl: vi.fn(),
}))

// Importamos después de los mocks
import githubIntegrationRoutes from '../../routes/githubSync'

// ── Datos de ejemplo ──────────────────────────────────────────
const mockProject = {
  id: 'proj-1',
  name: 'Test Project',
  repository: 'https://github.com/owner/repo',
}

const mockIssue = {
  id: 1,
  number: 42,
  title: 'Bug: login fails',
  body: 'Descripción del issue...',
  state: 'open' as const,
  labels: [{ name: 'p0' }],
  html_url: 'https://github.com/owner/repo/issues/42',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

const mockMapped = {
  title: 'Bug: login fails',
  description: 'Descripción del issue...',
  acceptanceCriteria: ['Criterion 1'],
  priority: 'HIGH',
  githubIssueNumber: 42,
  githubUrl: 'https://github.com/owner/repo/issues/42',
}

/**
 * Crea una app Express mínima para testear los routers.
 * Se configura con JSON body parser y el router bajo test.
 */
function createApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/github-sync', githubIntegrationRoutes)
  return app
}

describe('GitHub Sync Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // El mapeo por defecto de un issue
    mocks.mockMapIssueToUserStory.mockReturnValue(mockMapped)
    mocks.mockBuildIssueDescription.mockImplementation((description: string, githubUrl: string) => `${description}\n\n---\n🔗 Issue original: ${githubUrl}`)
    // Por defecto, el proyecto existe con repository configurado
    mocks.mockPrisma.project.findFirst.mockResolvedValue(mockProject)
    mocks.mockPrisma.userStory.findMany.mockResolvedValue([])
  })

  describe('GET /api/github-sync/:projectId/issues', () => {
    /**
     * Verifica que el endpoint retorne un preview de los issues
     * de GitHub, indicando cuáles ya fueron importados.
     */
    it('should return issues preview for a valid project', async () => {
      mocks.mockFetchIssues.mockResolvedValue([mockIssue])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/issues')

      expect(res.status).toBe(200)
      expect(res.body.repository).toBe('https://github.com/owner/repo')
      expect(res.body.issues).toHaveLength(1)
      expect(res.body.issues[0]).toMatchObject({
        number: 42,
        title: 'Bug: login fails',
        url: 'https://github.com/owner/repo/issues/42',
        labels: ['p0'],
        alreadyImported: false,
        mapped: mockMapped,
      })
    })

    it('should return 404 if project not found', async () => {
      mocks.mockPrisma.project.findFirst.mockResolvedValue(null)

      const app = createApp()
      const res = await request(app).get('/api/github-sync/invalid-project/issues')

      expect(res.status).toBe(404)
    })

    it('should return 400 if project has no repository', async () => {
      mocks.mockPrisma.project.findFirst.mockResolvedValue({
        ...mockProject,
        repository: null,
      })

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/issues')

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/github-sync/:projectId/import', () => {
    /**
     * Verifica que el endpoint importe issues seleccionados como HDUs,
     * retornando un resumen de cuántos tuvieron éxito y cuántos fallaron.
     */
    it('should import selected issues as user stories', async () => {
      mocks.mockFetchIssues.mockResolvedValue([mockIssue])
      mocks.mockPrisma.userStory.create.mockResolvedValue({
        id: 'us-new-1',
        title: mockMapped.title,
      })

      const app = createApp()
      const res = await request(app)
        .post('/api/github-sync/proj-1/import')
        .send({ issueNumbers: [42] })

      expect(res.status).toBe(201)
      expect(res.body.summary).toEqual({
        total: 1,
        success: 1,
        failed: 0,
      })
      expect(res.body.imported).toHaveLength(1)
      expect(res.body.imported[0].issueNumber).toBe(42)
    })

    it('should return 400 if issueNumbers is empty', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/github-sync/proj-1/import')
        .send({ issueNumbers: [] })

      expect(res.status).toBe(400)
    })

    it('should return 400 if issueNumbers is not an array', async () => {
      const app = createApp()
      const res = await request(app)
        .post('/api/github-sync/proj-1/import')
        .send({ issueNumbers: 42 })

      expect(res.status).toBe(400)
    })

    it('should return 404 if no issues match the given numbers', async () => {
      mocks.mockFetchIssues.mockResolvedValue([])

      const app = createApp()
      const res = await request(app)
        .post('/api/github-sync/proj-1/import')
        .send({ issueNumbers: [999] })

      expect(res.status).toBe(404)
    })

    it('should handle individual import errors gracefully', async () => {
      mocks.mockFetchIssues.mockResolvedValue([
        mockIssue,
        { ...mockIssue, number: 43, id: 2 },
      ])

      // First creation succeeds, second fails
      mocks.mockPrisma.userStory.create
        .mockResolvedValueOnce({ id: 'us-new-1', title: mockMapped.title })
        .mockRejectedValueOnce(new Error('Duplicate entry'))

      const app = createApp()
      const res = await request(app)
        .post('/api/github-sync/proj-1/import')
        .send({ issueNumbers: [42, 43] })

      expect(res.status).toBe(201)
      expect(res.body.summary.success).toBe(1)
      expect(res.body.summary.failed).toBe(1)
      expect(res.body.errors).toHaveLength(1)
    })
  })

  describe('GET /api/github-sync/:projectId/branches', () => {
    it('should return branches for a valid project', async () => {
      mocks.mockFetchBranches.mockResolvedValue(['main', 'feature/login'])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/branches')

      expect(res.status).toBe(200)
      expect(res.body.branches).toEqual(['main', 'feature/login'])
    })

    it('should return 404 if project not found', async () => {
      mocks.mockPrisma.project.findFirst.mockResolvedValue(null)

      const app = createApp()
      const res = await request(app).get('/api/github-sync/invalid/branches')

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/github-sync/:projectId/pulls', () => {
    it('should return pull requests for a valid project', async () => {
      mocks.mockFetchPullRequests.mockResolvedValue([
        { number: 5, title: 'Fix bug', branch: 'fix/bug', url: 'url', state: 'open' },
      ])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/pulls')

      expect(res.status).toBe(200)
      expect(res.body.pulls).toHaveLength(1)
      expect(res.body.pulls[0].branch).toBe('fix/bug')
    })
  })

  describe('PUT /api/github-sync/:projectId/associate-branch', () => {
    /**
     * Verifica que el endpoint asocie una rama (y opcionalmente un PR) a una HDU.
     */
    it('should associate a branch to a user story', async () => {
      mocks.mockPrisma.userStory.findFirst.mockResolvedValue({
        id: 'us-1',
        title: 'Some story',
      })
      mocks.mockPrisma.userStory.update.mockResolvedValue({
        id: 'us-1',
        branchName: 'feature/login',
        prNumber: '5',
        prUrl: 'https://github.com/owner/repo/pull/5',
      })

      const app = createApp()
      const res = await request(app)
        .put('/api/github-sync/proj-1/associate-branch')
        .send({
          userStoryId: 'us-1',
          branchName: 'feature/login',
          prNumber: 5,
          prUrl: 'https://github.com/owner/repo/pull/5',
        })

      expect(res.status).toBe(200)
      expect(res.body.message).toBe('Rama asociada correctamente')
    })

    it('should return 400 if userStoryId or branchName missing', async () => {
      const app = createApp()
      const res = await request(app)
        .put('/api/github-sync/proj-1/associate-branch')
        .send({ userStoryId: 'us-1' })

      expect(res.status).toBe(400)
    })

    it('should return 404 if user story not found', async () => {
      mocks.mockPrisma.userStory.findFirst.mockResolvedValue(null)

      const app = createApp()
      const res = await request(app)
        .put('/api/github-sync/proj-1/associate-branch')
        .send({ userStoryId: 'invalid', branchName: 'feature/login' })

      expect(res.status).toBe(404)
    })
  })
})
