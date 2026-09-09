import { expect, test } from '@playwright/test'

test('user can download the generated Playwright spec for an HDU', async ({ page }) => {
  const storyId = 'hdu-1'

  await page.addInitScript(() => localStorage.setItem('token', 'e2e-test-token'))

  await page.route('**/api/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'user-1', email: 'e2e@example.com', name: 'E2E User', role: 'USER' } }),
    })
  })

  await page.route('**/api/user-stories', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userStories: [
          {
            id: storyId,
            displayId: 'HDU-001',
            title: 'Descargar pruebas E2E',
            description: 'Como QA quiero descargar una prueba Playwright',
            acceptanceCriteria: ['La descarga contiene una spec TypeScript'],
            priority: 'HIGH',
            storyPoints: 3,
            status: 'READY',
            dorScore: 90,
            isReady: true,
            qualityScore: 90,
            testSuite: null,
            projectId: 'project-1',
            epicId: null,
            featureId: null,
            epic: null,
            feature: null,
            createdAt: '2026-09-09T12:00:00.000Z',
          },
        ],
      }),
    })
  })

  await page.route('**/api/projects', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: [{ id: 'project-1', name: 'Proyecto QA' }] }),
    })
  })

  await page.route('**/api/epics**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ epics: [] }) })
  })

  await page.route('**/api/features**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ features: [] }) })
  })

  await page.route(`**/api/user-stories/${storyId}/playwright-spec`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ filename: 'hdu-001.spec.ts', spec: "import { test } from '@playwright/test'" }),
    })
  })

  await page.goto('/user-stories')
  await expect(page.getByRole('heading', { name: 'User Stories (HDU)' })).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  const responsePromise = page.waitForResponse(`**/api/user-stories/${storyId}/playwright-spec`)
  await page.getByRole('button', { name: 'Descargar Playwright' }).click()
  const [download, response] = await Promise.all([downloadPromise, responsePromise])

  expect(response.ok()).toBeTruthy()
  expect(download.suggestedFilename()).toBe('hdu-001.spec.ts')
})