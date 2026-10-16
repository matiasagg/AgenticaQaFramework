# HDU: Búsqueda, filtro y ordenamiento en la lista de Bugs

## Objetivo

Agregar **búsqueda, filtros y ordenamiento** a la lista de **Bugs** del SaaS, para localizar y priorizar defectos rápidamente sin importar el modelo de trabajo (jerárquico o por etiquetas) ni el proveedor de origen.

## Contexto

- `web/src/pages/BugsPage.tsx` (y las métricas derivadas en `Dashboard.tsx`) hoy consumen la lista completa, sin búsqueda, filtros ni ordenamiento configurable.
- Esta HDU reutiliza el componente/utilidad compartida creada en la HDU de la lista de Épicas, en lugar de duplicar lógica.
- La estructura de tipos se configura en la HDU #73; el DoR de Bugs en la HDU #78.

## Alcance

1. **Búsqueda** por texto en título, descripción, identificador e ID de GitHub, con debounce.
2. **Filtros**: estado (`OPEN`, `IN_PROGRESS`, `RESOLVED`...), severidad (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), prioridad, responsable, HDU/Feature relacionada y fecha de creación/actualización; combinables.
3. **Ordenamiento**: por identificador, severidad, estado, prioridad, fecha de creación/actualización y DoR; asc/desc; orden por defecto.
4. **Soporte backend**: `q`, filtros, `sort`/`order`, `page`/`limit` en `GET /api/bugs`, con filtrado/ordenamiento server-side y paginación.
5. **Estado de URL**: filtros y orden persistidos en query params.
6. **Estados de UI**: cargando, vacío (con acción de limpiar filtros) y error; contador de resultados.
7. **Reutilización**: usar el componente/utilidad compartida.
8. **A11y**: labels accesibles, teclado e indicación del orden activo.

## Fuera de alcance

- Cambiar la clasificación de severidad ni el flujo de estados de bugs.
- Búsqueda global entre tipos (HDU posterior transversal).
- Las demás listas de work items (cada una con su propia HDU).

## Criterios de aceptación

1. El usuario puede buscar bugs por título, descripción, identificador o ID de GitHub.
2. El usuario puede filtrar por al menos: estado, severidad y prioridad, combinables.
3. El usuario puede ordenar por al menos 4 campos en ambos sentidos.
4. El orden por defecto es estable; filtros y orden se conservan al recargar (URL).
5. El filtrado y ordenamiento se ejecutan en el backend con paginación.
6. Los parámetros inválidos devuelven 400 con mensaje claro o se ignoran con valor por defecto.
7. Con cero resultados se muestra estado vacío con opción de limpiar filtros.
8. La autorización sigue validando el proyecto del usuario; no se exponen bugs de otros proyectos.
9. Las suites existentes de `bugs` siguen pasando y se añaden pruebas de los nuevos parámetros.
10. Se reutiliza el componente/utilidad compartida, sin duplicar lógica.

## Pruebas

- Unitarias: utilidad de query params y combinación de filtros.
- API: `GET /api/bugs` con `q`, filtros, `sort`/`order`, paginación, parámetros inválidos y autorización.
- Regresión: `api/src/routes/__tests__/bugs.test.ts` y E2E existentes.
- E2E: buscar, filtrar por severidad, ordenar y recargar la página conservando el estado.

## Trazabilidad

- Relacionadas: HDU #73 (modelo de trabajo), HDU #78 (DoR de Bug) y las HDUs hermanas de listas por tipo de work item.
- Rama: `feature/hdu-{n}-lista-bugs`.
- Commits: `feat(lista-bugs): ...`, `test(lista-bugs): ...`.