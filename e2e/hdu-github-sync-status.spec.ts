import { expect, test } from '@playwright/test'

test('clears the pending GitHub sync recommendation after pushing an HDU', async ({ page }) => {
  const storyId = 'hdu-sync-1'
  let syncStatus: 'UNSYNCED' | 'SYNCED' = 'UNSYNCED'
  let pushPayload: Record<string, unknown> | null = null

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

  const story = () => ({
    id: storyId,
    displayId: 'HDU-048',
    title: 'Sincronizar cambios DoR',
    description: 'Como usuario QA, quiero publicar cambios DoR, para mantener GitHub actualizado.',
    acceptanceCriteria: ['El sistema debe publicar los cambios en GitHub'],
    priority: 'HIGH',
    storyPoints: 5,
    status: 'DOR_DONE',
    dorScore: 90,
    isReady: true,
    qualityScore: 90,
    syncStatus,
    externalSystem: 'GITHUB',
    externalId: '48',
    externalUrl: 'https://github.com/owner/repo/issues/48',
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
    createdAt: '2026-10-04T09:00:00.000Z',
    updatedAt: '2026-10-04T09:00:00.000Z',
  })

  await page.route('**/api/user-stories', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ userStories: [story()] }) })
  })
  await page.route(`**/api/user-stories/${storyId}/validate-dor`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userStory: story(),
        validation: {
          score: 90,
          isReady: true,
          checklist: [{ id: 'title', name: 'Título claro y descriptivo', passed: true, weight: 15 }],
          summary: 'DoR correcto',
          recommendations: [],
          recommendationsDetailed: [],
          syncRecommendation: syncStatus === 'UNSYNCED'
            ? { action: 'SYNC', linkedToGitHub: true, pendingChanges: true, issueNumber: '48', message: 'La HDU tiene cambios pendientes. Sincroniza el issue.' }
            : { action: 'NONE', linkedToGitHub: true, pendingChanges: false, issueNumber: '48', message: 'La HDU está sincronizada con GitHub.' },
        },
        aiAnalysis: null,
        aiError: null,
      }),
    })
  })
  await page.route(`**/api/user-stories/${storyId}/push-hdu`, async (route) => {
    pushPayload = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>
    syncStatus = 'SYNCED'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userStory: story(),
        github: { issueNumber: 48, issueUrl: 'https://github.com/owner/repo/issues/48', title: 'HDU-048 - Sincronizar cambios DoR', state: 'open' },
        syncedFields: ['title', 'body', 'labels', 'assignees'],
      }),
    })
  })

  await page.goto('/user-stories')
  await page.getByRole('button', { name: 'Validar DoR' }).click()
  await expect(page.getByText('Sincronización pendiente')).toBeVisible()

  await page.getByRole('button', { name: '⬆️ Sincronizar ahora' }).click()
  await expect(page.getByText('Sincronización pendiente')).not.toBeVisible()
  await expect(page.getByText('La HDU está sincronizada con GitHub.')).toBeVisible()
  expect(pushPayload?.syncFields).toEqual(['title', 'description', 'acceptanceCriteria', 'priority', 'storyPoints', 'labels', 'assignee', 'branchName'])
})
