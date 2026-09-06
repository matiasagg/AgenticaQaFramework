## Brief overview
  Directrices para crear y trabajar en ramas temáticas asociadas a HDUs (Historias de Usuario) o issues. Cada rama debe identificar claramente la funcionalidad que desarrolla.

## Branch naming convention
  - Formato: `feature/{hdu-id}-{nombre-corto}` o `fix/{issue-id}-{nombre-corto}`
  - El ID debe corresponder al identificador de la HDU o issue en GitHub/GitLab
  - El nombre debe ser descriptivo pero conciso (máximo 3-4 palabras)
  - Usar guiones para separar palabras, no guiones bajos
  - Todo en minúsculas

## Branch creation workflow
  - Crear la rama desde `develop` o `main` actualizada
  - Verificar que la HDU/issue existe y está en estado válido antes de crear la rama
  - Asociar el trabajo de la rama directamente al tracking de la HDU/issue
  - Al completar, crear PR con referencia a la HDU/issue

## Examples
  - `feature/hdu-001-sistema-autenticacion`
  - `feature/hdu-002-modulo-pagos`
  - `fix/issue-003-token-expirado`
  - `feature/hdu-004-dashboard-metricas`
  - `feat/hdu-005-coverage-analysis`

## Commit integration
  - Los commits dentro de la rama deben referenciar la HDU/issue
  - Formato: `feat(hdu-001): agrega validación de formularios`
  - Al mergear, usar squash merge para mantener historial limpio

## Best practices
  - Una rama por HDU/issue - no mezclar funcionalidades
  - Mantener las ramas de vida corta (máximo 1-2 días de trabajo)
  - Eliminar la rama después del merge
  - Sincronizar frecuentemente con la rama base para evitar conflictos