no deberi# Implementation Plan

## [Overview]
Crear un SaaS de QA con agentes de IA proactivos que asistan a analistas de QA a mejorar su rendimiento, automatizando tareas repetitivas, generando casos de prueba, reportando bugs con evidencia y proporcionando planes de mejora personalizados.

El producto se posicionará como un "copiloto de QA" que ayuda a los analistas a mantener el ritmo con desarrolladores que ya usan IA eficientemente. El MVP incluirá una aplicación web, API para integraciones y extensión de navegador para captura de evidencia, reutilizando la arquitectura de agentes existente en AgenticaQaFramework.

El enfoque es pragmático: comenzar con funcionalidades de alto impacto que demuestren valor inmediato (generación de tests, reporte de bugs, análisis de cobertura) y escalar hacia funciones más avanzadas (mentoría con IA, planes de aprendizaje, predicción de defectos).

## [Types]
Single sentence describing the type system changes.

**TypeScript Interfaces y Types:**

- `QaAgent`: Base para todos los agentes de QA
  - `id: string` - Identificador único del agente
  - `name: string` - Nombre descriptivo
  - `role: 'qa-engineer' | 'sdet' | 'tech-lead' | 'analyst'` - Rol del agente
  - `capabilities: string[]` - Lista de capacidades
  - `systemPrompt: string` - Prompt de sistema para el agente

- `Evidence`: Evidencia adjunta a prompts o bugs
  - `id: string` - Identificador único
  - `type: 'screenshot' | 'video' | 'log' | 'file'` - Tipo de evidencia
  - `url: string` - URL del recurso
  - `thumbnailUrl?: string` - URL del thumbnail
  - `metadata: Record<string, unknown>` - Metadatos adicionales
  - `createdAt: Date` - Fecha de creación

- `BugReport`: Reporte de bug generado por agentes
  - `id: string` - Identificador único
  - `title: string` - Título del bug
  - `description: string` - Descripción detallada
  - `severity: 'critical' | 'high' | 'medium' | 'low'` - Severidad
  - `stepsToReproduce: string[]` - Pasos para reproducir
  - `expectedResult: string` - Resultado esperado
  - `actualResult: string` - Resultado actual
  - `evidence: Evidence[]` - Evidencias adjuntas
  - `agentId: string` - Agente que generó el reporte
  - `status: 'open' | 'in-progress' | 'resolved' | 'closed'` - Estado

- `TestCase`: Caso de prueba generado
  - `id: string` - Identificador único
  - `title: string` - Título del caso
  - `description: string` - Descripción
  - `preconditions: string[]` - Precondiciones
  - `steps: TestStep[]` - Pasos del test
  - `expectedResults: string[]` - Resultados esperados
  - `priority: 'high' | 'medium' | 'baja'` - Prioridad
  - `type: 'functional' | 'regression' | 'exploratory' | 'e2e'` - Tipo
  - `agentId: string` - Agente que generó el caso

- `TestStep`: Paso individual de un caso de prueba
  - `order: number` - Orden del paso
  - `action: string` - Acción a realizar
  - `expectedResult: string` - Resultado esperado

- `CoverageAnalysis`: Análisis de cobertura
  - `id: string` - Identificador único
  - `projectId: string` - Proyecto analizado
  - `overallCoverage: number` - Cobertura total (0-100)
  - `uncoveredAreas: UncoveredArea[]` - Áreas sin cobertura
  - `recommendations: string[]` - Recomendaciones
  - `generatedAt: Date` - Fecha de generación

- `UncoveredArea`: Área sin cobertura
  - `module: string` - Módulo o funcionalidad
  - `riskLevel: 'high' | 'medium' | 'low'` - Nivel de riesgo
  - `suggestedTests: string[]` - Tests sugeridos

