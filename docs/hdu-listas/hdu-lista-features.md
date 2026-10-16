# HDU: Búsqueda, filtro y ordenamiento en la lista de Features

## Objetivo

Agregar **búsqueda, filtros y ordenamiento** a la lista de **Features** del SaaS, para localizar y organizar features rápidamente sin importar el modelo de trabajo (jerárquico o por etiquetas) ni el proveedor de origen.

## Contexto

- `web/src/pages/FeaturesPage.tsx` hoy muestra la lista completa sin búsqueda, filtros ni ordenamiento configurable.
- Esta HDU reutiliza el componente/utilidad compartida que se crea en la HDU de la lista de Épicas (misma familia de HDUs por tipo de work item) en lugar de duplicar lógica.
- La estructura de tipos se configura en la HDU #73; el DoR de Features en la HDU #75.

## Alcance

1. **Búsqueda** por texto en título, descripción e identificador, con debounce.
2. **Filtros**: estado (`DRAFT`, `IN_PROGRESS`, `COMPLETED`), épica padre, estado de DoR (ready/no ready), fecha de actualización y cantidad de HDUs asociadas.
3. **Ordenamiento**: por nombre, estado, épica, fecha de creación/actualización, número de HDUs y estado de DoR; asc/desc; orden por defecto.
4. **Soporte backend**: `q`, filtros, `sort`/`order`, `page`/`limit` en `GET /api/features`, con filtrado/ordenamiento server-side y paginación.
5. **Estado de URL**: filtros y orden persistidos en query params.
6. **Estados de UI**: cargando, vacío (con acción de limpiar filtros) y error.
7. **Reutilización**: usar el componente/utilidad compartida creada en la HDU de Épicas.
8. **A11y**: labels accesibles, teclado e indicación del orden activo.

## Fuera de alcance

- Reestructurar la vista de Features o su modelo de datos.
- Búsqueda global entre tipos (HDU posterior transversal).
- Las demás listas de work items (cada una con su propia HDU).

## Criterios de aceptación

1. El usuario puede buscar Features por texto (título, descripción o identificador).
2. El usuario puede filtrar por al menos: estado, épica y estado de DoR, combinables.
3. El usuario puede ordenar por al menos 3 campos en ambos sentidos.
4. El orden por defecto es estable; filtros y orden se conservan al recargar (URL).
5. El filtrado y ordenamiento se ejecutan en el backend con paginación.
6. Los parámetros inválidos devuelven 400 con mensaje claro o se ignoran con valor por defecto.
7. Con cero resultados se muestra estado vacío con opción de limpiar filtros.
8. La autorización sigue validando el proyecto del usuario.
9. Las suites existentes de `features` siguen pasando y se añaden pruebas de los nuevos parámetros.
10. Se reutiliza el componente/utilidad compartida, sin duplicar lógica.

## Pruebas

- Unitarias: utilidad de query params y combinación de filtros.
- API: `GET /api/features` con `q`, filtros, `sort`/`order`, paginación, parámetros inválidos y autorización.
- Regresión: `api/src/routes/__tests__/features.test.ts` y E2E existentes.
- E2E: buscar, filtrar, ordenar y recargar la página conservando el estado.

## Trazabilidad

- Relacionadas: HDU #73 (modelo de trabajo), HDU #75 (DoR de Feature) y las HDUs hermanas de listas por tipo de work item.
- Rama: `feature/hdu-{n}-lista-features`.
- Commits: `feat(lista-features): ...`, `test(lista-features): ...`.