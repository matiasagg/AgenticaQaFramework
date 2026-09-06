# Roadmap del proyecto: SaaS de QA con IA

## Visión
Desarrollar un SaaS para gestionar automatización de QA con foco en:
- creación y mantenimiento de suites y casos de prueba
- ejecución de pruebas automatizadas
- análisis de resultados
- uso de IA para resumir fallos y sugerir cobertura
- trazabilidad y reportes ejecutivos

## Objetivo del MVP
Crear una plataforma mínima que permita:
- registrar usuarios y proyectos
- definir suites y casos de prueba
- disparar una ejecución de pruebas con Playwright
- guardar logs, screenshots y resultados
- analizar fallos con IA
- mostrar un dashboard con reportes básicos

---

## Fase 1 - Fundación del producto

### Epic 1: Infraestructura base
- Configurar repositorio y estructura base del proyecto
- Inicializar backend en Node.js + TypeScript
- Inicializar frontend en Next.js + TypeScript
- Configurar PostgreSQL y Prisma
- Configurar Redis y worker para tareas
- Preparar GitHub Actions para CI
- Crear variables de entorno y .env.example
- Documentar la arquitectura base

### Epic 2: Autenticación y organización
- Registro e inicio de sesión
- Implementar JWT o Auth.js
- Crear roles: admin, owner, member, viewer
- Crear usuarios y equipos
- Crear CRUD de proyectos
- Asociar usuarios a proyectos
- Definir permisos por proyecto

### Epic 3: Gestión de suites y casos
- Crear modelos de suites de prueba
- Crear modelos de casos de prueba
- CRUD de suites
- CRUD de casos de prueba
- Asociar casos a suites y proyectos
- Etiquetado por tipo: smoke, regression, api, ui
- Visualización y edición de casos

### Epic 4: Dashboard inicial
- Dashboard principal
- Mostrar proyectos recientes
- Mostrar estadísticas básicas
- Mostrar últimas ejecuciones
- Diseñar navegación inicial

### Milestone M1: Foundation
Criterio de salida:
- usuarios pueden registrarse
- crear proyectos
- crear suites y casos
- ver dashboard básico

---

## Fase 2 - Automatización y ejecución de pruebas

### Epic 5: Ejecución de pruebas
- Integrar Playwright como motor principal
- Crear runner de pruebas desde backend
- Guardar estado de ejecución: pending, running, passed, failed
- Guardar logs y outputs
- Guardar screenshots y trazas
- Crear endpoint para lanzar ejecución
- Crear endpoint para consultar estado
- Diseñar UI para lanzar suite manualmente

### Epic 6: Reportes de ejecución
- Vista de detalle de ejecución
- Mostrar tests ejecutados vs fallidos
- Mostrar duración total
- Mostrar screenshots por fallo
- Mostrar log de errores
- Guardar historial por proyecto
- Filtros por fecha, suite y estado
- Exportar resumen de ejecución

### Epic 7: Colas y workers
- Configurar BullMQ o equivalente
- Procesar ejecuciones en segundo plano
- Manejar reintentos y fallos de worker
- Limitar concurrencia
- Gestionar cola por proyecto
- Notificar errores críticos

### Milestone M2: Test Runner
Criterio de salida:
- un usuario puede disparar una suite
- la ejecución termina con resultados reales
- las evidencias quedan guardadas
- la UI muestra resultados y logs

---

## Fase 3 - IA para análisis y valor diferencial

### Epic 8: IA para análisis de pruebas
- Crear servicio IA para resumir ejecuciones
- Detectar patrones de fallo
- Clasificar fallos: selector, sincronización, datos, API, infraestructura
- Generar resumen ejecutivo por ejecución
- Sugerir causa probable del fallo
- Extraer contexto desde logs y screenshots
- Guardar historial de análisis IA

### Epic 9: Generación de casos con IA
- Recibir requisito o historia
- Generar casos de prueba sugeridos
- Generar pasos y resultado esperado
- Añadir tags automáticos por tipo
- Permitir edición manual del caso generado
- Guardar versión generada y manual

### Epic 10: Cobertura y recomendación
- Detectar casos faltantes
- Sugerir pruebas por riesgo
- Comparar ejecuciones entre versiones
- Generar recomendaciones de cobertura
- Mostrar impacto de fallos por módulo

### Milestone M3: IA Analysis
Criterio de salida:
- la IA ayuda a resumir fallos
- sugiere causas probables
- ayuda a priorizar pruebas faltantes

---

## Fase 4 - Producción y operación

### Epic 11: Seguridad y producción
- Revisar CORS y validación de requests
- Mejorar seguridad de auth y tokens
- Gestionar permisos por rol
- Añadir rate limiting
- Añadir logging estructurado
- Añadir trazabilidad por request id
- Manejo global de errores

### Epic 12: Despliegue y observabilidad
- Desplegar frontend
- Desplegar backend
- Configurar base de datos de producción
- Configurar Redis de producción
- Añadir Sentry o logging externo
- Crear health checks
- Crear alertas básicas
- Preparar backups

### Epic 13: Escalado del producto
- Integración con GitHub
- Comparativa de ejecuciones
- Reportes por equipo y proyecto
- Alertas por regresión
- Billing y suscripciones
- Planes de crecimiento

### Milestone M4: Production Ready
Criterio de salida:
- producto listo para uso real
- observabilidad activa
- reportes ejecutivos
- flujo operativo documentado

---

## Priorización

### P0 - imprescindible para el MVP
- Registro e inicio de sesión
- CRUD de proyectos
- CRUD de suites
- CRUD de casos
- Ejecución de Playwright
- Guardado de logs y screenshots
- Dashboard principal
- Detalle de ejecución

### P1 - muy valioso
- Historial de ejecuciones
- Filtros y reportes
- IA para resumen de errores
- Roles y permisos
- Tags y clasificación

### P2 - diferenciador
- Generación de casos con IA
- Recomendación de cobertura
- Comparación entre ejecuciones
- Integración con GitHub
- Notificaciones y alertas

---

## Tablero sugerido
Columnas:
- Backlog
- Ready
- In Progress
- Review
- QA
- Done

Labels sugeridas:
- backend
- frontend
- qa
- automation
- ai
- infra
- security
- bug
- p0
- p1
- p2
- MVP

---

## Sprints sugeridos

### Sprint 1
- Infraestructura base
- Auth
- Proyectos
- Dashboard

### Sprint 2
- Suites y casos
- Ejecución Playwright
- Resultados y evidencias

### Sprint 3
- Reportes y detalle de ejecución
- IA para resumen de fallos

### Sprint 4
- Producción
- Seguridad
- Despliegue
- Observabilidad

---

## Criterio de éxito
El producto será exitoso cuando pueda:
- gestionar proyectos y suites
- ejecutar automatización de pruebas
- guardar evidencia real
- analizar fallos con IA
- entregarle valor operativo a un equipo de QA o desarrollo