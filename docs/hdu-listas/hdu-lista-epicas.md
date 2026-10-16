# HDU: Búsqueda, filtro y ordenamiento en la lista de Épicas

## Objetivo

Agregar **búsqueda, filtros y ordenamiento** a la lista de **Épicas** del SaaS, para que el usuario pueda localizar y organizar épicas rápidamente sin importar el modelo de trabajo (jerárquico o por etiquetas) ni el proveedor de origen.

## Contexto

- `web/src/pages/EpicsPage.tsx` hoy muestra la lista completa sin búsqueda, filtros ni ordenamiento configurable.
- No existe un componente reutilizable de tabla/lista filtrable; cada página maneja su propio estado. Esta HDU debe iniciar un patrón compartido reutilizable por el resto de tipos de work items (HDUs #81–#84: Feature, HDU, Tarea, Bug).
- La estructura de tipos se configura en la HDU #73; el DoR de Épicas en la HDU #74.

## Alcance

1. **Búsqueda** por texto en título, descripción e identificador (displayId/número), con debounce.
2. **Filtros**: estado (`PLANNING`, `IN_PROGRESS`, `COMPLETED`, `ARCHIVED`), estado de DoR (ready/no ready), fecha de actualización y, si aplica, cantidad de features/HDUs.
3. **Ordenamiento**: por nombre, estado, fecha de creación/actualización, número de elementos y estado de DoR; asc/desc; orden por defecto.
4. **Soporte backend**: parámetros de consulta `q`, `filter`, `sort`, `order`, `page`/`limit` en `GET /api/epics`, con filtrado/ordenamiento server-side y paginación.
5. **Estado de URL**: filtros y orden persistidos en query params para compartir/restaurar vistas.
6. **Estados de UI**: cargando, vacío (con mensaje y acción de limpiar filtros), error.
7. **Componente compartido**: extraer la lógica de búsqueda/filtro/orden a una utilidad o componente reutilizable (base para las demás listas).
8. **A11y**: labels accesibles, soporte de teclado, indicación visual del orden activo.

## Fuera de alcance

- Reestructurar la vista de Épicas o su modelo de datos.
- Búsqueda global entre tipos ( HDU posterior transversal).
- Las demás listas de work items (cada una con su propia HDU).

## Criterios de aceptación

1. El usuario puede buscar Épicas por texto y ver resultados que coinciden en título, descripción o identificador.
2. El usuario puede filtrar por al menos: estado y estado de DoR, combinables entre sí.
3. El usuario puede ordenar la lista por al menos 3 campos en ambos sentidos (asc/desc).
4. El orden por defecto es estable y documentado; al recargar la página se conservan filtros y orden (URL).
5. El filtrado y ordenamiento se ejecutan en el backend con paginación; la lista no carga todos los registros para filtrar en cliente.
6. Los parámetros inválidos devuelven 400 con mensaje claro o se ignoran con valor por defecto sin romper la vista.
7. Con cero resultados, se muestra un estado vacío con opción de limpiar filtros.
8. La autorización sigue validando el proyecto del usuario; no se exponen datos de otros proyectos.
9. Las suites existentes de `epics` siguen pasando y se añaden pruebas de los nuevos parámetros.
10. La solución usa el componente/utilidad compartida, sin duplicar lógica en la página.

## Pruebas

- Unitarias: utilidad de construcción de query params y combinación de filtros.
- API: `GET /api/epics` con `q`, filtros, `sort`/`order`, paginación, parámetros inválidos y autorización.
- Regresión: `api/src/routes/__tests__/epics.test.ts` y E2E existentes.
- E2E: buscar, filtrar, ordenar y recargar la página conservando el estado.

## Trazabilidad

- Relacionadas: HDU #73 (modelo de trabajo), HDU #74 (DoR de Épica), HDUs #81–#84 (listas de los demás tipos).
- Rama: `feature/hdu-{n}-lista-epicas`.
- Commits: `feat(lista-epicas): ...`, `test(lista-epicas): ...`.