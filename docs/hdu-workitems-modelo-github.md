# HDU: Configuración de work items del modelo de trabajo basado en Issues (GitHub)

## Objetivo

Definir y desarrollar la **configuración por proyecto de los work items del modelo de trabajo basado en Issues**, es decir, del modelo *por etiquetas* cuando la fuente es **GitHub**. La unidad de trabajo base es el **issue**: cada tipo de work item configurable (Épica, Feature, HDU, Tarea, Bug) se deriva de un issue y de sus metadatos (labels, título, milestone, estado).

Permite que cada proyecto decida, sobre sus propios issues:

- Qué tipos de work items existen y cuáles están habilitados.
- Qué labels (u otras reglas) clasifican un issue como cada tipo.
- Qué tipos participan en la sincronización y aparecen en el tablero.
- Cómo se organiza la jerarquía derivada (por ejemplo, issue `epic` contenedor de issues `feature` e `hdu`).

## Contexto

- El proveedor actual es GitHub: `api/src/services/githubIntegration.ts` y `api/src/routes/githubSync.ts`.
- Hoy la clasificación es fija: `targetType: 'EPIC' | 'FEATURE' | 'HDU' | 'BUG'` determinada por labels codificados en el código, con contenedores por defecto (`GitHub Imported Epic`, `GitHub Imported Feature`).
- La estructura general y los tipos de trabajo se configuran en la HDU #73 (modelo de trabajo y estructura por proyecto).
- El DoR de cada tipo se configura en las HDUs #74–#78.

## Alcance

1. Catálogo de work items del modelo basado en Issues: Épica, Feature, HDU, Tarea y Bug (extensible), con soporte de Pull Requests como tipo opcional.
2. Configuración por proyecto de los tipos habilitados (activar/desactivar) y su pertenencia a la sincronización.
3. Mapeo configurable de clasificación: labels por tipo (reemplazando los labels fijos actuales), con valores por defecto equivalentes al comportamiento actual.
4. Reglas de jerarquía derivada de issues: cómo un issue se asocia a otro (label de parent, referencia `#n`, milestone), y qué hacer cuando falta la relación.
5. Vista previa de importación/sincronización que muestre la clasificación propuesta por issue y los no clasificados, con razón accionable.
6. La sincronización respeta los tipos desactivados: no importa, no actualiza ni muestra esos issues en el tablero.
7. Auditoría de cambios de configuración por proyecto (qué mapeo estaba vigente en cada importación).
8. UI de configuración por proyecto (sección de modelo de trabajo) y API con autorización.

## Fuera de alcance

- La estructura general de modelos y proveedores de la HDU #73.
- El DoR de cada tipo (HDUs #74–#78).
- El conector real de Azure DevOps.
- Cambios en la API de issues de GitHub más allá de lo necesario para la clasificación.

## Criterios de aceptación

1. El proyecto puede listar los tipos de work items del modelo basado en Issues y activar/desactivar cada uno.
2. El proyecto puede editar qué label clasifica cada tipo (Épica, Feature, HDU, Tarea, Bug), conservando como defecto los labels actuales.
3. Sin personalización, la clasificación de `GET /api/github-sync/:projectId/issues` replica exactamente el comportamiento actual (`EPIC`, `FEATURE`, `HDU`, `BUG`).
4. Issues con labels de tipos desactivados aparecen como "Tipo desactivado" o se excluyen de importación según la configuración, nunca se importan silenciosamente.
5. Issues sin ningún label coincidente aparecen como "Sin clasificar" en la vista previa, con sugerencia accionable (asignar label o mapeo).
6. La jerarquía derivada de issues respeta las reglas configuradas; si falta la relación, se usa el contenedor por defecto documentado.
7. La sincronización incremental solo actualiza work items de tipos habilitados.
8. La configuración es por proyecto: cambiarla no altera la clasificación de otros proyectos.
9. La API valida autorización sobre el proyecto y rechaza configuraciones inválidas con 400 y mensaje claro.
10. Las credenciales no se exponen en respuestas ni logs; solo se usa el PAT cifrado existente.
11. Cada importación/sincronización registra la versión de configuración utilizada.

## Pruebas

- Unitarias: mapeo de labels a tipos, tipos desactivados, "Sin clasificar", reglas de jerarquía, configuración inválida, defectos equivalentes al comportamiento actual.
- API: GET/PUT configuración, autorización, aislamiento entre proyectos, preview e import respetando tipos habilitados, 400/404.
- Integración: importación de issues con distintas combinaciones de labels, issues sin labels, jerarquía por referencias, sincronización incremental.
- Regresión: `api/src/routes/__tests__/githubSync.test.ts` completo (debe seguir pasando sin cambios de comportamiento por defecto).
- E2E: configurar mapeo de labels en un proyecto, previsualizar importación y verificar clasificación, tipos desactivados y "Sin clasificar" en el tablero.
- Seguridad: permisos entre proyectos, PAT no expuesto.

## Dependencias y trazabilidad

- Relacionada con HDU #73 (modelo de trabajo y estructura por proyecto).
- HDUs #74–#78 (DoR por tipo de work item).
- `api/src/routes/githubSync.ts`, `api/src/services/githubIntegration.ts`, `web/src/pages/GitHubSyncPage.tsx`, `web/src/pages/ProjectsPage.tsx`.
- Rama: `feature/hdu-{n}-workitems-github-issues`.
- Commits: `feat(workitems-github): ...`, `test(workitems-github): ...`.