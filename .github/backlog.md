# Roadmap del proyecto: SaaS de QA con IA

## Estado de sincronización (2026-09-06)
Este backlog estaba desactualizado respecto al código real del repositorio. La validación actual confirma que el proyecto ya tiene una base funcional avanzada en backend y frontend, pero aún no está cerrado el modelo operativo del flujo de trabajo de HDUs y la sincronización con el tablero externo.

Se ha identificado una diferencia clave:
- El repo ya implementa CRUD principal, dashboard, agentes, bugs, tests, cobertura, planes y GitHub sync.
- El backlog antiguo seguía describiendo un estado “ideal” más que el estado real del producto.
- Faltan dos capas críticas: (1) un ciclo de vida formal para HDUs y (2) una sincronización real entre tablero/backlog y el SaaS QA.

---

## Visión actualizada
Desarrollar un SaaS de QA con IA que funcione como “sistema operativo del trabajo de calidad”:
- registrar proyectos y usuarios
- gestionar historias de usuario de negocio y calidad
- sincronizar elementos con GitHub o Azure DevOps
- evaluar automáticamente el Definition of Ready (DoR)
- recomendar mejoras y aplicar cambios sobre la HDU
- avanzar la HDU hacia desarrollo solo cuando cumple calidad y criterios de entrega
- mantener trazabilidad histórica sin generar un backlog infinito de duplicados

---

## Objetivo del MVP real
El MVP debe permitir:
- registrar usuarios y proyectos
- crear HDUs y clasificarlas por estado
- sincronizar la HDU con un backlog externo
- evaluar DoR y score de la HDU
- aplicar recomendaciones de IA sobre redacción, criterios, riesgos y prioridad
- mover la HDU a “Ready for development” cuando cumple la calidad mínima
- mantener historial evolutivo de la HDU y su relación con issues/tablero

---

## Fase 0 - Gobernanza y sincronización del backlog

### Epic 0: Sincronización tablero / backlog / SaaS QA
- Unificar la fuente de verdad de trabajo entre GitHub/Azure y el SaaS
- Mapear cada elemento del tablero a una HDU o item interno del SaaS
- Evitar duplicados infinitos por creación manual repetida de registros
- Mantener un historial de cambios por estado y por agente/usuario
- Definir reglas de sincronización bidireccional y de conflicto

### Subtareas
- Definir modelo de relación: Project -> Epic -> User Story / Issue / Task
- Mapear campos: title, status, assignee, labels, priority, reporter, links, tags
- Definir políticas de actualización: si el cambio es originado en GitHub, sincronizar al SaaS; si es originado en SaaS, reflejar en GitHub/Azure cuando corresponda
- Registrar auditoría de sincronización: timestamp, origen, usuario, diferencia aplicada
- Definir reglas de no duplicación: “same external id” y “same canonical key”

### Criterio de salida
- Un item del tablero externo y su HDU interna tienen relación única
- El estado cambia en ambos lados según la política definida
- El historial no genera elementos infinitos ni duplicados por sincronización repetida

---

## Fase 1 - Base funcional del producto

### Epic 1: Infraestructura base
- Backend Node.js + TypeScript
- Frontend React + Vite + TypeScript
- PostgreSQL + Prisma
- Configuración de entorno y variables
- CI base con GitHub Actions
- Estructura de proyectos y entidades

### Epic 2: Autenticación y organización
- Registro e inicio de sesión
- JWT y sesión por usuario
- CRUD de proyectos
- Asociar usuarios a proyectos
- Roles y permisos básicos

### Epic 3: Gestión de QA del producto
- CRUD de agentes IA
- CRUD de bugs
- CRUD de tests
- CRUD de epics y planos de prueba
- CRUD de HDUs
- Dashboard principal con métricas

