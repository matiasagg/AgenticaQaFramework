## Brief overview
  Directrices para la creación de commits temáticos y organizados en el proyecto. Los commits deben ser atómicos, descriptivos y agrupados por funcionalidad.

## Commit message format
  - Usar prefijos temáticos: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, `style:`, `ci:`
  - Escribir mensajes en español, descriptivos y concisos
  - Incluir el scope entre paréntesis cuando aplique: `feat(agents):`, `fix(auth):`, `test(dor-validator):`
  - Agregar descripción detallada en el cuerpo del commit cuando el cambio lo requiera

## Thematic commit rules
  - Un commit = una funcionalidad o cambio lógico completo
  - No mezclar cambios no relacionados en un mismo commit
  - Agrupar cambios pequeños relacionados bajo un commit temático
  - Commits de features nuevos deben incluir: schema + rutas + frontend + tests cuando aplique

## Examples
  - `feat(agents): agrega CRUD completo de agentes IA con formulario y tarjetas`
  - `fix(auth): corrige middleware de autenticación para tokens expirados`
  - `chore: migra de yarn a npm, actualiza lockfiles y scripts`
  - `test(dor-validator): agrega tests unitarios para validación DoR`
  - `refactor(schema): actualiza modelos Prisma con nuevas relaciones Epic-Feature-TestPlan`

## When to commit
  - Al completar una funcionalidad o sub-funcionalidad
  - Al corregir un bug específico
  - Al finalizar una sesión de trabajo significativa
  - Antes de cambiar de contexto o funcionalidad