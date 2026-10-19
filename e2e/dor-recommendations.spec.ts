import { expect, test } from '@playwright/test'

test.describe('HDU-001: aplicar recomendaciones DoR', () => {
  test('previsualiza y confirma una mejora sin sobrescribir campos no relacionados', async ({ page }) => {
    const storyId = 'hdu-dor-1'
    let storyPoints: number | null = null

    page.on('dialog', (dialog) => dialog.dismiss())
    await page.addInitScript(() => localStorage.setItem('token', 'e2e-test-token'))

    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'user-1', email: 'e2e@example.com', name: 'E2E User', role: 'QA_ANALYST' } }),
      })
    })

    await page.route('**/api/projects', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [{ id: 'project-1', name: 'Proyecto QA' }] }) })
    })
    await page.route('**/api/epics**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ epics: [] }) })
    })
    await page.route('**/api/features**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ features: [] }) })
    })
    await page.route('**/api/test-suites**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ suites: [] }) })
    })

    const buildStory = () => ({
      id: storyId,
      displayId: 'HDU-001',
      title: 'Historia de usuario para aplicar DoR',
      description: 'Como usuario QA, quiero aplicar una mejora DoR, para validar el resultado de forma segura.',
      acceptanceCriteria: ['El sistema debe mostrar el preview de cambios'],
      priority: 'HIGH',
      storyPoints,
      status: storyPoints === null ? 'DOR_IN_PROGRESS' : 'DOR_DONE',
      dorScore: storyPoints === null ? 90 : 100,
      isReady: storyPoints !== null,
      qualityScore: storyPoints === null ? 90 : 100,
      syncStatus: 'UNSYNCED',
      externalSystem: null,
      projectId: 'project-1',
      epicId: null,
      featureId: null,
      epic: null,
      feature: null,
      testSuite: null,
      technicalNotes: [],
      definitionOfDone: [],
      evidences: [],
      dependencies: [],
      createdAt: '2026-09-29T09:00:00.000Z',
      updatedAt: storyPoints === null ? '2026-09-29T09:00:00.000Z' : '2026-09-29T09:01:00.000Z',
    })

    await page.route('**/api/user-stories', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ userStories: [buildStory()] }) })
    })

    await page.route(`**/api/user-stories/${storyId}/validate-dor**`, async (route) => {
      const passed = storyPoints !== null
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userStory: buildStory(),
          validation: {
            score: passed ? 100 : 90,
            isReady: passed,
            checklist: [
              { id: 'storyPoints', name: 'Story points definidos', description: 'Story points', passed, weight: 10, suggestion: passed ? undefined : 'Asigna story points usando Fibonacci.', suggestedFix: passed ? undefined : { field: 'storyPoints', value: 5 } },
            ],
            summary: passed ? 'DoR completo' : 'DoR requiere mejoras',
            recommendations: passed ? [] : ['Asigna story points usando Fibonacci.'],
            recommendationsDetailed: passed ? [] : [{ checkId: 'storyPoints', checkName: 'Story points definidos', message: 'Asigna story points usando Fibonacci.', source: 'rules', suggestedFix: { field: 'storyPoints', value: 5 } }],
            syncRecommendation: { action: 'NONE', linkedToGitHub: false, pendingChanges: false, message: 'Sin integración.' },
          },
          aiAnalysis: null,
          aiError: null,
        }),
      })
    })

    await page.route(`**/api/user-stories/${storyId}/preview-dor-fixes`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          userStory: buildStory(),
          preview: {
            baseUpdatedAt: '2026-09-29T09:00:00.000Z',
            changes: [{ field: 'storyPoints', previousValue: null, proposedValue: 5, recommendationIds: ['storyPoints:Asigna story points usando Fibonacci.'] }],
            conflicts: [],
            manualRecommendations: [],
            selectedRecommendations: [{ checkId: 'storyPoints', checkName: 'Story points definidos', message: 'Asigna story points usando Fibonacci.', source: 'rules', suggestedFix: { field: 'storyPoints', value: 5 } }],
            pendingRecommendations: [],
            changedFields: ['storyPoints'],
          },
        }),
      })
    })

    await page.route(`**/api/user-stories/${storyId}/apply-dor-fixes`, async (route) => {
      storyPoints = 5
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ userStory: buildStory(), changedFields: ['storyPoints'], appliedCount: 1, pendingRecommendations: [], syncStatus: 'UNSYNCED' }),
      })
    })

    await page.goto('/user-stories')
    await expect(page.getByRole('heading', { name: 'User Stories (HDU)' })).toBeVisible()
    await page.getByRole('button', { name: 'Validar DoR' }).click()
    await expect(page.getByText('Story points definidos')).toBeVisible()

    await page.getByRole('checkbox', { name: 'Aplicar' }).check()
    await page.getByRole('button', { name: /Previsualizar/ }).click()
    await expect(page.getByText('Previsualización de cambios')).toBeVisible()
    await expect(page.getByText(/Después: 5/)).toBeVisible()

    await page.getByRole('button', { name: 'Confirmar cambios seleccionados' }).click()
    await expect(page.getByText('100%', { exact: true })).toBeVisible()
    await expect(page.getByText('✓ Lista para pruebas')).toBeVisible()
  })
})