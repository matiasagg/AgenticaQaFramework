# Workflow de Desarrollo Orquestado por Agentes

## Visión General

El desarrollo del SaaS de QA será orquestado autónomamente por agentes de IA que colaboran entre sí para crear Historias de Usuario (HDUs), asignar tareas, implementar funcionalidades y validar resultados. Cada agente cumple un rol específico y se comunica con otros agentes para avanzar el proyecto de manera incremental.

## Arquitectura de Agentes para el Desarrollo

### Agentes Principales

1. **Product Owner Agent (POA)**
   - Responsable de crear y priorizar HDUs
   - Define criterios de aceptación
   - Prioriza el backlog basándose en valor de negocio
   - Archivo: `agents/product-owner.md`

2. **Tech Lead Agent (TLA)**
   - Diseña arquitectura técnica
   - Crea ADRs (Architecture Decision Records)
   - Asigna HDUs a agentes de desarrollo
   - Revisa código generado por otros agentes
   - Archivo: `agents/tech-lead.md`

3. **Fullstack Developer Agent (FDA)**
   - Implementa frontend (React, Tailwind)
   - Implementa backend (Express, Prisma)
   - Crea integraciones con servicios externos
   - Archivo: `agents/dev-fullstack.md`

4. **SDET Agent (SDET)**
   - Crea tests automatizados (unitarios, integración, E2E)
   - Valida funcionalidad implementada por FDA
   - Genera reportes de cobertura
   - Archivo: `agents/sdet.md`

5. **QA Engineer Agent (QAE)**
   - Valida criterios de aceptación de HDUs
   - Reporta bugs usando BugReporterAgent
   - Verifica calidad del producto
   - Archivo: `agents/qa-engineer.md`

6. **DevOps Agent (DOA)**
   - Configura CI/CD pipelines
   - Gestiona infraestructura
   - Deploy a staging/producción
   - Archivo: `agents/devops.md`

## Flujo de Trabajo Autónomo

### Fase 1: Creación de HDUs (POA + TLA)

```
POA crea HDU → TLA revisa factibilidad técnica → POA prioriza → HDU lista para desarrollo
```

**Proceso:**
1. POA analiza el implementation_plan.md
2. POA descompone en HDUs atómicas con criterios de aceptación claros
3. TLA revisa cada HDU y añade notas técnicas
4. POA prioriza HDUs (P0, P1, P2)
5. HDUs se registran en el backlog compartido

**Formato de HDU:**
```markdown
### HDU-XX: [Título descriptivo]

**Prioridad:** P0/P1/P2
**Agente Asignado:** [FDA/SDET/QAE/DOA]
**Dependencias:** [HDU-XX, HDU-YY]

**Descripción:**
[Descripción de la funcionalidad]

**Criterios de Aceptación:**
- [ ] Criterio 1
- [ ] Criterio 2
- [ ] Criterio 3

**Notas Técnicas (TLA):**
- Nota sobre arquitectura
- Nota sobre dependencias
- Nota sobre integraciones

**Evidencia Requerida:**
- [ ] Screenshot de funcionalidad
- [ ] Test pasando
- [ ] Documentación actualizada
```

### Fase 2: Implementación (FDA + SDET)

```
TLA asigna HDU → FDA implementa → SDET crea tests → QAE valida → HDU completada
```

**Proceso:**
1. TLA asigna HDU disponible al agente apropiado (FDA)
2. FDA implementa la funcionalidad según criterios de aceptación
3. FDA crea PR con cambios
4. SDET revisa PR y crea/actualiza tests automatizados
5. QAE valida criterios de aceptación
6. TLA hace code review final
7. HDU se marca como completada

**Comunicación entre agentes:**
- FDA notifica a SDET cuando la implementación está lista
- SDET notifica a QAE cuando los tests están listos
- QAE notifica a TLA cuando la validación está completa
- TLA notifica a POA cuando la HDU está completada

### Fase 3: Integración y Deploy (DOA + QAE)

```
HDUs completadas → DOA integra → QAE valida en staging → DOA deploy a producción
```

**Proceso:**
1. DOA crea rama de release con HDUs completadas
2. DOA ejecuta pipeline de CI/CD
3. QAE valida funcionalidad en ambiente de staging
4. Si hay bugs, QAE reporta y FDA corrige
5. DOA hace deploy a producción
6. QAE valida en producción

## Protocolo de Comunicación entre Agentes

### Formato de Mensajes

Los agentes se comunican mediante mensajes estructurados:

