# Qacelerate

**IA Quality Engineering Workspace**

Plataforma SaaS para gestión de calidad de software (QA) con validación inteligente de historias de usuario usando IA.

## Descripción

Qacelerate es un SaaS para realizar análisis estático de requerimientos y pruebas dinámicas de software:

- Gestionar **proyectos** de prueba
- Crear y administrar **historias de usuario (HDU)**
- Validar el **Definition of Ready (DoR)** combinando reglas estáticas y análisis con **Gemini AI**
- Generar **suites de pruebas funcionales** automáticamente a partir de HDUs listas

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js, Express, TypeScript, Prisma |
| Base de datos | PostgreSQL |
| Frontend | React 18, Vite, TailwindCSS, React Router |
| IA | Google Gemini API (`gemini-3.6-flash`) |
| Autenticación | JWT + bcryptjs |

## Estructura del Proyecto

```
AgenticaQaFramework/
├── api/                       # Backend
│   ├── prisma/                # Esquema de base de datos
│   └── src/
│       ├── config/            # Configuración centralizada
│       ├── middleware/        # auth, errorHandler
│       ├── routes/            # auth, projects, userStories, bugs, tests...
│       └── services/          # dorValidator, geminiAI, testSuiteGenerator
└── web/                       # Frontend
    └── src/
        ├── components/        # Layout, bugs, tests
        ├── contexts/          # AuthContext, ThemeContext
        ├── pages/             # Dashboard, Projects, UserStories, Bugs...
        └── services/          # Cliente API (axios)
```

## Funcionalidades

- **Autenticación**: Registro y login con JWT
- **Proyectos**: CRUD completo para organizar el trabajo de QA
- **Historias de Usuario (HDU)**: Crear, editar, listar y eliminar
- **Validación DoR (Definition of Ready)**:
  - Validación estática basada en reglas (60%): título, formato estándar, criterios de aceptación, prioridad, story points, ambigüedad y testeabilidad
  - Análisis con **Gemini AI** (40%): sugerencias inteligentes, elementos faltantes, áreas de riesgo y descripción mejorada
- **Generación de suites de pruebas**: Automática a partir de HDUs que pasan el DoR
- **Modo oscuro**: Tema claro/oscuro configurable

## Flujo de trabajo

```
1. Login → Crear Proyecto → Crear HDU
2. Validar DoR → Score combinado (reglas + Gemini AI)
3. Si score ≥ 70% → Generar Suite de Pruebas
```

## Requisitos previos

- Node.js 18+
- PostgreSQL corriendo localmente
- npm
- API Key de Google Gemini (para análisis de IA)

## Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno del backend
cd api
cp .env.example .env
```

Editar `api/.env` con tus valores:

```env
# Base de datos
DATABASE_URL="postgresql://usuario:password@localhost:5432/qa_saas_db?schema=public"

# Servidor
PORT=3001
NODE_ENV=development

# JWT (usar un secret seguro en producción)
JWT_SECRET=tu-secret-seguro
JWT_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=tu-api-key-de-gemini
GEMINI_MODEL=gemini-3.6-flash

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5173
```

> **Nota**: La API Key de Gemini se obtiene gratis en [Google AI Studio](https://aistudio.google.com/).

```bash
# 3. Aplicar el esquema de base de datos (desde api/)
npx prisma db push
```

### Cambios en el esquema Prisma

Cuando modifiques `api/prisma/schema.prisma`, aplica los cambios a la base de datos con una migración para mantener historial y evitar inconsistencias:

```bash
cd api
npx prisma migrate dev --name descripcion_del_cambio
```

Ejemplo:

```bash
cd api
npx prisma migrate dev --name add_user_story_status
```

Esto hará lo siguiente:
- crea una nueva migración en `api/prisma/migrations/`
- aplica la migración a la base de datos local
- genera el cliente Prisma actualizado

Si solo estás trabajando en local y quieres sincronizar rápidamente sin crear historial, también puedes usar:

```bash
cd api
npx prisma db push
```

> En desarrollo es recomendable preferir `prisma migrate dev` cuando cambias el esquema. `db push` sirve más bien para prototipos o sincronización rápida.

## Ejecución

### Todo junto (recomendado)

```bash
# Desde la raíz: levanta backend (:3001) y frontend (:5173)
npm run dev
```

### Por separado

```bash
# Terminal 1 - Backend (puerto 3001)
cd api && npm run dev

# Terminal 2 - Frontend (puerto 5173)
cd web && npm run dev
```

### Reiniciar

```bash
# Windows: matar procesos Node y volver a levantar
taskkill /F /IM node.exe /T
npm run dev
```

### URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health check**: http://localhost:3001/api/health

## API

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/register` | POST | Registrar usuario |
| `/api/auth/login` | POST | Iniciar sesión |
| `/api/projects` | GET/POST | Listar / crear proyectos |
| `/api/projects/:id` | GET/PUT/DELETE | Detalle / actualizar / eliminar proyecto |
| `/api/user-stories` | GET/POST | Listar / crear HDUs |
| `/api/user-stories/:id` | GET/PUT/DELETE | Detalle / actualizar / eliminar HDU |
| `/api/user-stories/:id/validate-dor` | POST | Validar DoR (reglas + Gemini AI) |
| `/api/user-stories/:id/generate-tests` | POST | Generar suite de pruebas |

## Criterios DoR evaluados

| Criterio | Regla | Peso |
|----------|-------|------|
| Título claro | 10-100 caracteres, descriptivo | 15% |
| Formato estándar | "Como [rol], quiero [acción], para [beneficio]" | 25% |
| Criterios de aceptación | Mínimo 2, cada uno con 10+ caracteres | 25% |
| Prioridad | HIGH, MEDIUM o LOW | 10% |
| Story points | Secuencia Fibonacci: 1,2,3,5,8,13,21 | 10% |
| Sin ambigüedad | Sin términos como "etc", "quizás", "tal vez" | 10% |
| Criterios testeables | Con verbos de acción verificables | 5% |

**Score mínimo para aprobar: 70%** (los criterios críticos deben pasar obligatoriamente)

El score final combina: **60% reglas estáticas + 40% análisis de Gemini AI**.

## 🤖 Agentes IA (característica transversal)

Los agentes de IA son una característica disponible de forma **transversal** en todo el proyecto: apoyan tanto el **desarrollo** de la plataforma (Dev Fullstack, Tech Lead, DevOps) como el **QA** (SDET, QA Engineer, Product Owner).

Incluye:
- **Agentes**: SDET, Dev Fullstack, DevOps, QA Engineer, Tech Lead, Product Owner
- **Skills reutilizables**: github-integration, test-automation, ci-cd-pipeline, code-review, documentation
- **Prompts** predefinidos para tareas comunes
- **MCP Servers** (GitHub) para integración con repositorios

Su documentación completa, junto con el framework secundario de automatización, está en [AGENTS.md](AGENTS.md).

## Licencia

MIT
