# HDU: Configuración de modelo de trabajo y estructura por proyecto

## Objetivo

Implementar una configuración de **modelo de trabajo** por proyecto que defina cómo se organizan, clasifican, sincronizan y presentan los work items en el SaaS.

Hoy el SaaS impone una jerarquía fija **Proyecto → Épica → Feature → HDU**, heredada de una estructura tipo Azure DevOps, mientras que la fuente actual de sincronización es GitHub, cuyo modelo de issues es flexible. Se necesita poder elegir y configurar ambas estructuras como opciones, definiendo a su vez el menú y las vistas que se despliegan al usuario.

## Modelos de trabajo (nombres neutros)

Los modelos se nombran por su estructura, no por la herramienta externa:

- **Jerárquico**: estructura fija de niveles `Épica → Feature → HDU → Tarea`.
- **Por etiquetas**: clasificación flexible mediante labels, títulos, milestones u otros metadatos (`epic`, `feature`, `hdu`, `task`, `bug`).
- **Combinado** (fase posterior): jerarquía base más reglas de clasificación por etiquetas.

La fuente de integración se configura por separado como **proveedor** (`GitHub`, `Azure DevOps`, `Manual`), de modo que modelo y proveedor son independientes:

- Modelo jerárquico + GitHub → posible.
- Modelo por etiquetas + GitHub → posible.
- Modelo jerárquico + Azure DevOps → posible.

## Alcance

1. Nueva configuración de trabajo por proyecto con `model` y `provider` separados.
2. Selección de los tipos de work items que se sincronizan (habilitados/deshabilitados).
3. Reglas de clasificación de tipos según el modelo (labels para el modelo por etiquetas; niveles nativos para el jerárquico).
4. Generación del menú y las vistas del SaaS a partir del modelo seleccionado.
5. Aislamiento de la configuración por proyecto (no afecta a otros proyectos).
6. Auditoría/versionado de cambios de configuración para no alterar silenciosamente datos ya importados.
7. Items sin clasificación visibles como "Sin clasificar" con razón accionable.

## Fuera de alcance (HDU posterior)

- Conector real de sincronización con Azure DevOps.
- Editor visual de modelos personalizados.

## Criterios de aceptación

1. Cada proyecto permite seleccionar un modelo de trabajo (jerárquico, por etiquetas o combinado) y un proveedor de forma independiente.
2. La selección persiste por proyecto y no afecta a otros proyectos.
3. El modelo determina qué niveles aparecen en el menú, tablero y páginas de detalle.
4. El usuario puede activar/desactivar los tipos de work item que se sincronizan.
5. El modelo por etiquetas clasifica issues mediante labels configurables (`epic`, `feature`, `hdu`, `task`, `bug`).
6. El modelo jerárquico reconoce Épica, Feature, HDU, Tarea y Bug como niveles con reglas propias.
7. La sincronización ignora los tipos desactivados y no los presenta en el tablero.
8. Los items sin clasificación no se importan silenciosamente: se muestran como "Sin clasificar" o requieren decisión del usuario.
9. Un cambio de configuración no elimina ni reasigna datos ya importados.
10. La API valida permisos sobre el proyecto correcto y expone errores claros para configuraciones inválidas.
11. Las credenciales permanecen cifradas o en secretos; nunca se exponen en respuestas, logs ni evidencias.

## Trazabilidad

- Ramas temáticas: `feature/modelo-trabajo/{id}`.
- Commits: `feat(modelo-trabajo): ...`, `test(modelo-trabajo): ...`.
- Suite de pruebas: extender `api/src/routes/__tests__/projects.test.ts`, `api/src/routes/__tests__/githubSync.test.ts` y E2E del tablero.

## Pruebas

- Unitarias: validación de perfiles, mapeo de tipos, reglas de labels, configuración incompleta.
- API: persistencia, aislamiento por proyecto, autorización, activación/desactivación de tipos, errores.
- Integración: importación de issues GitHub con diferentes labels; simulación de metadatos del modelo jerárquico.
- Regresión: importación/sincronización GitHub existente, creación de HDU, rutas y permisos.
- E2E: seleccionar modelo y verificar que menú y tablero cambian según el perfil.
- Seguridad: permisos entre proyectos, secretos no expuestos.

## Dependencias

- Modelo actual de `Project`, `Epic`, `Feature` y `UserStory` en `api/prisma/schema.prisma`.
- `githubSync` para reglas de clasificación actuales.
- Navegación declarada en `web/src/App.tsx` y layout.