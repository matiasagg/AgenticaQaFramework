# Feature: Generación de pruebas E2E con Playwright

**ID:** FEAT-E2E-001  
**Prioridad:** P1  
**Área:** Backend, Frontend y SDET

## Objetivo

Permitir que QA genere desde una HDU una especificación TypeScript de Playwright basada en sus criterios de aceptación, conservando la cobertura funcional de la suite y descargando el archivo desde la interfaz.

## HDUs

### HDU-E2E-001 — Generar especificación Playwright desde una HDU

**Como** QA Analyst, **quiero** generar una especificación Playwright a partir de los criterios de aceptación de una HDU, **para** iniciar pruebas automatizadas E2E con trazabilidad al requerimiento.

**Criterios de aceptación**

1. Dado un usuario autenticado y una HDU propia, cuando consulta la generación E2E, entonces el backend responde con un archivo TypeScript válido, un nombre de archivo y una prueba por criterio de aceptación.
2. El archivo generado usa `@playwright/test`, `test.describe`, `test` y `expect`, e incluye la referencia visible de la HDU.
3. Una HDU inexistente o perteneciente a otro usuario responde `404` sin exponer datos.
4. La generación no modifica la HDU ni su suite existente.

### HDU-E2E-002 — Descargar la prueba E2E desde el frontend

**Como** QA Analyst, **quiero** descargar la especificación Playwright desde la tarjeta de una HDU, **para** ejecutarla o completarla con los selectores reales del producto.

**Criterios de aceptación**

1. La tarjeta de cada HDU muestra la acción `Descargar Playwright`.
2. Al pulsar la acción, el frontend consulta el endpoint autenticado y descarga un archivo `.spec.ts` con el nombre de la HDU.
3. Mientras se genera el archivo, el botón se deshabilita y comunica el estado `Generando E2E...`.
4. Si el backend falla, se muestra un mensaje de error al usuario y se libera el estado de carga.

### HDU-E2E-003 — Cobertura y pruebas automatizadas

**Como** responsable de calidad, **quiero** validar el flujo de generación mediante pruebas automatizadas Playwright, **para** asegurar cobertura de backend y frontend.

**Criterios de aceptación**

1. La suite E2E comprueba el health check del backend.
2. La suite E2E comprueba el login y la navegación a HDUs cuando se configuran credenciales E2E.
3. Las pruebas del generador verifican cobertura de criterios y estructura Playwright.
4. Los reportes HTML de Playwright y la cobertura de Vitest se generan como artefactos locales.

## Cobertura

- **Backend:** endpoint autenticado, autorización por propietario, contenido generado y regresión del generador.
- **Frontend:** visibilidad de la acción, descarga, estado de carga y manejo de error.
- **E2E:** smoke del API y flujo de autenticación/navegación.

La especificación generada contiene marcadores `TODO` para los selectores específicos de cada producto; no inventa selectores que no estén definidos en la HDU.