- `ImprovementPlan`: Plan de mejora personalizado
  - `id: string` - Identificador único
  - `userId: string` - Usuario objetivo
  - `currentSkills: SkillAssessment[]` - Habilidades actuales
  - `targetSkills: SkillAssessment[]` - Habilidades objetivo
  - `actions: ImprovementAction[]` - Acciones recomendadas
  - `resources: Resource[]` - Recursos sugeridos
  - `timeline: string` - Timeline estimado

- `SkillAssessment`: Evaluación de habilidad
  - `skill: string` - Nombre de la habilidad
  - 'level: number' - Nivel actual (1-5)
  - `targetLevel: number` - Nivel objetivo

- `ImprovementAction`: Acción de mejora
  - `description: string` - Descripción de la acción
  - `type: 'practice' | 'course' | 'mentoring' | 'project'` - Tipo
  - `priority: 'high' | 'medium' | 'baja'` - Prioridad
  - `estimatedHours: number` - Horas estimadas

- `Resource`: Recurso de aprendizaje
  - `title: string` - Título
  - `type: 'article' | 'video' | 'course' | 'documentation'` - Tipo
  - `url: string` - URL del recurso
  - `duration?: string` - Duración estimada

## [Files]
Single sentence describing file modifications.

**Nuevos archivos a crear:**

1. `web/package.json` - Dependencias del frontend React
   - React, React Router, TypeScript
   - Tailwind CSS para estilos
   - Axios para requests
   - React Query para estado del servidor

2. `web/tsconfig.json` - Configuración TypeScript del frontend
   - Target ES2020
   - Strict mode
   - JSX react-jsx

3. `web/tailwind.config.js` - Configuración de Tailwind
   - Colores personalizados de marca
   - Extensiones de componentes

4. `web/src/main.tsx` - Entry point de la aplicación React
   - Renderizado de App component
   - Configuración de React Query

5. `web/src/App.tsx` - Componente raíz
   - Configuración de rutas
   - Layout principal con navegación

6. `web/src/components/layout/Navbar.tsx` - Barra de navegación
   - Logo y branding
   - Links de navegación
   - Avatar de usuario

7. `web/src/components/layout/Sidebar.tsx` - Barra lateral
   - Menú de funcionalidades
   - Links a módulos principales

8. `web/src/components/agents/AgentCard.tsx` - Tarjeta de agente
   - Muestra info del agente
   - Estado activo/inactivo
   - Botón de activación

9. `web/src/components/agents/AgentChat.tsx` - Chat con agente
   - Interfaz de mensajes
   - Input con adjuntar archivos
   - Historial de conversación

10. `web/src/components/evidence/EvidenceUploader.tsx` - Subida de evidencia
    - Drag & drop para archivos
    - Preview de imágenes
    - Captura de pantalla

11. `web/src/components/bugs/BugList.tsx` - Lista de bugs
    - Tabla con bugs reportados
    - Filtros por severidad/estado
    - Acciones rápidas

12. `web/src/components/bugs/BugDetail.tsx` - Detalle de bug
    - Info completa del bug
    - Galería de evidencias
    - Acciones de estado

13. `web/src/components/tests/TestList.tsx` - Lista de casos de prueba
    - Tabla con tests generados
    - Filtros por tipo/prioridad
    - Exportación

14. `web/src/components/coverage/CoverageDashboard.tsx` - Dashboard de cobertura
    - Gráficos de cobertura
    - Áreas sin cobertura
    - Recomendaciones

15. `web/src/components/plans/ImprovementPlanView.tsx` - Vista de plan de mejora
    - Plan personalizado del usuario
    - Progreso de habilidades
    - Recursos recomendados

16. `web/src/hooks/useAgents.ts` - Hook para agentes
    - CRUD de agentes
    - Estado de agentes

17. `web/src/hooks/useEvidence.ts` - Hook para evidencia
    - Upload de archivos
    - Listado de evidencia

18. `web/src/hooks/useBugs.ts` - Hook para bugs
    - CRUD de bugs
    - Filtros y búsqueda

