# Estrategia de calidad con Playwright

## Propósito

Playwright cubre recorridos críticos de usuario y contratos HTTP que atraviesan varias capas de Qacelerate. No reemplaza las pruebas unitarias de Vitest ni las pruebas de integración del API.

## Pirámide de pruebas

- **Unitarias:** reglas puras, validadores y transformaciones.
- **Integración/API:** rutas, autenticación, autorización y efectos persistidos.
- **E2E:** login, navegación protegida, creación de proyectos/HDU y generación de pruebas.
- **Exploratorias:** usabilidad, accesibilidad, compatibilidad y escenarios difíciles de automatizar.

## Criterios para automatizar

1. La prueba representa un comportamiento observable y un único motivo de fallo.
2. Tiene trazabilidad a una HDU o criterio de aceptación.
3. Usa datos aislados y no depende del orden de ejecución.
4. Usa `getByRole`/`getByLabel` y assertions web-first antes que CSS/XPath.
5. No usa `waitForTimeout`, sleeps ni retries ilimitados.
6. Incluye al menos el happy path y el escenario negativo de mayor riesgo.

## Variables de entorno

- `PLAYWRIGHT_BASE_URL`: URL del frontend; por defecto `http://localhost:5173`.
- `API_BASE_URL`: URL del API para pruebas con `request`; por defecto `http://localhost:3001`.
- `E2E_EMAIL` y `E2E_PASSWORD`: credenciales de una cuenta de pruebas; nunca deben versionarse.

## Evidencia y diagnóstico

La configuración conserva trace en el primer retry, screenshot en fallos y video en fallos. Al investigar un fallo, revisar primero la aserción, el estado de datos, la red y la traza; no aumentar retries como solución.

## Comandos

- `npm run e2e:chromium`: ejecución normal en Chromium.
- `npm run e2e:ui`: ejecución interactiva.
- `npm run e2e:debug`: depuración paso a paso.
- `npm run e2e:report`: abre el reporte HTML.
