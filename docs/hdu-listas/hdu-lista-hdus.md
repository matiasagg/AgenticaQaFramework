# HDU: Búsqueda, filtro y ordenamiento en la lista de HDUs

## Objetivo

Agregar **búsqueda, filtros y ordenamiento** a la lista de **HDUs (Historias de Usuario)** del SaaS, la lista más usada por el equipo, sin importar el modelo de trabajo (jerárquico o por etiquetas) ni el proveedor de origen.

## Contexto

- `web/src/pages/UserStoriesPage.tsx` hoy muestra la lista completa sin búsqueda, filtros ni ordenamiento configurable.
- Existe el bosquejo previo `hdu-ordenamiento-requerimientos.md` que propone orden manual (`sortOrder`/`backlogRank`) y filtros por estado, prioridad y proyecto; esta HDU debe reutilizar esas decisiones donde apliquen y no duplicar su alcance.
- Esta HDU reutiliza el componente/utilidad compartida creada en la HDU de la lista de Épicas.
- La estructura de tipos se configura en la HDU #73; el DoR de HDUs en la HDU #76.

## Alcance

1. **Búsqueda** por texto en título, descripción, identificador (`displayId`, ej. `HDU-012`), etiquetas y rama, con debounce.
2. **Filtros**: estado, prioridad, épica, feature, responsable (assignee), labels, estado de DoR (ready/no ready) y fecha de actualización; combinables.
3. **Ordenamiento**: por identificador, prioridad, story points, estado, épica/feature, fecha de creación/actualización y estado de DoR; asc/desc; orden por defecto.
4. **Soporte backend**: `q`, filtros, `sort`/`order`, `page`/`limit` en `GET /api/user-stories`, con filtrado/ordenamiento server-side y paginación.
5. **Estado de URL**: filtros y orden persistidos en query params para compartir vistas.
6. **Estados de UI**: cargando, vacío (con acción de limpiar filtros) y error; contador de resultados.
7. **Reutilización**: usar el componente/utilidad compartida; no duplicar lógica.
8. **A11y**: labels accesibles, teclado e indicación del orden activo.

## Fuera de alcance

- El orden manual tipo backlog (`sortOrder`/drag & drop) definido en `hdu-ordenamiento-requerimientos.md` (se integra aquí solo si ya existe; si no, queda pendiente aparte).
- Búsqueda global entre tipos (HDU posterior transversal).
- Las demás listas de work items (cada una con su propia HDU).

## Criterios de aceptación

1. El usuario puede buscar HDUs por título, descripción, identificador, labels o rama.
2. El usuario puede filtrar por al menos: estado, prioridad, épica, feature y responsable, combinables.
3. El usuario puede ordenar por al menos 5 campos en ambos sentidos.
4. El orden por defecto es estable; filtros y orden se conservan al recargar (URL).
5. El filtrado y ordenamiento se ejecutan en el backend con paginación.
6. Los parámetros inválidos devuelven 400 con mensaje claro o se ignoran con valor por defecto.
7. Con cero resultados se muestra estado vacío con opción de limpiar filtros.
8. La autorización sigue validando el proyecto del usuario; no se exponen HDUs de otros proyectos.
9. Las suites existentes de `userStories` siguen pasando y se añaden pruebas de los nuevos parámetros.
10. Se reutiliza el componente/utilidad compartida, sin duplicar lógica.

## Pruebas

- Unitarias: utilidad de query params y combinación de filtros.
- API: `GET /api/user-stories` con `q`, filtros, `sort`/`order`, paginación, parámetros inválidos y autorización.
- Regresión: `api/src/routes/__tests__/userStories.test.ts` y E2E existentes.
- E2E: buscar, filtrar, ordenar y recargar la página conservando el estado; verificar resultado vacío.

## Trazabilidad

- Relacionadas: HDU #73 (modelo de trabajo), HDU #76 (DoR de HDU), `hdu-ordenamiento-requerimientos.md` y las HDUs hermanas de listas por tipo de work item.
- Rama: `feature/hdu-{n}-lista-hdus`.
- Commits: `feat(lista-hdus): ...`, `test(lista-hdus): ...`.