19. `web/src/hooks/useTests.ts` - Hook para tests
    - CRUD de casos de prueba
    - Generación con IA

20. `web/src/services/api.ts` - Cliente API
    - Axios instance
    - Interceptores de auth
    - Métodos CRUD

21. `web/src/types/index.ts` - Types compartidos
    - Interfaces TypeScript
    - Types y enums

22. `web/src/utils/formatters.ts` - Utilidades de formato
    - Formato de fechas
    - Formato de severidad
    - Helpers de UI

23. `api/package.json` - Dependencias del backend
    - Express, TypeScript, Prisma
    - JWT para auth
    - OpenAI SDK
    - AWS SDK para S3

24. `api/tsconfig.json` - Configuración TypeScript del backend
    - Target ES2022
    - Strict mode
    - Decoradores para Prisma

25. `api/src/index.ts` - Entry point del servidor
    - Configuración de Express
    - Middlewares
    - Rutas

26. `api/src/config/index.ts` - Configuración centralizada
    - Variables de entorno
    - Config de OpenAI
    - Config de AWS

27. `api/src/routes/agents.ts` - Rutas de agentes
    - CRUD de agentes
    - Activación/desactivación

28. `api/src/routes/evidence.ts` - Rutas de evidencia
    - Upload a S3
    - Listado y descarga

29. `api/src/routes/bugs.ts` - Rutas de bugs
    - CRUD de bugs
    - Filtros y búsqueda

30. `api/src/routes/tests.ts` - Rutas de tests
    - CRUD de tests
    - Generación con IA

31. `api/src/routes/coverage.ts` - Rutas de cobertura
    - Análisis de cobertura
    - Recomendaciones

32. `api/src/routes/plans.ts` - Rutas de planes de mejora
    - Generación de planes
    - Seguimiento

33. `api/src/routes/auth.ts` - Rutas de autenticación
    - Login/Register
    - JWT tokens

34. `api/src/services/openai.ts` - Servicio de OpenAI
    - Configuración de cliente
    - Funciones de chat
    - Generación de contenido

35. `api/src/services/agents/BugReporterAgent.ts` - Agente reportero de bugs
    - Genera reportes de bugs
    - Adjunta evidencia

36. `api/src/services/agents/TestGeneratorAgent.ts` - Agente generador de tests
    - Genera casos de prueba
    - Basado en requerimientos

37. `api/src/services/agents/CoverageAnalyzerAgent.ts` - Agente analista de cobertura
    - Analiza cobertura existente
    - Sugiere áreas faltantes

38. `api/src/services/agents/ImprovementPlannerAgent.ts` - Agente planificador de mejora
    - Analiza habilidades del QA
    - Genera planes personalizados

39. `api/src/services/storage.ts` - Servicio de almacenamiento
    - Upload a S3
    - Generación de URLs prefirmadas

40. `api/src/services/integrations/jira.ts` - Integración con Jira
    - Crear issues en Jira
    - Sincronizar bugs

41. `api/src/services/integrations/github.ts` - Integración con GitHub
    - Crear issues en GitHub
    - Sincronizar bugs

42. `api/src/middleware/auth.ts` - Middleware de autenticación
    - Verificación de JWT
    - Protección de rutas

43. `api/src/middleware/upload.ts` - Middleware de upload
    - Configuración de multer
    - Validación de archivos

44. `api/prisma/schema.prisma` - Schema de base de datos
    - Modelos de datos
    - Relaciones

45. `extension/manifest.json` - Manifest de extensión de navegador
    - Configuración de la extensión
    - Permisos

46. `extension/src/background.ts` - Service worker
    - Lógica de captura
    - Comunicación con API

47. `extension/src/content.ts` - Content script
    - Interacción con página
    - Captura de pantalla

48. `extension/src/popup.tsx` - Popup de la extensión
    - UI para captura
    - Envío a la API

