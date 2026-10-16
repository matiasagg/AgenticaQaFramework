import { expect, test } from '@playwright/test'

test.describe('HDU-002: sincronización GitHub', () => {
  test('permite seleccionar un issue con cambios sin duplicar el click del checkbox', async ({ page }) => {
    const selectedSyncIssues: number[][] = []

    await page.addInitScript(() => localStorage.setItem('token', 'e2e-test-token'))
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user-1', email: 'e2e@example.com', name: 'E2E User', role: 'QA_ANALYST' } }),
      })
    })
    await page.route('**/api/projects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projects: [{ id: 'project-1', name: 'Proyecto QA', repository: 'https://github.com/owner/repo' }],
        }),
      })
    })
    await page.route('**/api/github-sync/project-1/issues*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          repository: 'https://github.com/owner/repo',
          issues: [
            {
              number: 10,
              title: 'Nueva HDU',
              url: 'https://github.com/owner/repo/issues/10',
              labels: [],
              state: 'open',
              targetType: 'HDU',
              alreadyImported: false,
              needsSync: false,
              changes: [],
              mapped: { title: 'Nueva HDU', priority: 'MEDIUM', acceptanceCriteria: [] },
            },
            {
              number: 11,
              title: 'Bug importado',
              url: 'https://github.com/owner/repo/issues/11',
              labels: ['bug'],
              state: 'open',
              targetType: 'BUG',
              alreadyImported: true,
              needsSync: true,
              changes: [{ field: 'title', label: 'Título', localValue: 'Título anterior', githubValue: 'Bug importado' }],
              mapped: { title: 'Bug importado', severity: 'HIGH' },
            },
            {
              number: 12,
              title: 'Epic sincronizada',
              url: 'https://github.com/owner/repo/issues/12',
              labels: ['epic'],
              state: 'open',
              targetType: 'EPIC',
              alreadyImported: true,
              needsSync: false,
              changes: [],
              mapped: { title: 'Epic sincronizada', priority: 'MEDIUM', acceptanceCriteria: [] },
            },
            {
              number: 13,
              title: 'Feature sincronizada',
              url: 'https://github.com/owner/repo/issues/13',
              labels: ['feature'],
              state: 'open',
              targetType: 'FEATURE',
              alreadyImported: true,
              needsSync: false,
              changes: [],
              mapped: { title: 'Feature sincronizada', priority: 'MEDIUM', acceptanceCriteria: [] },
            },
          ],
        }),
      })
    })
    await page.route('**/api/github-sync/project-1/pulls*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ pulls: [] }) })
    })
    await page.route('**/api/github-sync/project-1/branches', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ branches: ['main'] }) })
    })
    await page.route('**/api/github-sync/project-1/sync', async (route) => {
      selectedSyncIssues.push((JSON.parse(route.request().postData() || '{}') as { issueNumbers: number[] }).issueNumbers)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ summary: { total: 1, synced: 1, skipped: 0 }, synced: [{ issueNumber: 11, type: 'BUG' }], skipped: [] }),
      })
    })

    await page.goto('/github-sync')
    await expect(page.getByRole('heading', { name: 'GitHub Sync' })).toBeVisible()
    await expect(page.getByText('destino: BUG')).toBeVisible()
    await expect(page.getByText('destino: EPIC')).toBeVisible()
    await expect(page.getByText('destino: FEATURE')).toBeVisible()
    await expect(page.getByText('Epic sincronizada')).toBeVisible()
    await expect(page.getByText('Feature sincronizada')).toBeVisible()

    const syncButton = page.getByRole('button', { name: 'Sincronizar 0 cambios' })
    await expect(syncButton).toBeDisabled()

    await page.getByRole('checkbox', { name: 'Seleccionar issue #11' }).check()
    await page.getByRole('button', { name: 'Ver cambios (1)', exact: true }).click()
    await expect(page.getByText('SaaS: Título anterior')).toBeVisible()
    await expect(page.getByText('GitHub: Bug importado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sincronizar 1 cambios' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Importar 0 nuevos' })).toBeDisabled()

    await page.getByRole('button', { name: 'Sincronizar 1 cambios' }).click()
    await expect(page.getByText('1 elementos actualizados desde GitHub')).toBeVisible()
    expect(selectedSyncIssues).toEqual([[11]])
  })
})