### Estado actual verificado
Estas áreas ya están implementadas en el código actual:
- [api/src/routes/auth.ts](api/src/routes/auth.ts)
- [api/src/routes/projects.ts](api/src/routes/projects.ts)
- [api/src/routes/userStories.ts](api/src/routes/userStories.ts)
- [api/src/routes/bugs.ts](api/src/routes/bugs.ts)
- [api/src/routes/tests.ts](api/src/routes/tests.ts)
- [api/src/routes/coverage.ts](api/src/routes/coverage.ts)
- [api/src/routes/plans.ts](api/src/routes/plans.ts)
- [api/src/routes/agents.ts](api/src/routes/agents.ts)
- [api/src/index.ts](api/src/index.ts)
- [web/src/pages/Dashboard.tsx](web/src/pages/Dashboard.tsx)

---

## Fase 2 - Modelo de estados de HDU y flujo de calidad

### Epic 4: Ciclo de vida de la HDU dentro del SaaS
La HDU no debe mantenerse como “lista de tareas sin estado”. Debe tener un ciclo de vida formal para evitar backlog infinito y mejorar trazabilidad.

### Estados propuestos
- Nueva
- En análisis
- En refinamiento
- DoR in progress
- DoR done
- Ready for development
- In development
- Ready for QA
- DoD in progress
- DoD done
- Terminada
- Bloqueada
- Cancelada
- Archivada

### Reglas de transición
- Nueva -> En análisis
- En análisis -> En refinamiento
- En refinamiento -> DoR in progress
- DoR in progress -> DoR done
- DoR done -> Ready for development
- Ready for development -> In development
- In development -> Ready for QA
- Ready for QA -> DoD in progress
- DoD in progress -> DoD done
- DoD done -> Terminada
- Cualquier estado puede pasar a Bloqueada o Cancelada
- Terminada -> Archivada

### Criterios de calidad por estado
- Nueva: título y contexto mínimo
- En refinamiento: objetivo y alcance definido
- DoR in progress: criterios de aceptación, prioridad, estimación, testabilidad y riesgo revisados
- DoR done: score mínimo alcanzado y validación IA aprobada
- Ready for development: la tarea puede pasar al equipo de implementación
- DoD done: validado funcionalmente, documentado, probado y desplegable

---

## Fase 3 - Sincronización de tablero externo y SaaS QA

### Epic 5: Integración de backlog externo con el operario del QA
El backlog externo (GitHub/Azure DevOps) y el SaaS deben sincronizarse, pero con una fuente única de verdad por item.

### Estrategia recomendada
1. Cada item externo tiene un identificador único e.id
2. Cada HDU SaaS tiene un campo `externalSystem`, `externalId`, `externalUrl`
3. Si ya existe una HDU con ese `externalId`, se actualiza en lugar de duplicarse
4. Si el item cambia de estado en GitHub/Azure, el SaaS actualiza el estado interno
5. Si la HDU cambia de estado dentro del SaaS, se sincroniza de regreso al backlog externo si la política lo permite
6. La sincronización debe ser auditada y de conflicto controlado

### Mapeo sugerido
- GitHub issue / Azure work item -> HDU interna
- Epic / feature -> Epic SaaS
- Task -> HDU o subtask
- PR / deploy -> evidencia de cierre y validación DoD

### Reglas de sincronización
- Solo se crean nuevos registros si no existe el `externalId`
- El cierre de la HDU en SaaS debe reflejar un update de estado en el sistema externo
- El cambio de estado de un item externo no debe crear una nueva HDU si ya existe una con el mismo identificador
- Los estados deben mapearse por equivalencia para evitar inconsistencias

---

## Fase 4 - IA recomendando y aplicando mejoras sobre la HDU

### Epic 6: IA copiloto de calidad para HDUs
La IA debe no solo analizar la HDU, sino recomendar mejoras y, en ciertos casos, aplicar cambios aprobados.

### Capacidades esperadas
- Revisar claridad del título
- Detectar ambigüedades y duplicaciones
- Sugerir criterios de aceptación faltantes
- Proponer story points y prioridad
- Recomendar riesgos y dependencias
- Detectar pruebas necesarias para el DoD
- Sugerir cambio de estado cuando cumple criterios

### Flujo de IA
1. La HDU entra al proceso de validación
2. La IA calcula un score de calidad: claridad, completitud, testabilidad, riesgo, prioridad, DoR
3. Si el score está por debajo del umbral, ofrece recomendaciones
4. El usuario o el equipo aprueba y aplica cambios
5. Cuando el score alcanza el umbral, la HDU pasa a `DoR done`
6. Luego se habilita el paso a `Ready for development`