49. `extension/src/options.tsx` - Página de opciones
    - Configuración de API key
    - Preferencias

**Archivos existentes a modificar:**

1. `agents/qa-engineer.md` - Extender definición del agente
    - Agregar capacidades del SaaS
    - Incluir ejemplos de uso

2. `agents/sdet.md` - Extender definición del agente
    - Agregar integración con SaaS
    - Incluir nuevas responsabilidades

3. `skills/test-automation.md` - Agregar contexto del SaaS
    - Mencionar integración con plataforma
    - Agregar ejemplos de uso

4. `README.md` - Actualizar documentación del proyecto
    - Agregar sección del SaaS
    - Incluir instrucciones de desarrollo

## [Functions]
Single sentence describing function modifications.

**Nuevas funciones:**

1. `createAgent(config: QaAgentConfig): Promise<QaAgent>`
   - Archivo: `api/src/routes/agents.ts`
   - Propósito: Crear un nuevo agente de QA
   - Retorna: Agente creado

2. `generateBugReport(evidence: Evidence[], context: string): Promise<BugReport>`
   - Archivo: `api/src/services/agents/BugReporterAgent.ts`
   - Propósito: Generar reporte de bug con IA basado en evidencia
   - Retorna: Bug report estructurado

3. `generateTestCases(requirements: string, type: TestType): Promise<TestCase[]>`
   - Archivo: `api/src/services/agents/TestGeneratorAgent.ts`
   - Propósito: Generar casos de prueba a partir de requerimientos
   - Retorna: Lista de casos de prueba

4. `analyzeCoverage(projectId: string): Promise<CoverageAnalysis>`
   - Archivo: `api/src/services/agents/CoverageAnalyzerAgent.ts`
   - Propósito: Analizar cobertura de pruebas existente
   - Retorna: Análisis con recomendaciones

5. `generateImprovementPlan(userId: string): Promise<ImprovementPlan>`
   - Archivo: `api/src/services/agents/ImprovementPlannerAgent.ts`
   - Propósito: Generar plan de mejora personalizado
   - Retorna: Plan con acciones y recursos

6. `uploadEvidence(file: File, metadata: Record<string, unknown>): Promise<Evidence>`
   - Archivo: `api/src/services/storage.ts`
   - Propósito: Subir archivo de evidencia a S3
   - Retorna: Evidencia creada con URL

7. `syncWithJira(bug: BugReport): Promise<string>`
   - Archivo: `api/src/services/integrations/jira.ts`
   - Propósito: Sincronizar bug con Jira
   - Retorna: ID del issue en Jira

8. `syncWithGitHub(bug: BugReport): Promise<string>`
   - Archivo: `api/src/services/integrations/github.ts`
   - Propósito: Sincronizar bug con GitHub
   - Retorna: ID del issue en GitHub

9. `captureScreenshot(): Promise<Blob>`
   - Archivo: `extension/src/content.ts`
   - Propósito: Capturar screenshot de la página actual
   - Retorna: Blob de la imagen

10. `sendToApi(evidence: EvidencePayload): Promise<void>`
    - Archivo: `extension/src/background.ts`
    - Propósito: Enviar evidencia capturada a la API
    - Retorna: void

## [Classes]
Single sentence describing class modifications.

**Nuevas clases:**

1. `BugReporterAgent`
   - Archivo: `api/src/services/agents/BugReporterAgent.ts`
   - Propósito: Agente especializado en generar reportes de bugs
   - Métodos:
     - `constructor(openai: OpenAI)` - Inicializa con cliente OpenAI
     - `async generate(evidence: Evidence[], context: string): Promise<BugReport>` - Genera reporte
     - `async refine(report: BugReport, feedback: string): Promise<BugReport>` - Refina reporte
   - Herencia: Implementa BaseAgent

