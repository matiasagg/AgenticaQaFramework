# Prompt: Crear Feature

## Uso
Usa este prompt cuando necesites crear una nueva feature completa.

## Prompt Template

```
Actúa como el equipo completo de desarrollo y crea la siguiente feature:

## Feature: [NOMBRE DE LA FEATURE]

### Descripción
[Descripción detallada de la feature]

### Criterios de Aceptación
- [ ] [Criterio 1]
- [ ] [Criterio 2]
- [ ] [Criterio 3]

### Requerimientos Técnicos
- Backend: [Node.js/Python/etc]
- Frontend: [React/Vue/etc]
- Base de Datos: [PostgreSQL/MongoDB/etc]

### Tareas a Realizar

#### 1. Product Owner
- Crear user stories detalladas
- Definir criterios de aceptación en formato Gherkin
- Priorizar tareas

#### 2. Tech Lead
- Diseñar arquitectura de la feature
- Crear ADR si es necesario
- Definir contratos de API

#### 3. Dev Fullstack
- Implementar backend (API, servicios, modelos)
- Implementar frontend (componentes, páginas)
- Integrar frontend con backend

#### 4. SDET
- Crear tests unitarios
- Crear tests de integración
- Crear tests E2E con Playwright

#### 5. QA Engineer
- Crear plan de pruebas
- Ejecutar pruebas exploratorias
- Validar criterios de aceptación

#### 6. DevOps
- Configurar pipeline CI/CD
- Preparar ambiente de staging
- Configurar monitoreo

### Entregables
- [ ] Código implementado
- [ ] Tests automatizados
- [ ] Documentación actualizada
- [ ] Pipeline configurado
- [ ] Issue en GitHub creado y actualizado
```

## Ejemplo de Uso

```
Actúa como el equipo completo de desarrollo y crea la siguiente feature:

## Feature: Sistema de Autenticación

### Descripción
Implementar sistema de autenticación con JWT que permita login, registro y recuperación de contraseña.

### Criterios de Aceptación
- [ ] Usuario puede registrarse con email y contraseña
- [ ] Usuario puede iniciar sesión
- [ ] Usuario puede recuperar contraseña
- [ ] Tokens expiran en 24 horas
- [ ] Sesiones se invalidan al cerrar sesión

### Requerimientos Técnicos
- Backend: Node.js + TypeScript + Express
- Frontend: React + TypeScript
- Base de Datos: PostgreSQL