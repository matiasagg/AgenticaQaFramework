import { expect, test } from '@playwright/test'

test.describe('DoR de Features y Épicas', () => {
  test('permite previsualizar y confirmar una mejora de Feature', async ({ page }) => {
    let featureName = 'Feature de autenticación'
    const featureId = 'feature-dor-1'

    page.on('dialog', (dialog) => dialog.dismiss())
    await page.addInitScript(() => localStorage.setItem('token', 'e2e-test-token'))

    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'user-1', email: 'e2e@example.com', name: 'E2E User', role: 'QA_ANALYST' } }) })
    })
    await page.route('**/api/epics', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ epics: [{ id: 'epic-1', name: 'Seguridad de la plataforma' }] }) })
    })
    await page.route('**/api/features', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ features: [{ id: featureId, name: featureName, description: 'Descripción insuficiente', epicId: 'epic-1', epic: { id: 'epic-1', name: 'Seguridad de la plataforma' }, createdAt: '2026-10-04T09:00:00.000Z' }] }),
      })
    })
    await page.route(`**/api/features/${featureId}/validate-dor`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feature: { id: featureId, name: featureName, description: 'Descripción insuficiente', epicId: 'epic-1', epic: { id: 'epic-1', name: 'Seguridad de la plataforma' }, userStories: [{ id: 'story-1' }] },
          validation: { score: 40, isReady: false, checklist: [{ id: 'description', name: 'Descripción con alcance', passed: false, suggestion: 'Agrega alcance', suggestedFix: { field: 'description', value: 'Como equipo, queremos entregar autenticación segura, para validar el acceso de los usuarios.' } }], recommendationsDetailed: [] },
        }),
      })
    })
    await page.route(`**/api/features/${featureId}/preview-dor-fixes`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ preview: { baseUpdatedAt: '2026-10-04T09:00:00.000Z', changes: [{ field: 'description', previousValue: 'Descripción insuficiente', proposedValue: 'Como equipo, queremos entregar autenticación segura, para validar el acceso de los usuarios.' }], conflicts: [], manualRecommendations: [] } }),
      })
    })
    await page.route(`**/api/features/${featureId}/apply-dor-fixes`, async (route) => {
      featureName = 'Feature de autenticación'
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feature: { id: featureId, name: featureName, description: 'Como equipo, queremos entregar autenticación segura, para validar el acceso de los usuarios.', epicId: 'epic-1', userStories: [{ id: 'story-1' }] }, validation: { score: 100, isReady: true, checklist: [], recommendationsDetailed: [] }, changedFields: ['description'] }),
      })
    })

    await page.goto('/features')
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible()
    await page.getByRole('button', { name: 'Analizar DoR' }).click()
    await expect(page.getByText('Descripción con alcance')).toBeVisible()
    await page.getByRole('checkbox', { name: 'Aplicar' }).check()
    await page.getByRole('button', { name: /Previsualizar/ }).click()
    await expect(page.getByText('Previsualización')).toBeVisible()
    await expect(page.getByText(/Después: Como equipo/)).toBeVisible()
    await page.getByRole('button', { name: 'Confirmar cambios' }).click()
    await expect(page.getByText('100%')).toBeVisible()
  })
})