2. `TestGeneratorAgent`
   - Archivo: `api/src/services/agents/TestGeneratorAgent.ts`
   - Propósito: Agente especializado en generar casos de prueba
   - Métodos:
     - `constructor(openai: OpenAI)` - Inicializa con cliente OpenAI
     - `async generate(requirements: string, type: TestType): Promise<TestCase[]>` - Genera casos
     - `async expand(testCase: TestCase): Promise<TestCase>` - Expande caso con más detalles
   - Herencia: Implementa BaseAgent

3. `CoverageAnalyzerAgent`
   - Archivo: `api/src/services/agents/CoverageAnalyzerAgent.ts`
   - Propósito: Agente especializado en analizar cobertura
   - Métodos:
     - `constructor(openai: OpenAI)` - Inicializa con cliente OpenAI
     - `async analyze(projectId: string): Promise<CoverageAnalysis>` - Analiza cobertura
     - `async suggestTests(uncoveredArea: UncoveredArea): Promise<string[]>` - Sugiere tests
   - Herencia: Implementa BaseAgent

4. `ImprovementPlannerAgent`
   - Archivo: `api/src/services/agents/ImprovementPlannerAgent.ts`
   - Propósito: Agente especializado en generar planes de mejora
   - Métodos:
     - `constructor(openai: OpenAI)` - Inicializa con cliente OpenAI
     - `async generatePlan(userId: string): Promise<ImprovementPlan>` - Genera plan
     - `async assessSkills(userId: string): Promise<SkillAssessment[]>` - Evalúa habilidades
   - Herencia: Implementa BaseAgent

5. `BaseAgent`
   - Archivo: `api/src/services/agents/BaseAgent.ts`
   - Propósito: Clase base para todos los agentes
   - Métodos:
     - `constructor(openai: OpenAI, systemPrompt: string)` - Inicializa
     - `async chat(messages: Message[]): Promise<string>` - Chat con IA
     - `async generateStructured<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T>` - Genera contenido estructurado
   - Herencia: Interfaz QaAgent

6. `S3StorageService`
   - Archivo: `api/src/services/storage.ts`
   - Propósito: Servicio de almacenamiento en S3
   - Métodos:
     - `constructor(config: S3Config)` - Inicializa con config de AWS
     - `async upload(file: Buffer, key: string): Promise<string>` - Upload a S3
     - `async getSignedUrl(key: string): Promise<string>` - Genera URL prefirmada
     - `async delete(key: string): Promise<void>` - Elimina archivo
   - Herencia: Interfaz StorageService

7. `JiraIntegration`
   - Archivo: `api/src/services/integrations/jira.ts`
   - Propósito: Integración con Jira
   - Métodos:
     - `constructor(config: JiraConfig)` - Inicializa con config
     - `async createIssue(bug: BugReport): Promise<string>` - Crea issue
     - `async updateIssue(issueId: string, updates: Partial<BugReport>): Promise<void>` - Actualiza
   - Herencia: Interfaz Integration

8. `GitHubIntegration`
   - Archivo: `api/src/services/integrations/github.ts`
   - Propósito: Integración con GitHub
   - Métodos:
     - `constructor(config: GitHubConfig)` - Inicializa con config
     - `async createIssue(bug: BugReport): Promise<string>` - Crea issue
     - `async updateIssue(issueId: string, updates: Partial<BugReport>): Promise<void>` - Actualiza
   - Herencia: Interfaz Integration

## [Dependencies]
Single sentence describing dependency modifications.

**Nuevas dependencias:**

**Backend (api/):**
1. **express** (^4.18+)
   - Framework web para la API
   - Licencia: MIT (gratuita)

2. **typescript** (^5.0+)
   - Tipado estático
   - Licencia: Apache 2.0 (gratuita)

3. **prisma** (^5.0+) / **@prisma/client** (^5.0+)
   - ORM para base de datos
   - Licencia: Apache 2.0 (gratuita)

4. **openai** (^4.0+)
   - Cliente de OpenAI para agentes de IA
   - Licencia: MIT (gratuita)

