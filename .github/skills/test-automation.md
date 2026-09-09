# Skill: Test Automation

## Descripción
Automatización de pruebas con Playwright, Cypress y herramientas de testing modernas.

## Stack Recomendado

### Principal: Playwright
```bash
npm init playwright@latest
```

### Estructura de Proyecto
```
tests/
├── e2e/                    # Tests end-to-end
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── register.spec.ts
│   └── checkout/
│       └── checkout.spec.ts
├── integration/            # Tests de integración
│   └── api/
│       └── users.spec.ts
├── fixtures/               # Datos de prueba
│   └── users.ts
├── pages/                  # Page Objects
│   ├── LoginPage.ts
│   └── CheckoutPage.ts
└── utils/                  # Utilidades
    └── helpers.ts
```

## Patrones de Testing

### Page Object Model
```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email"]');
    this.passwordInput = page.locator('[data-testid="password"]');
    this.submitButton = page.locator('[data-testid="login-submit"]');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### Test con Page Object
```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Login', () => {
  test('usuario puede login con credenciales validas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('test@example.com', 'password123');
    
    await expect(page).toHaveURL('/dashboard');
  });

  test('muestra error con credenciales invalidas', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('wrong@example.com', 'wrongpass');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });
});
```

## Configuracion Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['json', { outputFile: 'results.json' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
  ],
});
```

## API Testing

```typescript
// tests/integration/api/users.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Users API', () => {
  test('GET /api/users retorna lista de usuarios', async ({ request }) => {
    const response = await request.get('/api/users');
    expect(response.ok()).toBeTruthy();
    
    const users = await response.json();
    expect(users.length).toBeGreaterThan(0);
  });

  test('POST /api/users crea nuevo usuario', async ({ request }) => {
    const newUser = { name: 'Test', email: 'test@example.com' };
    const response = await request.post('/api/users', { data: newUser });
    
    expect(response.status()).toBe(201);
  });
});
```

## Comandos Utiles

```bash
# Ejecutar todos los tests
npx playwright test

# Ejecutar tests especificos
npx playwright test tests/e2e/auth/

# Ejecutar en modo UI (debug)
npx playwright test --ui

# Ejecutar en modo debug
npx playwright test --debug

# Generar reporte
npx playwright show-report

# Ejecutar en CI
npx playwright test --project=chromium
```

## Mejores Practicas

1. **Selectores**: Prioriza `getByRole` y `getByLabel`; usa `data-testid` como contrato explícito de testabilidad
2. **Assertions**: Prefiere assertions web-first (`toBeVisible`, `toHaveText`, `toHaveURL`)
3. **Sincronización**: No uses `waitForTimeout`; espera estados observables o respuestas de red relevantes
4. **Fixtures**: Reutiliza autenticación y datos mediante fixtures, sin compartir estado mutable entre tests
5. **Aislamiento**: Cada test prepara sus datos y puede ejecutarse solo o en paralelo
6. **API**: Prueba contratos y reglas de negocio con `request` sin abrir navegador cuando sea suficiente
7. **CI**: Usa retries limitados, `forbidOnly`, artefactos de diagnóstico y un proyecto estable de Chromium
8. **Flakiness**: Investiga trazas, screenshots y logs; no ocultes fallos con retries ilimitados
9. **Cobertura**: Incluye happy path, validaciones, autorización y el riesgo negativo más importante
10. **Reportes**: Usa HTML reporter y conserva artefactos solo en fallos o retries