```typescript
interface AgentMessage {
  from: AgentRole;        // Rol del agente emisor
  to: AgentRole;          // Rol del agente receptor
  type: MessageType;      // Tipo de mensaje
  hduId: string;          // ID de la HDU relacionada
  content: string;        // Contenido del mensaje
  attachments?: string[]; // URLs de evidencia
  timestamp: Date;        // Fecha de envío
}

type MessageType = 
  | 'HDU_CREATED'         // Nueva HDU creada
  | 'HDU_ASSIGNED'        // HDU asignada a agente
  | 'IMPLEMENTATION_READY' // Implementación lista para review
  | 'TESTS_READY'         // Tests listos para validación
  | 'VALIDATION_PASSED'   // Validación exitosa
  | 'VALIDATION_FAILED'   // Validación fallida con bugs
  | 'CODE_REVIEW_PASSED'  // Code review aprobado
  | 'CODE_REVIEW_CHANGES_REQUESTED' // Cambios requeridos
  | 'HDU_COMPLETED'       // HDU completada
  | 'BLOCKED'             // Agente bloqueado, necesita ayuda
  | 'HELP_REQUESTED'      // Solicitud de ayuda
  | 'HELP_PROVIDED'       // Ayuda proporcionada
  | 'DEPLOY_READY'        // Listo para deploy
  | 'DEPLOY_COMPLETED'    // Deploy completado
  | 'BUG_REPORTED'        // Bug reportado
  | 'BUG_FIXED'           // Bug corregido
  | 'BUG_VALIDATED';      // Bug validado como corregido
```

### Ejemplo de Flujo de Mensajes

**Para HDU-01: Configuración del proyecto base**

```
1. POA → TLA: HDU_CREATED { hduId: "HDU-01", content: "Configurar estructura base del proyecto" }
2. TLA → POA: HDU_ASSIGNED { hduId: "HDU-01", to: "FDA", content: "Asignado a FDA" }
3. FDA → SDET: IMPLEMENTATION_READY { hduId: "HDU-01", content: "Estructura base implementada" }
4. SDET → QAE: TESTS_READY { hduId: "HDU-01", content: "Tests de estructura creados" }
5. QAE → TLA: VALIDATION_PASSED { hduId: "HDU-01", content: "Criterios cumplidos" }
6. TLA → POA: CODE_REVIEW_PASSED { hduId: "HDU-01", content: "Code review aprobado" }
7. POA → ALL: HDU_COMPLETED { hduId: "HDU-01", content: "HDU completada" }
```

## Backlog de HDUs Inicial

### P0 - Crítico (MVP)

- **HDU-01**: Configuración del proyecto base (FDA)
- **HDU-02**: Configurar backend base con Express y Prisma (FDA)
- **HDU-03**: Implementar autenticación JWT (FDA)
- **HDU-04**: Implementar almacenamiento S3 para evidencia (FDA)
- **HDU-05**: Crear clase BaseAgent con OpenAI (FDA)
- **HDU-06**: Implementar BugReporterAgent (FDA)
- **HDU-07**: Implementar TestGeneratorAgent (FDA)
- **HDU-08**: Crear aplicación web React base (FDA)
- **HDU-09**: Implementar componentes de bugs (BugList, BugDetail) (FDA)
- **HDU-10**: Implementar componentes de tests (TestList) (FDA)
- **HDU-11**: Integración con GitHub para sincronizar bugs (FDA)
- **HDU-12**: Configurar CI/CD con GitHub Actions (DOA)
- **HDU-13**: Tests E2E del flujo de reporte de bugs (SDET)
- **HDU-14**: Validación completa del MVP (QAE)

### P1 - Alta

- **HDU-15**: Implementar CoverageAnalyzerAgent (FDA)
- **HDU-16**: Implementar ImprovementPlannerAgent (FDA)
- **HDU-17**: Crear dashboard de cobertura (FDA)
- **HDU-18**: Crear vista de planes de mejora (FDA)
- **HDU-19**: Integración con Jira (FDA)
- **HDU-20**: Extensión de navegador para captura de evidencia (FDA)
- **HDU-21**: Tests de integración con Jira/GitHub (SDET)
- **HDU-22**: Documentación de API (TLA)
- **HDU-23**: Guía de usuario (POA)

### P2 - Media

- **HDU-24**: Tests de carga y performance (SDET)
- **HDU-25**: Monitoreo y alertas (DOA)
- **HDU-26**: Landing page del producto (FDA)
- **HDU-27**: Sistema de billing (FDA)
- **HDU-28**: Notificaciones por email/Slack (FDA)