5. **jsonwebtoken** (^9.0+) / **bcryptjs** (^2.4+)
   - Autenticación y hasheo de contraseñas
   - Licencia: MIT (gratuita)

6. **zod** (^3.22+)
   - Validación de schemas
   - Licencia: MIT (gratuita)

7. **@aws-sdk/client-s3** (^3.0+) / **@aws-sdk/s3-request-presigner** (^3.0+)
   - Cliente de AWS S3 para almacenamiento
   - Licencia: Apache 2.0 (gratuita)

8. **multer** (^1.4.5-lts.1)
   - Middleware para upload de archivos
   - Licencia: MIT (gratuita)

9. **cors** (^2.8+)
   - Middleware CORS
   - Licencia: MIT (gratuita)

10. **dotenv** (^16.3+)
    - Variables de entorno
    - Licencia: BSD-2-Clause (gratuita)

**Frontend (web/):**
1. **react** (^18.2+) / **react-dom** (^18.2+)
   - Librería de UI
   - Licencia: MIT (gratuita)

2. **react-router-dom** (^6.0+)
   - Enrutamiento
   - Licencia: MIT (gratuita)

3. **typescript** (^5.0+)
   - Tipado estático
   - Licencia: Apache 2.0 (gratuita)

4. **tailwindcss** (^3.3+)
   - Framework CSS utility-first
   - Licencia: MIT (gratuita)

5. **axios** (^1.6+)
   - Cliente HTTP
   - Licencia: MIT (gratuita)

6. **@tanstack/react-query** (^5.0+)
   - Estado del servidor y caching
   - Licencia: MIT (gratuita)

7. **react-hook-form** (^7.0+)
   - Manejo de formularios
   - Licencia: MIT (gratuita)

8. **lucide-react** (^0.294+)
   - Iconos
   - Licencia: ISC (gratuita)

**Extensión (extension/):**
1. **typescript** (^5.0+)
   - Tipado estático
   - Licencia: Apache 2.0 (gratuita)

2. **react** (^18.2+) / **react-dom** (^18.2+)
   - UI del popup y opciones
   - Licencia: MIT (gratuita)

3. **tailwindcss** (^3.3+)
   - Estilos
   - Licencia: MIT (gratuita)

4. **webextension-polyfill** (^0.10+)
   - Polyfill para APIs de extensión
   - Licencia: MPL-2.0 (gratuita)

5. **@types/chrome** (^0.0+)
   - Tipos para Chrome Extension API
   - Licencia: MIT (gratuita)

**Base de datos:**
1. **PostgreSQL** (v15+)
   - Base de datos relacional
   - Licencia: PostgreSQL License (gratuita)

**Scripts de npm:**
```json
{
  "api:dev": "cd api && npm run dev",
  "api:build": "cd api && npm run build",
  "api:start": "cd api && npm run start",
  "api:prisma:generate": "cd api && npx prisma generate",
  "api:prisma:migrate": "cd api && npx prisma migrate dev",
  "web:dev": "cd web && npm run dev",
  "web:build": "cd web && npm run build",
  "extension:build": "cd extension && npm run build",
  "dev": "concurrently \"npm run api:dev\" \"npm run web:dev\"",
  "build": "npm run api:build && npm run web:build && npm run extension:build"
}
```

## [Testing]
Single sentence describing testing approach.

**Estrategia de testing:**

1. **Tests unitarios (Vitest):**
   - Servicios de agentes
   - Funciones de utilidad
   - Validaciones de schemas

2. **Tests de integración (Supertest):**
   - Endpoints de API
   - Integraciones con Jira/GitHub
   - Upload de archivos

3. **Tests E2E (Playwright):**
   - Flujos críticos del frontend
   - Interacción con agentes
   - Captura de evidencia

4. **Tests de extensión (Jest + jsdom):**
   - Funcionalidad del popup
   - Captura de pantalla
   - Comunicación con API

