# HDU: Búsqueda, filtro y ordenamiento en la lista de Tareas

## Objetivo

Agregar **búsqueda, filtros y ordenamiento** a la lista de **Tareas** del SaaS, sin importar el modelo de trabajo (jerárquico o por etiquetas) ni el proveedor de origen.

## Contexto

- Hoy no existe una lista de Tareas: el tipo **Tarea** tampoco es una entidad propia en el SaaS (ver HDU de DoR del tipo Tarea). Esta HDU depende de que el tipo de trabajo **Tarea** exista como work item configurable (HDU #73) y de su entidad/lista base (HDU de DoR de Tarea).
- Esta HDU reutiliza el componente/utilidad compartida creada en la HDU de la lista de Épicas.

## Alcance

1. **Lista base**: asegurar la vista/lista de Tareas (o integrarla en la vista del tipo de trabajo correspondiente) como prerrequisito, coordinando con la HDU que incorpora el tipo Tarea.
2. **Búsqueda** por texto en título, descripción e identificador, con debounce.
3. **Filtros**: estado, HDU/Feature padre, responsable, prioridad y fecha de actualización; combinables.
4. **Ordenamiento**: por identificador, estado, prioridad, padre, fecha de creación/actualización y estimación; asc/desc; orden por defecto.
5. **Soporte backend**: `q`, filtros, `sort`/`order`, `page`/`limit` en el endpoint de tareas, con filtrado/ordenamiento server-side y paginación.
6. **Estado de URL**: filtros y orden persistidos en query params.
7. **Estados de UI**: cargando, vacío (con acción de limpiar filtros) y error.
8. **Reutilización**: usar el componente/utilidad compartida.
9. **A11y**: labels accesibles, teclado e indicación del orden activo.

## Fuera de alcance

- Crear la entidad Tarea si no existe (perteneciente a la HDU de DoR/Tarea), salvo la mínima necesaria para mostrar la lista.
- Búsqueda global entre tipos (HDU posterior transversal).
- Las demás listas de work items (cada una con su propia HDU).

## Criterios de aceptación

1. La lista de Tareas está disponible cuando el tipo Tarea está habilitado en el proyecto (HDU #73).
2. El usuario puede buscar Tareas por título, descripción o identificador.
3. El usuario puede filtrar por al menos: estado, padre (HDU/Feature) y responsable, combinables.
4. El usuario puede ordenar por al menos 3 campos en ambos sentidos.
5. El orden por defecto es estable; filtros y orden se conservan al recargar (URL).
6. El filtrado y ordenamiento se ejecutan en el backend con paginación.
7. Los parámetros inválidos devuelven 400 con mensaje claro o se ignoran con valor por defecto.
8. Con cero resultados se muestra estado vacío con opción de limpiar filtros.
9. La autorización sigue validando el proyecto del usuario.
10. Se reutiliza el componente/utilidad compartida, sin duplicar lógica.

## Pruebas

- Unitarias: utilidad de query params y combinación de filtros.
- API: endpoint de tareas con `q`, filtros, `sort`/`order`, paginación, parámetros inválidos y autorización.
- Integración: lista disponible solo con el tipo Tarea habilitado.
- Regresión: flujos existentes de importación y creación de work items.
- E2E: buscar, filtrar, ordenar y recargar conservando el estado.

## Trazabilidad

- Relacionadas: HDU #73 (modelo de trabajo), HDU de DoR/Tarea y las HDUs hermanas de listas por tipo de work item.
- Rama: `feature/hdu-{n}-lista-tareas`.
- Commits: `feat(lista-tareas): ...`, `test(lista-tareas): ...`.