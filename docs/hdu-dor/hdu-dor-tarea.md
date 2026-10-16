# HDU: DoR configurable para el tipo de trabajo Tarea

## Objetivo

Analizar y desarrollar la **configuración y ejecución del Definition of Ready (DoR)** para el tipo de trabajo **Tarea**, aplicable sea cual sea el modelo de trabajo (jerárquico o por etiquetas) y el proveedor de origen (GitHub, Azure DevOps o manual).

Esta HDU además debe resolver que el tipo **Tarea** no existe actualmente como entidad propia en el SaaS: hoy el modelo interno tiene `Epic`, `Feature` y `UserStory`, y las tareas de Azure DevOps o issues de GitHub de tipo `task` no tienen dónde representarse.

## Contexto

- No existe DoR ni modelo de Tarea en `api/prisma/schema.prisma`; la jerarquía actual termina en HDU.
- El modelo de trabajo configurable de la HDU #73 define los tipos de work item que se sincronizan; este DoR define la calidad de entrada de las tareas.
- En el modelo jerárquico, Tarea es el nivel bajo HDU; en el modelo por etiquetas, se clasifica con label `task`.

## Alcance

1. Análisis e incorporación del tipo de trabajo **Tarea** en el modelo interno (representación, relación con HDU, campos propios) si se decide darle entidad propia.
2. Esquema de criterios DoR del tipo Tarea: plantilla por defecto + criterios personalizados por proyecto.
3. Persistencia de la configuración por proyecto y tipo (activados, obligatorios, peso, plantilla).
4. Ejecución de la validación de DoR de tareas con la configuración del proyecto.
5. Exposición de resultado (score, checklist, faltantes, ready) en API y UI.
6. Trazabilidad de cada ejecución (fecha, versión de configuración, resultado).
7. Independencia del modelo/proveedor.
8. Soporte de importación/clasificación de tareas desde el proveedor cuando el tipo esté habilitado.

## Fuera de alcance

- Configuración de estructura y tipos de la HDU #73.
- Los demás tipos de trabajo (Épica, Feature, HDU, Bug), cada uno con su propia HDU.
- Automatización de ejecución de tareas; solo preparación (ready).

## Criterios de aceptación

1. El proyecto puede habilitar el tipo Tarea según el modelo de trabajo seleccionado.
2. El proyecto puede editar los criterios DoR del tipo Tarea (agregar, editar, desactivar, marcar obligatorio).
3. Existe una plantilla de DoR por defecto razonable para tareas (por ejemplo: descripción clara, dependencias, estimación, criterios de verificación) disponible antes de personalizarla.
4. La configuración es por proyecto y no afecta a otros proyectos.
5. La API de configuración valida autorización y rechaza payloads inválidos con 400 y mensaje claro.
6. El score usa criterios habilitados y pesos; los obligatorios faltantes bloquean el estado ready.
7. Una tarea importada desde el proveedor con el tipo desactivado no se sincroniza ni aparece en el tablero.
8. Cada validación registra la versión de configuración usada.
9. Las pruebas unitarias, de API y E2E cubren configuración, validación y desactivación del tipo.

## Pruebas

- Unitarias: score, obligatorios/pesos, configuración inválida, plantilla por defecto.
- API: GET/PUT configuración, autorización, aislamiento entre proyectos, 400/404, importación con tipo habilitado/deshabilitado.
- Integración: clasificación de tareas desde GitHub (label `task`) y desde el modelo jerárquico.
- Regresión: flujos existentes de importación de issues y creación de HDUs.
- E2E: editar criterios DoR de una Tarea y verificar el checklist.

## Trazabilidad

- Rama: `feature/hdu-{n}-dor-tarea`.
- Commits: `feat(dor-tarea): ...`, `test(dor-tarea): ...`.
- Relacionada con HDU #73 (modelo de trabajo).