### Política recomendada
- La IA puede sugerir cambios, pero no debe imponerlos sin revisión humana
- Cambios automáticos solo en estados de baja riesgo o con aprobaciones explícitas
- El historial de cambios debe quedar registrado con autor, fecha y motivo

---

## Fase 5 - Automatización y pruebas reales

### Epic 7: Ejecución con Playwright y evidencias
- Integrar Playwright como motor principal de ejecución
- Generar runner de pruebas desde backend
- Guardar logs, screenshots, videos y resultados
- Manejar colas y workers
- Crear detalle de ejecución por proyecto
- Mostrar historial por HDU y por release

### Epic 8: Reportes y observabilidad
- Dashboard ejecutivo por proyecto
- Detalle de fallos y causa probable
- Recomendaciones de cobertura
- Indicadores de calidad por equipo
- Alertas por regresión

### Criterio de salida
- Un usuario puede activar una ejecución real de pruebas para una HDU o suite
- El sistema guarda evidencias y deja trazabilidad de ejecución
- El item puede avanzar de `Ready for QA` a `DoD done` si la prueba lo valida

---

## Fase 6 - Producción y operación

### Epic 9: Seguridad, despliegue y estabilidad
- Validación de requests y protección de endpoints
- Permisos por rol y proyecto
- Rate limiting y logging estructurado
- Observabilidad y healthchecks
- Despliegue y configuración de entorno productivo
- Backups y monitoreo

---

## Priorización actualizada

### P0 - Crítico / MVP real
- HDU lifecycle formal con estados
- Sincronización tablero / SaaS QA
- DoR validation workflow
- IA recomendando y aplicando cambios sobre HDU
- Ready for development / DoD flow
- Dashboard principal y QA metrics

### P1 - Muy valioso
- Ejecución real de pruebas con Playwright
- Guardado de logs y evidencias
- Reportes de ejecución y completitud
- Integración con GitHub/Azure
- Auditoría de cambios y trazabilidad

### P2 - Diferenciador
- Recomendación de cobertura continúa
- Resúmenes ejecutivos por equipo
- Predicción de riesgos y defectos
- Integración con despliegues y releases

---

## Backlog recomendado (sprint sugerido)

### Sprint 1: gobernanza y flujo de calidad
- Definir estados de HDU y transiciones
- Definir modelo de sincronización externo/sistema
- Implementar relación `externalId` y auditoría
- Crear validación DoR con score y recomendaciones

---

### hdu-008: Sincronización GitHub → HDUs
- Issue: https://github.com/matiasagg/AgenticaQaFramework/issues/21
- PR relacionado: https://github.com/matiasagg/AgenticaQaFramework/pull/20

Descripción: Implementar importación de issues desde GitHub como HDUs, endpoints de preview/import, listado de ramas/PRs y asociación de ramas/PRs a HDUs. Debe evitar duplicados usando `externalId` y auditar las importaciones.

Estado: issue creada y PR abierto; falta validar pruebas e integración bidireccional.

### Sprint 2: IA y priorización
- IA que revise y recomiende cambios sobre la HDU
- Aprobación de cambios por usuario
- Paso automático de `DoR done` a `Ready for development`
- Historial de evolución de la HDU

### Sprint 3: ejecución y evidencias
- Playwright runner y resultados reales
- Logs, screenshots y video
- Cierre de DoD y estado `Terminada`

### Sprint 4: producción
- Seguridad, observabilidad, despliegue y hardening

---

## Principio clave para evitar backlog infinito
El backlog no debe crecer como una lista interminable de “nuevas HDUs” creadas cada vez que cambia el estado. La regla debe ser:
- una HDU = un item de trabajo único
- el estado cambia en el tiempo
- la sincronización no duplica ni recrea registros
- el historial de cambios queda en auditoría, no como nuevo item

Esto convierte el flujo de trabajo en un sistema dinámico y trazable, en lugar de una pila acumulativa sin control.