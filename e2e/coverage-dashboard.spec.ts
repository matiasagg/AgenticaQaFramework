import { expect, Page, test } from '@playwright/test'

const project = { id: 'project-1', name: 'Proyecto QA' }

const metrics = {
  projectId: project.id,
  projectName: project.name,
  summary: {
    requirementCoverage: 75,
    designCoverage: 60,
    executionCoverage: 50,
    resultCoverage: 80,
    automationCoverage: 40,
  },
  counts: {
    totalHDUs: 4,
    hduWithTests: 3,
    hduWithoutTests: 1,
    totalTestCases: 10,
    automatedTests: 4,
    totalSuites: 4,
    executedSuites: 2,
    passedSuites: 2,
    nonExecutedCases: 2,
    failedCases: 1,
    blockedCases: 1,
  },
  caseStatusBreakdown: { nonExecuted: 2, failed: 1, blocked: 1, passed: 6 },
  hduWithoutTests: [
    {
      id: 'hdu-1',
      displayId: 'HDU-001',
      title: 'Consultar cobertura del proyecto',
      status: 'READY',
      epicName: 'Reportes',
      featureName: 'Dashboard',
    },
  ],
  epicBreakdown: [
    { id: 'epic-1', name: 'Reportes', status: 'ACTIVE', totalHDUs: 4, hduWithTests: 3, coverage: 75 },
  ],
  featureBreakdown: [
    {
      id: 'feature-1',
      name: 'Dashboard',
      epicName: 'Reportes',
      status: 'ACTIVE',
      totalHDUs: 4,
      hduWithTests: 3,
      coverage: 75,
    },
  ],
  recommendations: ['Priorizar casos para HDUs sin cobertura'],
  risks: ['Existe una HDU sin casos de prueba'],
  generatedAt: '2026-09-09T12:00:00.000Z',
}

const trend = {
  trend: [
    { date: '2026-09-07', coverage: 65 },
    { date: '2026-09-08', coverage: 75 },
  ],
}

async function mockAuthenticatedCoverage(page: Page) {
  await page.addInitScript(() => localStorage.setItem('token', 'e2e-test-token'))

  await page.route('**/api/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'user-1', email: 'e2e@example.com', name: 'E2E User', role: 'USER' } }),
    })
  })

  await page.route('**/api/projects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [project] }),
    })
  })

  await page.route(`**/api/coverage/metrics/${project.id}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(metrics) })
  })

  await page.route(`**/api/coverage/trend/${project.id}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(trend) })
  })
}

test.describe('Coverage dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedCoverage(page)
    await page.goto('/coverage')
    await expect(page.getByRole('heading', { name: 'Cobertura de Pruebas' })).toBeVisible()
  })

  test('shows the functional coverage summary and risk information', async ({ page }) => {
    await expect(page.getByText('75%', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Requerimientos' })).toBeVisible()
    await expect(page.getByText('Existe una HDU sin casos de prueba')).toBeVisible()
    await expect(page.getByText('Priorizar casos para HDUs sin cobertura')).toBeVisible()
    await expect(page.getByRole('heading', { name: /HDUs sin Casos de Prueba \(1\)/ })).toBeVisible()
  })

  test('shows epic and feature breakdowns when the breakdown tab is selected', async ({ page }) => {
    await page.getByRole('button', { name: /Desglose/ }).click()

    await expect(page.getByRole('heading', { name: 'Desglose por Épica' })).toBeVisible()
    await expect(page.getByText('Reportes', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Desglose por Feature' })).toBeVisible()
    await expect(page.getByText('Dashboard', { exact: true }).first()).toBeVisible()
  })

  test('renders historical trend and navigates to user stories without coverage', async ({ page }) => {
    await page.getByRole('button', { name: /Tendencia/ }).click()

    await expect(page.getByRole('heading', { name: 'Tendencia Histórica de Cobertura' })).toBeVisible()
    await expect(page.getByText('2026-09-07', { exact: true })).toBeVisible()
    await expect(page.getByText('2026-09-08', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: '📊 Resumen' }).click()
    await page.getByRole('button', { name: 'Ver todas las HDUs →' }).click()
    await expect(page).toHaveURL(/\/user-stories\?projectId=project-1/)
  })
})