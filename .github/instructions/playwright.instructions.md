---
applyTo: "e2e/**/*.ts,playwright.config.ts"
---

# Reglas de automatización del proyecto

- Diseña pruebas independientes, deterministas y basadas en riesgo.
- Usa locators semánticos (`getByRole`, `getByLabel`) y assertions web-first.
- No uses `waitForTimeout`, XPath ni selectores CSS frágiles.
- Usa `request` para contratos API cuando el navegador no aporte valor.
- No hardcodees secretos, tokens ni datos compartidos entre pruebas.
- Añade escenarios negativos de autenticación/autorización cuando correspondan.
- Relaciona cada prueba nueva con una HDU o criterio de aceptación.
- Ejecuta la prueba o proyecto afectado y reporta cualquier limitación del entorno.