## Reglas de Orquestación

### Regla 1: Autonomía con Escalamiento
- Los agentes trabajan autónomamente en sus HDUs asignadas
- Si un agente está bloqueado por más de 2 iteraciones, escala a TLA
- TLA puede reasignar HDUs o solicitar ayuda de otro agente

### Regla 2: Validación Obligatoria
- Ninguna HDU se marca como completada sin validación de QAE
- Los criterios de aceptación deben ser verificables
- QAE usa BugReporterAgent para reportar bugs encontrados

### Regla 3: Trazabilidad Completa
- Cada HDU debe tener evidencia de cumplimiento
- Los bugs reportados se vinculan a la HDU original
- Los cambios de código se vinculan a la HDU correspondiente

### Regla 4: Comunicación Asíncrona
- Los agentes no esperan respuestas inmediatas
- Los mensajes se procesan en orden de llegada
- Las HDUs se asignan del backlog cuando un agente está disponible

### Regla 5: Priorización Dinámica
- POA puede repriorizar HDUs en cualquier momento
- Las HDUs bloqueadoras tienen prioridad automática
- Las dependencias se resuelven antes de asignar HDUs

## Herramientas de Orquestación

### Archivo de Estado Compartido
- `workflow/status.json`: Estado actual de todas las HDUs
- `workflow/messages.json`: Historial de mensajes entre agentes
- `workflow/agents.json`: Estado actual de cada agente

### Comandos de Orquestación
```bash
# Crear nueva HDU
npm run workflow:create-hdu -- --title "Título" --priority P0

# Asignar HDU a agente
npm run workflow:assign-hdu -- --hdu-id HDU-01 --agent FDA

# Enviar mensaje entre agentes
npm run workflow:send-message -- --from FDA --to SDET --type IMPLEMENTATION_READY --hdu-id HDU-01

# Consultar estado de HDU
npm run workflow:hdu-status -- --hdu-id HDU-01

# Consultar backlog
npm run workflow:backlog -- --priority P0

# Marcar HDU como completada
npm run workflow:complete-hdu -- --hdu-id HDU-01
```

## Métricas de Progreso

### KPIs del Proyecto
- **HDUs Completadas**: Porcentaje de HDUs completadas vs total
- **Tiempo por HDU**: Tiempo promedio de implementación por HDU
- **Tasa de Bugs**: Bugs reportados por HDU
- **Cobertura de Tests**: Porcentaje de cobertura de código
- **Velocidad del Equipo**: HDUs completadas por sprint

### Dashboard de Progreso
- Gráfico de burndown de HDUs
- Estado de cada agente (disponible, trabajando, bloqueado)
- Bugs abiertos vs resueltos
- Cobertura de tests en el tiempo

## Implementación del Sistema de Orquestación

### Paso 1: Crear Estructura de Workflow
```
workflow/
├── status.json          # Estado de HDUs
├── messages.json        # Historial de mensajes
├── agents.json          # Estado de agentes
├── backlog.json         # HDUs pendientes
└── scripts/
    ├── create-hdu.ts    # Script para crear HDUs
    ├── assign-hdu.ts    # Script para asignar HDUs
    ├── send-message.ts  # Script para enviar mensajes
    └── status.ts        # Script para consultar estado
```

### Paso 2: Implementar Scripts de Orquestación
- Crear scripts TypeScript para cada comando de orquestación
- Implementar lógica de asignación automática
- Implementar sistema de notificaciones entre agentes

### Paso 3: Integrar con Agentes
- Cada agente lee su estado de `workflow/agents.json`
- Cada agente escribe mensajes en `workflow/messages.json`
- Cada agente actualiza `workflow/status.json` al completar HDUs

### Paso 4: Dashboard de Monitoreo
- Crear vista en la aplicación web para monitorear progreso
- Mostrar estado de HDUs en tiempo real
- Mostrar actividad de agentes
- Mostrar métricas de progreso

## Conclusión

Este workflow permite que el desarrollo del SaaS sea orquestado autónomamente por agentes de IA, donde:
- **POA** crea y prioriza HDUs
- **TLA** asigna y revisa HDUs
- **FDA** implementa funcionalidades
- **SDET** crea tests automatizados
- **QAE** valida criterios de aceptación
- **DOA** gestiona infraestructura y deploys

La comunicación entre agentes es asíncrona y basada en mensajes estructurados, permitiendo que el proyecto avance de manera incremental y autónoma.