**Archivos de test:**
- `api/tests/agents/BugReporterAgent.test.ts`
- `api/tests/agents/TestGeneratorAgent.test.ts`
- `api/tests/routes/bugs.test.ts`
- `api/tests/routes/tests.test.ts`
- `api/tests/services/storage.test.ts`
- `web/tests/components/AgentCard.test.tsx`
- `web/tests/components/BugList.test.tsx`
- `web/tests/hooks/useBugs.test.ts`
- `e2e/tests/bug-reporting.spec.ts`
- `e2e/tests/test-generation.spec.ts`
- `extension/tests/popup.test.ts`

**Validación:**
- Los tests unitarios deben pasar en local y CI
- Los tests de integración deben cubrir endpoints críticos
- Los tests E2E deben validar flujos completos
- Cobertura mínima: 80%

## [Implementation Order]
Single sentence describing the implementation sequence.

**Pasos de implementación:**

1. **Paso 1: Configuración del proyecto base**
   - Crear estructura de directorios (web/, api/, extension/)
   - Configurar package.json en cada módulo
   - Configurar TypeScript en cada módulo
   - Instalar dependencias base

2. **Paso 2: Configurar backend base**
   - Configurar Express server
   - Configurar Prisma con PostgreSQL
   - Crear schema de base de datos
   - Configurar autenticación JWT
   - Implementar middleware base

3. **Paso 3: Implementar almacenamiento**
   - Configurar AWS S3
   - Implementar S3StorageService
   - Crear rutas de evidencia
   - Probar upload de archivos

4. **Paso 4: Implementar agentes base**
   - Crear clase BaseAgent
   - Implementar BugReporterAgent
   - Implementar TestGeneratorAgent
   - Probar generación con OpenAI

5. **Paso 5: Implementar rutas de API**
   - Rutas de bugs (CRUD + generación)
   - Rutas de tests (CRUD + generación)
   - Rutas de evidencia (upload + listado)
   - Rutas de agentes (CRUD + activación)

6. **Paso 6: Implementar integraciones**
   - Integración con Jira
   - Integración con GitHub
   - Sincronización de bugs

7. **Paso 7: Implementar frontend base**
   - Configurar React app
   - Crear layout (Navbar, Sidebar)
   - Implementar rutas y navegación
   - Configurar React Query

8. **Paso 8: Implementar componentes de agentes**
   - AgentCard para mostrar agentes
   - AgentChat para interactuar con agentes
   - Integrar con API de agentes

9. **Paso 9: Implementar componentes de bugs**
   - BugList para listar bugs
   - BugDetail para ver detalle
   - EvidenceUploader para adjuntar evidencia
   - Integrar con API de bugs

10. **Paso 10: Implementar componentes de tests**
    - TestList para listar tests
    - Generación de tests con IA
    - Filtros y búsqueda

11. **Paso 11: Implementar dashboard de cobertura**
    - CoverageDashboard con gráficas
    - Análisis de áreas sin cobertura
    - Recomendaciones

12. **Paso 12: Implementar planes de mejora**
    - ImprovementPlanView
    - Implementar CoverageAnalyzerAgent
    - Implementar ImprovementPlannerAgent
    - Generar planes personalizados

13. **Paso 13: Implementar extensión de navegador**
    - Configurar manifest
    - Implementar content script para captura
    - Implementar popup para envío
    - Probar captura y envío

14. **Paso 14: Configurar CI/CD**
   - GitHub Actions para tests
   - Build automático
   - Deploy a staging

15. **Paso 15: Testing y validación**
   - Ejecutar tests unitarios
   - Ejecutar tests de integración
   - Ejecutar tests E2E
   - Validar flujos completos

16. **Paso 16: Documentación y preparación para lanzamiento**
   - Actualizar README
   - Crear guía de usuario
   - Crear guía de desarrollo
   - Preparar landing page