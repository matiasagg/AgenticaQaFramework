import { test, expect } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test('backend health check is available', async ({ request }) => {
  const response = await request.get(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/health`)
  expect(response.ok()).toBeTruthy()
  await expect(response.json()).resolves.toMatchObject({ status: 'healthy' })
})

test('anonymous user can reach the login page', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByLabel('Correo electrónico')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})

test('authenticated user can open the HDU workspace', async ({ page }) => {
  test.skip(!email || !password, 'Configure E2E_EMAIL and E2E_PASSWORD to run authenticated E2E tests')

  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(email!)
  await page.getByLabel('Contraseña').fill(password!)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await page.goto('/user-stories')
  await expect(page.getByRole('heading', { name: 'User Stories (HDU)' })).toBeVisible()
  await expect(page.getByRole('button', { name: '+ Nueva HDU' })).toBeVisible()
})
