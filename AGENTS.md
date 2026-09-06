# Agentes IA y Framework de Automatización

> **Contexto**: El proyecto principal de este repositorio es la [QA SaaS Platform](README.md), una plataforma SaaS para gestión de calidad de software. Este documento cubre dos elementos secundarios/complementarios:
>
> 1. **Agentes IA** — característica transversal que apoya el desarrollo y el QA de la plataforma.
> 2. **Framework de Automatización** — proyecto secundario (como todo proyecto de desarrollo) que utiliza estos agentes para automatizar pruebas.

## 1. Agentes IA (característica transversal)

Los agentes son asistentes especializados disponibles de forma transversal: apoyan el **desarrollo** de la plataforma (Dev Fullstack, Tech Lead, DevOps) y el **QA** (SDET, QA Engineer, Product Owner).

## Estructura

```
AgenticaQaFramework/
├── agents/                  # Definiciones de agentes
│   ├── _template.md         # Plantilla para nuevos agentes
│   ├── sdet.md
│   ├── dev-fullstack.md
│   ├── devops.md
│   ├── qa-engineer.md
│   ├── tech-lead.md
│   └── product-owner.md
├── skills/                  # Skills reutilizables
│   ├── github-integration.md
│   ├── test-automation.md
│   ├── ci-cd-pipeline.md
│   ├── code-review.md
│   └── documentation.md
├── mcp-servers/             # Servidores MCP
│   └── github-mcp/
├── prompts/                 # Prompts predefinidos
│   ├── create-feature.md
│   ├── create-test-plan.md
│   └── create-deployment.md
├── scripts/                 # Scripts de utilidad
│   └── github/
└── .clinerules/             # Reglas globales
```

## Agentes Disponibles

| Agente | Rol | Prioridad |
|--------|-----|-----------|
| **SDET** | Automatización de pruebas | P0 |
| **Dev Fullstack** | Desarrollo backend y frontend | P0 |
| **DevOps** | Infraestructura y CI/CD | P0 |
| **QA Engineer** | Control de calidad | P0 |
| **Tech Lead** | Arquitectura y liderazgo técnico | P0 |
| **Product Owner** | Gestión de producto | P1 |

## Cómo usar los Agentes

### 1. Seleccionar un Agente

Para activar un agente, inicia tu mensaje con el nombre del agente:

```
Actúa como SDET y crea un test E2E para el login
```

```
Actúa como DevOps y configura el pipeline CI/CD
```

```
Actúa como QA Engineer y crea un plan de pruebas
```

### 2. Usar Skills

Las skills son capacidades reutilizables. Se usan automáticamente cuando activas un agente:

```
Actúa como SDET y usa la skill test-automation
```

### 3. Usar Prompts Predefinidos

Los prompts son plantillas para tareas comunes:

- **Crear Feature**: Usa `prompts/create-feature.md`
- **Crear Plan de Pruebas**: Usa `prompts/create-test-plan.md`
- **Crear Deployment**: Usa `prompts/create-deployment.md`

## Flujo de Trabajo

### Crear Nueva Feature

```
1. Product Owner: Define user stories y criterios de aceptación
2. Tech Lead: Diseña arquitectura y crea ADR
3. Dev Fullstack: Implementa backend y frontend
4. SDET: Crea tests automatizados
5. QA Engineer: Ejecuta pruebas y valida calidad
6. DevOps: Configura pipeline y deploy
```

### Reportar Bug

```
1. QA Engineer: Documenta el bug con pasos para reproducir
2. Crea issue en GitHub con labels: bug, p0/p1/p2
3. Tech Lead: Asigna prioridad y asigna agente
4. Dev Fullstack/SDET: Corrige el bug
5. QA Engineer: Valida la corrección
```

### Code Review

```
1. Dev Fullstack: Crea PR con cambios
2. Tech Lead: Revisa arquitectura y código
3. SDET: Verifica cobertura de tests
4. DevOps: Revisa configuración de infraestructura
5. Se mergea cuando todos aprueban
```

## Labels de GitHub

Usa estos labels para categorizar trabajo:

- **Tipo**: `epic`, `feature`
- **Área**: `backend`, `frontend`, `sdet`, `devops`, `qa`, `architecture`
- **Prioridad**: `p0`, `p1`, `p2`
- **Documentación**: `docs`

## MCP Servers

### GitHub MCP

El servidor MCP de GitHub permite:
- Crear y gestionar issues
- Crear y revisar pull requests
- Sincronizar labels
- Automatizar flujos de trabajo

## Mejores Prácticas

1. **Siempre especifica el agente** al inicio de tu mensaje
2. **Usa labels** para categorizar issues y tareas
3. **Documenta decisiones** importantes en ADRs
4. **Escribe tests** para toda la funcionalidad nueva
5. **Realiza code review** antes de mergear

## Contribuir

1. Crea un issue en GitHub
2. Asigna labels apropiados
3. Trabaja en una rama `feature/`
4. Crea un PR con descripción detallada
5. Espera code review

## Licencia

MIT