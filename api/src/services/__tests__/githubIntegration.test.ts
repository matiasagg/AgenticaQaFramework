/**
 * Tests unitarios para githubIntegration.ts
 *
 * Verifica las funciones puras de mapeo y parsing que no requieren
 * conexión a la red: parseRepoUrl, mapIssueToUserStory,
 * extractAcceptanceCriteria (indirectamente) y mapPriority (indirectamente).
 *
 * Las funciones fetchIssues/fetchBranches/fetchPullRequests se prueban
 * con mocking de fetch, configurando process.env.GITHUB_TOKEN antes.
 */
import { vi } from 'vitest'
import type { GitHubIssue } from '../githubIntegration'
import {
  parseRepoUrl,
  mapIssueToUserStory,
  buildIssueDescription,
  fetchIssues,
  fetchBranches,
  fetchPullRequests,
} from '../githubIntegration'

describe('githubIntegration service', () => {
  beforeEach(() => {
    // Configuramos un token de prueba antes de cada test
    process.env.GITHUB_TOKEN = 'test-token-12345'
  })

  afterEach(() => {
    // Limpiamos el token después de cada test
    delete process.env.GITHUB_TOKEN
  })

  describe('parseRepoUrl', () => {
    /**
     * parseRepoUrl extrae owner y repo de una URL de GitHub.
     * Verifica varios formatos comunes: HTTPS, con .git, con trailing slash.
     */
    it('should parse a standard HTTPS GitHub URL', () => {
      const result = parseRepoUrl('https://github.com/owner/repo')
      expect(result).toEqual({ owner: 'owner', repo: 'repo' })
    })

    it('should parse a URL with .git suffix', () => {
      const result = parseRepoUrl('https://github.com/owner/repo.git')
      expect(result).toEqual({ owner: 'owner', repo: 'repo' })
    })

    it('should parse a URL with trailing slash', () => {
      const result = parseRepoUrl('https://github.com/owner/repo/')
      expect(result).toEqual({ owner: 'owner', repo: 'repo' })
    })

    it('should parse a URL with additional path segments', () => {
      const result = parseRepoUrl('https://github.com/owner/repo/issues/123')
      expect(result).toEqual({ owner: 'owner', repo: 'repo' })
    })

    it('should return null for a non-GitHub URL', () => {
      const result = parseRepoUrl('https://gitlab.com/owner/repo')
      expect(result).toBeNull()
    })

    it('should return null for an invalid URL', () => {
      const result = parseRepoUrl('not-a-url')
      expect(result).toBeNull()
    })
  })

  describe('mapIssueToUserStory', () => {
    /**
     * mapIssueToUserStory convierte un issue de GitHub en datos
     * listos para crear una UserStory. Verifica el mapeo de título,
     * prioridad, criterios de aceptación, etc.
     */
    it('should map a basic issue with no acceptance criteria', () => {
      const issue: GitHubIssue = {
        id: 1,
        number: 42,
        title: 'Bug: login fails on Safari',
        body: 'The login form does not work on Safari.',
        state: 'open',
        labels: [],
        html_url: 'https://github.com/owner/repo/issues/42',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mapped = mapIssueToUserStory(issue)

      expect(mapped.title).toBe('Bug: login fails on Safari')
      expect(mapped.description).toBe('The login form does not work on Safari.')
      expect(mapped.githubIssueNumber).toBe(42)
      expect(mapped.githubUrl).toBe('https://github.com/owner/repo/issues/42')
      expect(mapped.priority).toBe('MEDIUM')
      expect(mapped.acceptanceCriteria).toEqual([])
    })

    it('should map priority as HIGH when labels include "p0"', () => {
      const issue: GitHubIssue = {
        id: 2,
        number: 1,
        title: 'Critical security fix',
        body: 'Fix security vulnerability',
        state: 'open',
        labels: [{ name: 'p0' }, { name: 'security' }],
        html_url: 'https://github.com/owner/repo/issues/1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mapped = mapIssueToUserStory(issue)
      expect(mapped.priority).toBe('HIGH')
    })

    it('should map priority as LOW when labels include "baja"', () => {
      const issue: GitHubIssue = {
        id: 3,
        number: 2,
        title: 'Minor UI tweak',
        body: 'Change button color',
        state: 'open',
        labels: [{ name: 'baja' }],
        html_url: 'https://github.com/owner/repo/issues/2',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mapped = mapIssueToUserStory(issue)
      expect(mapped.priority).toBe('LOW')
    })

    it('should map priority as HIGH when labels include "critical"', () => {
      const issue: GitHubIssue = {
        id: 4,
        number: 3,
        title: 'Critical issue',
        body: 'Body',
        state: 'open',
        labels: [{ name: 'critical' }],
        html_url: 'https://github.com/owner/repo/issues/3',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mapped = mapIssueToUserStory(issue)
      expect(mapped.priority).toBe('HIGH')
    })

    it('should extract acceptance criteria from a "Criterios de Aceptación" section', () => {
      const body = `
        Descripción del issue...

        Criterios de Aceptación:
          - El usuario debe poder iniciar sesión
          - El formulario debe validar email y password
          - Debe mostrar error si las credenciales son incorrectas
      `
      const issue: GitHubIssue = {
        id: 5,
        number: 4,
        title: 'Login feature',
        body,
        state: 'open',
        labels: [],
        html_url: 'https://github.com/owner/repo/issues/4',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mapped = mapIssueToUserStory(issue)
      expect(mapped.acceptanceCriteria).toHaveLength(3)
      expect(mapped.acceptanceCriteria).toContain('El usuario debe poder iniciar sesión')
      expect(mapped.acceptanceCriteria).toContain('El formulario debe validar email y password')
    })

    it('should extract acceptance criteria from "Acceptance Criteria" section (English)', () => {
      const body = `
        Some description

        Acceptance Criteria:
          - User can log in with valid credentials
          - Error message shown for invalid credentials
      `
      const issue: GitHubIssue = {
        id: 6,
        number: 5,
        title: 'Login feature',
        body,
        state: 'open',
        labels: [],
        html_url: 'https://github.com/owner/repo/issues/5',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mapped = mapIssueToUserStory(issue)
      expect(mapped.acceptanceCriteria).toHaveLength(2)
      expect(mapped.acceptanceCriteria).toContain('User can log in with valid credentials')
    })

    it('should extract acceptance criteria from checkbox list', () => {
      const body = `
        Implement feature X

        - [x] User can do A
        - [ ] User can do B
        - [ ] User can do C
      `
      const issue: GitHubIssue = {
        id: 7,
        number: 6,
        title: 'Feature X',
        body,
        state: 'open',
        labels: [],
        html_url: 'https://github.com/owner/repo/issues/6',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mapped = mapIssueToUserStory(issue)
      expect(mapped.acceptanceCriteria.length).toBeGreaterThan(0)
    })

    it('should handle null body gracefully', () => {
      const issue: GitHubIssue = {
        id: 8,
        number: 7,
        title: 'Issue with no body',
        body: null,
        state: 'open',
        labels: [],
        html_url: 'https://github.com/owner/repo/issues/7',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mapped = mapIssueToUserStory(issue)
      expect(mapped.description).toBe('Issue with no body')
      expect(mapped.acceptanceCriteria).toEqual([])
    })

    it('should keep the real GitHub issue description and append the original link once', () => {
      const realDescription = 'La pantalla de login falla al cargar la sesión.'
      const githubUrl = 'https://github.com/owner/repo/issues/42'

      const result = buildIssueDescription(realDescription, githubUrl)

      expect(result).toContain(realDescription)
      expect(result).toContain('Issue original: https://github.com/owner/repo/issues/42')
      expect(result.indexOf(realDescription)).toBeLessThan(result.indexOf('Issue original:'))
    })
  })

  describe('fetchIssues', () => {
    /**
     * fetchIssues llama a la API REST de GitHub.
     * Usamos mocking de fetch para verificar:
     * - que se construye la URL correctamente
     * - que se filtran los PRs
     * - que se maneja el error de token faltante
     */
    it('should throw if GITHUB_TOKEN is not configured', async () => {
      delete process.env.GITHUB_TOKEN
      await expect(fetchIssues('https://github.com/owner/repo', 'open')).rejects.toThrow(
        'GITHUB_TOKEN no configurado'
      )
    })

    it('should reject placeholder GitHub tokens before calling the API', async () => {
      process.env.GITHUB_TOKEN = 'your-github-personal-access-token'
      await expect(fetchIssues('https://github.com/owner/repo', 'open')).rejects.toThrow(
        'GITHUB_TOKEN no configurado'
      )
    })

    it('should throw if repo URL is invalid', async () => {
      await expect(fetchIssues('not-a-url', 'open')).rejects.toThrow(
        'URL de repositorio inválida'
      )
    })

    it('should fetch issues and filter out PRs', async () => {
      const mockIssues = [
        { number: 1, title: 'Issue 1', html_url: 'https://github.com/owner/repo/issues/1', body: 'b', state: 'open', labels: [] },
        { number: 2, title: 'PR 1', html_url: 'https://github.com/owner/repo/pull/1', body: null, state: 'open', labels: [] },
        { number: 3, title: 'Issue 2', html_url: 'https://github.com/owner/repo/issues/3', body: 'b', state: 'open', labels: [] },
      ]

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockIssues,
      }) as any

      const issues = await fetchIssues('https://github.com/owner/repo', 'open')
      expect(issues).toHaveLength(2)
      // Los PRs deben ser filtrados (html_url incluye '/pull/')
      expect(issues.every((i) => !i.html_url.includes('/pull/'))).toBe(true)
    })

    it('should throw on API error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      }) as any

      await expect(fetchIssues('https://github.com/owner/repo', 'open')).rejects.toThrow(
        'GitHub API error: 404'
      )
    })

    it('should send correct authorization headers', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }) as any

      await fetchIssues('https://github.com/owner/repo', 'all')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/issues?state=all&per_page=100',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token-12345',
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'QA-SaaS-Platform',
          },
        })
      )
    })
  })

  describe('fetchBranches', () => {
    it('should throw if GITHUB_TOKEN is not configured', async () => {
      delete process.env.GITHUB_TOKEN
      await expect(fetchBranches('https://github.com/owner/repo')).rejects.toThrow(
        'GITHUB_TOKEN no configurado'
      )
    })

    it('should reject placeholder GitHub tokens before calling the API', async () => {
      process.env.GITHUB_TOKEN = 'your-github-personal-access-token'
      await expect(fetchBranches('https://github.com/owner/repo')).rejects.toThrow(
        'GITHUB_TOKEN no configurado'
      )
    })

    it('should fetch and map branch names', async () => {
      const mockBranches = [
        { name: 'main' },
        { name: 'feature/login' },
        { name: 'feature/payment' },
      ]

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockBranches,
      }) as any

      const branches = await fetchBranches('https://github.com/owner/repo')
      expect(branches).toEqual(['main', 'feature/login', 'feature/payment'])
    })
  })

  describe('fetchPullRequests', () => {
    it('should throw if GITHUB_TOKEN is not configured', async () => {
      delete process.env.GITHUB_TOKEN
      await expect(fetchPullRequests('https://github.com/owner/repo')).rejects.toThrow(
        'GITHUB_TOKEN no configurado'
      )
    })

    it('should reject placeholder GitHub tokens before calling the API', async () => {
      process.env.GITHUB_TOKEN = 'your-github-personal-access-token'
      await expect(fetchPullRequests('https://github.com/owner/repo')).rejects.toThrow(
        'GITHUB_TOKEN no configurado'
      )
    })

    it('should fetch and map PRs correctly', async () => {
      const mockPRs = [
        { number: 10, title: 'Fix login bug', head: { ref: 'fix/login-bug' }, html_url: 'https://github.com/owner/repo/pull/10', state: 'open' },
        { number: 11, title: 'Add payment feature', head: { ref: 'feature/payment' }, html_url: 'https://github.com/owner/repo/pull/11', state: 'closed' },
      ]

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPRs,
      }) as any

      const pulls = await fetchPullRequests('https://github.com/owner/repo', 'all')
      expect(pulls).toHaveLength(2)
      expect(pulls[0]).toEqual({
        number: 10,
        title: 'Fix login bug',
        branch: 'fix/login-bug',
        url: 'https://github.com/owner/repo/pull/10',
        state: 'open',
      })
      expect(pulls[1].branch).toBe('feature/payment')
    })
  })
})
