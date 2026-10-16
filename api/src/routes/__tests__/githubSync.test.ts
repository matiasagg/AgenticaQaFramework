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
import { vi } from 'vitest'
import request from 'supertest'
import express from 'express'

// ── Mocks con vi.hoisted ──────────────────────────────────────
// vi.hoisted garantiza que estas variables existan antes de que
// los factories de vi.mock sean invocados (vitest hoistea vi.mock).
const mocks = vi.hoisted(() => {
  const mockUserId = 'user-test-123'

  const mockPrisma = {
    $transaction: vi.fn(),
    project: {
      findFirst: vi.fn(),
    },
    userStory: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    bugReport: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    epic: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    feature: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    testSuite: {
      update: vi.fn(),
    },
  }

  const mockFetchIssues = vi.fn()
  const mockFetchBranches = vi.fn()
  const mockFetchPullRequests = vi.fn()
  const mockMapIssueToUserStory = vi.fn()
  const mockMapIssueToBugReport = vi.fn()
  const mockUpdateGitHubIssue = vi.fn()
  const mockBuildGitHubImportedWorkItemTitle = vi.fn((targetType: string, title: string, displayId?: string | null) =>
    targetType === 'HDU' && displayId ? `${displayId} - ${title}` : title)
  const mockBuildIssueDescription = vi.fn((description: string, githubUrl: string) => `${description}\n\n---\n🔗 Issue original: ${githubUrl}`)
  const mockHasGitHubIssueChanged = vi.fn((issue: any, syncedAt?: Date | string | null) =>
    !syncedAt || new Date(issue.updated_at).getTime() > new Date(syncedAt).getTime()
  )
  const mockReserveHduIdentity = vi.fn()
  const mockExtractSourceHduDisplayId = vi.fn()

  return {
    mockUserId,
    mockPrisma,
    mockFetchIssues,
    mockFetchBranches,
    mockFetchPullRequests,
    mockMapIssueToUserStory,
    mockMapIssueToBugReport,
    mockUpdateGitHubIssue,
    mockBuildGitHubImportedWorkItemTitle,
    mockBuildIssueDescription,
    mockHasGitHubIssueChanged,
    mockReserveHduIdentity,
    mockExtractSourceHduDisplayId,
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

vi.mock('../../services/hduIdentity', () => ({
  reserveHduIdentity: (...args: any[]) => mocks.mockReserveHduIdentity(...args),
  extractSourceHduDisplayId: (...args: any[]) => mocks.mockExtractSourceHduDisplayId(...args),
  parseHduNumber: vi.fn((value: string | null) => value ? Number(value.replace('HDU-', '')) : null),
}))

// Mock del servicio githubIntegration
vi.mock('../../services/githubIntegration', () => ({
  fetchIssues: (...args: any[]) => mocks.mockFetchIssues(...args),
  fetchBranches: (...args: any[]) => mocks.mockFetchBranches(...args),
  fetchPullRequests: (...args: any[]) => mocks.mockFetchPullRequests(...args),
  mapIssueToUserStory: (...args: any[]) => mocks.mockMapIssueToUserStory(...args),
  mapIssueToBugReport: (...args: any[]) => mocks.mockMapIssueToBugReport(...args),
  updateGitHubIssue: (...args: any[]) => mocks.mockUpdateGitHubIssue(...args),
  buildGitHubImportedWorkItemTitle: (...args: any[]) => mocks.mockBuildGitHubImportedWorkItemTitle(...args),
  buildIssueDescription: (...args: any[]) => (mocks.mockBuildIssueDescription as any)(...args),
  cleanIssueDescription: (body: string) => body,
  hasGitHubIssueChanged: (...args: any[]) => (mocks.mockHasGitHubIssueChanged as any)(...args),
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
    vi.resetAllMocks()
    // El mapeo por defecto de un issue
    mocks.mockMapIssueToUserStory.mockReturnValue(mockMapped)
    mocks.mockBuildGitHubImportedWorkItemTitle.mockImplementation((targetType: string, title: string, displayId?: string | null) =>
      targetType === 'HDU' && displayId ? `${displayId} - ${title}` : title)
    mocks.mockUpdateGitHubIssue.mockResolvedValue({
      ...mockIssue,
      updated_at: '2024-01-02T00:00:00Z',
    })
    mocks.mockMapIssueToBugReport.mockReturnValue({
      title: mockIssue.title,
      description: mockIssue.body,
      severity: 'HIGH',
      stepsToReproduce: [],
      expectedResult: '',
      actualResult: '',
      githubIssueNumber: mockIssue.number,
      githubUrl: mockIssue.html_url,
      assignee: null,
      labels: ['bug'],
      branchName: null,
    })
    mocks.mockBuildIssueDescription.mockImplementation((description: string, githubUrl: string) => `${description}\n\n---\n🔗 Issue original: ${githubUrl}`)
    mocks.mockHasGitHubIssueChanged.mockImplementation((issue: any, syncedAt?: Date | string | null) =>
      !syncedAt || new Date(issue.updated_at).getTime() > new Date(syncedAt).getTime()
    )
    mocks.mockPrisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => callback(mocks.mockPrisma))
    mocks.mockReserveHduIdentity.mockResolvedValue({ hduNumber: 1, displayId: 'HDU-001', resolution: 'ALLOCATED_NEW' })
    mocks.mockExtractSourceHduDisplayId.mockReturnValue(null)
    // Por defecto, el proyecto existe con repository configurado
    mocks.mockPrisma.project.findFirst.mockResolvedValue(mockProject)
    mocks.mockPrisma.userStory.findMany.mockResolvedValue([])
    mocks.mockPrisma.userStory.findFirst.mockResolvedValue(null)
    mocks.mockPrisma.bugReport.findMany.mockResolvedValue([])
    mocks.mockPrisma.bugReport.findFirst.mockResolvedValue(null)
    mocks.mockPrisma.bugReport.create.mockResolvedValue({ id: 'bug-new-1', title: 'Login bug' })
    mocks.mockPrisma.bugReport.update.mockResolvedValue({ id: 'bug-new-1', title: 'Login bug' })
    mocks.mockPrisma.epic.findFirst.mockResolvedValue(null)
    mocks.mockPrisma.epic.findMany.mockResolvedValue([])
    mocks.mockPrisma.epic.create.mockResolvedValue({ id: 'epic-default' })
    mocks.mockPrisma.epic.update.mockResolvedValue({ id: 'epic-existing', name: 'Existing epic' })
    mocks.mockPrisma.feature.findFirst.mockResolvedValue(null)
    mocks.mockPrisma.feature.findMany.mockResolvedValue([])
    mocks.mockPrisma.feature.create.mockResolvedValue({ id: 'feature-default', epicId: 'epic-default' })
    mocks.mockPrisma.feature.update.mockResolvedValue({ id: 'feature-existing', name: 'Existing feature' })
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

    it('should classify an issue with a numbered feature prefix as a feature', async () => {
      mocks.mockFetchIssues.mockResolvedValue([{
        ...mockIssue,
        title: '[FEATURE-001] User authentication',
        labels: [{ name: 'hdu' }],
      }])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/issues')

      expect(res.status).toBe(200)
      expect(res.body.issues[0].targetType).toBe('FEATURE')
    })

    it('should return field-level changes for an imported HDU', async () => {
      mocks.mockFetchIssues.mockResolvedValue([{ ...mockIssue, title: 'Login user story', labels: [] }])
      mocks.mockMapIssueToUserStory.mockReturnValue({ ...mockMapped, title: 'Login user story', priority: 'HIGH' })
      mocks.mockPrisma.userStory.findMany.mockResolvedValue([{
        externalId: '42',
        title: 'Old local title',
        description: 'Descripción anterior',
        acceptanceCriteria: ['Criterion 1'],
        definitionOfDone: [],
        technicalNotes: [],
        evidences: [],
        dependencies: [],
        priority: 'MEDIUM',
        storyPoints: null,
        labels: [],
        assignee: null,
        branchName: null,
        syncedAt: new Date('2024-01-01T00:00:00Z'),
        syncMetadata: { sourceUpdatedAt: '2024-01-01T00:00:00Z' },
        displayId: 'HDU-001',
        sourceDisplayId: null,
      }])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/issues')

      expect(res.status).toBe(200)
      expect(res.body.issues[0]).toMatchObject({ alreadyImported: true, needsSync: true })
      expect(res.body.issues[0].changes).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: 'title', localValue: 'Old local title', githubValue: 'Login user story' }),
      ]))
    })

    it('should expose the issue state and map bugs with their severity', async () => {
      mocks.mockFetchIssues.mockResolvedValue([{
        ...mockIssue,
        title: '[BUG] Login failure',
        labels: [{ name: 'bug' }],
        state: 'closed',
      }])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/issues?state=all')

      expect(res.status).toBe(200)
      expect(res.body.issues[0]).toMatchObject({
        state: 'closed',
        targetType: 'BUG',
        mapped: { severity: 'HIGH' },
      })
    })

    it('should detect pending changes for an imported epic', async () => {
      const epicUpdatedAt = new Date('2024-01-01T00:00:00Z')
      mocks.mockFetchIssues.mockResolvedValue([{
        ...mockIssue,
        title: '[EPIC] Authentication',
        updated_at: '2024-01-02T00:00:00Z',
        labels: [{ name: 'epic' }],
      }])
      mocks.mockPrisma.epic.findMany.mockResolvedValue([{
        id: 'epic-imported-1',
        name: 'Authentication',
        externalId: '42',
        syncedAt: epicUpdatedAt,
      }])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/issues')

      expect(res.status).toBe(200)
      expect(res.body.issues[0]).toMatchObject({ alreadyImported: true, needsSync: true, targetType: 'EPIC' })
    })

    it('should detect an already synchronized feature without a false pending change', async () => {
      mocks.mockFetchIssues.mockResolvedValue([{
        ...mockIssue,
        title: '[FEATURE-001] User authentication',
        updated_at: '2024-01-02T00:00:00Z',
        labels: [{ name: 'feature' }],
      }])
      mocks.mockPrisma.feature.findMany.mockResolvedValue([{
        id: 'feature-imported-1',
        name: 'User authentication',
        externalId: '42',
        syncedAt: new Date('2024-01-02T00:00:00Z'),
        syncMetadata: { sourceUpdatedAt: '2024-01-02T00:00:00Z' },
      }])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/issues')

      expect(res.status).toBe(200)
      expect(res.body.issues[0]).toMatchObject({ alreadyImported: true, needsSync: false, targetType: 'FEATURE' })
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
      mocks.mockFetchIssues.mockResolvedValue([{ ...mockIssue, title: 'Login user story', labels: [] }])
      mocks.mockMapIssueToUserStory.mockReturnValue({ ...mockMapped, title: 'Login user story', priority: 'MEDIUM' })
      mocks.mockPrisma.userStory.create.mockResolvedValue({
        id: 'us-new-1',
        title: 'Login user story',
        displayId: 'HDU-001',
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
        skipped: 0,
        byType: { HDU: 1 },
      })
      expect(res.body.imported).toHaveLength(1)
      expect(res.body.imported[0].issueNumber).toBe(42)
      expect(mocks.mockPrisma.userStory.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          hduNumber: 1,
          displayId: 'HDU-001',
        }),
      }))
      expect(mocks.mockUpdateGitHubIssue).toHaveBeenCalledWith(
        'https://github.com/owner/repo',
        42,
        { title: 'HDU-001 - Login user story' },
        undefined,
      )
    })

    it('should persist GitHub identity when importing an epic', async () => {
      mocks.mockFetchIssues.mockResolvedValue([{
        ...mockIssue,
        title: '[EPIC] Authentication',
        labels: [{ name: 'epic' }],
      }])
      mocks.mockMapIssueToUserStory.mockReturnValue({ ...mockMapped, title: '[EPIC] Authentication' })
      mocks.mockPrisma.epic.create.mockResolvedValue({ id: 'epic-new-1', name: 'Authentication' })

      const app = createApp()
      const res = await request(app)
        .post('/api/github-sync/proj-1/import')
        .send({ issueNumbers: [42] })

      expect(res.status).toBe(201)
      expect(mocks.mockPrisma.epic.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          externalSystem: 'GITHUB',
          externalId: '42',
          syncStatus: 'SYNCED',
          syncedAt: expect.any(Date),
        }),
      }))
    })

    it('should publish the normalized bug title when importing a bug', async () => {
      mocks.mockFetchIssues.mockResolvedValue([{
        ...mockIssue,
        title: '[BUG] Login bug',
        labels: [{ name: 'bug' }],
      }])
      mocks.mockMapIssueToBugReport.mockReturnValue({
        title: '[BUG] Login bug',
        description: 'The login fails',
        severity: 'HIGH',
        stepsToReproduce: [],
        expectedResult: '',
        actualResult: '',
        githubIssueNumber: 42,
        githubUrl: mockIssue.html_url,
        assignee: null,
        labels: ['bug'],
        branchName: null,
      })

      const app = createApp()
      const res = await request(app)
        .post('/api/github-sync/proj-1/import')
        .send({ issueNumbers: [42] })

      expect(res.status).toBe(201)
      expect(mocks.mockUpdateGitHubIssue).toHaveBeenCalledWith(
        'https://github.com/owner/repo',
        42,
        { title: 'Login bug' },
        undefined,
      )
    })

    it('should skip import when the GitHub issue was already mapped to a HDU by external id', async () => {
      mocks.mockFetchIssues.mockResolvedValue([mockIssue])
      mocks.mockPrisma.userStory.findFirst.mockResolvedValue({
        id: 'us-existing-1',
        title: mockMapped.title,
        externalId: '42',
        externalSystem: 'GITHUB',
      })

      const app = createApp()
      const res = await request(app)
        .post('/api/github-sync/proj-1/import')
        .send({ issueNumbers: [42] })

      expect(res.status).toBe(201)
      expect(mocks.mockPrisma.userStory.create).not.toHaveBeenCalled()
      expect(res.body.summary.success).toBe(0)
      expect(res.body.summary.skipped).toBe(1)
      expect(res.body.skipped[0].issueNumber).toBe(42)
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

    it('should identify imported issues changed in GitHub', async () => {
      mocks.mockFetchIssues.mockResolvedValue([mockIssue])
      mocks.mockPrisma.userStory.findMany.mockResolvedValue([{
        id: 'us-existing-1',
        externalId: '42',
        title: mockMapped.title,
        syncedAt: new Date('2024-01-01T00:00:00Z'),
      }])

      const app = createApp()
      const res = await request(app).get('/api/github-sync/proj-1/issues')

      expect(res.status).toBe(200)
      expect(res.body.issues[0]).toMatchObject({ alreadyImported: true, needsSync: true })
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

    describe('POST /api/github-sync/:projectId/sync', () => {
      it('should update an imported HDU when its GitHub issue changed', async () => {
        mocks.mockFetchIssues.mockResolvedValue([mockIssue])
        mocks.mockPrisma.userStory.findMany.mockResolvedValue([{
          id: 'us-existing-1',
          externalId: '42',
          syncedAt: new Date('2024-01-01T00:00:00Z'),
        }])
        mocks.mockPrisma.userStory.update.mockResolvedValue({ id: 'us-existing-1' })

        const app = createApp()
        const res = await request(app)
          .post('/api/github-sync/proj-1/sync')
          .send({ issueNumbers: [42] })

        expect(res.status).toBe(200)
        expect(res.body.summary).toEqual({ total: 1, synced: 1, skipped: 0 })
        expect(mocks.mockPrisma.userStory.update).toHaveBeenCalledWith(expect.objectContaining({
          where: { id: 'us-existing-1' },
          data: expect.objectContaining({ syncStatus: 'SYNCED' }),
        }))
        expect(mocks.mockPrisma.userStory.findMany).toHaveBeenCalledWith(expect.objectContaining({
          where: expect.objectContaining({ userId: mocks.mockUserId }),
        }))
      })

      it('should reject invalid issue numbers before calling GitHub', async () => {
        const app = createApp()
        const res = await request(app)
          .post('/api/github-sync/proj-1/sync')
          .send({ issueNumbers: ['42'] })

        expect(res.status).toBe(400)
        expect(mocks.mockFetchIssues).not.toHaveBeenCalled()
      })
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
