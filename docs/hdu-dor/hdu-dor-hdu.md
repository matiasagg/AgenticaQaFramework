# HDU: DoR configurable para el tipo de trabajo HDU (Historia de Usuario)

## Objetivo

Analizar y desarrollar la **configuración y ejecución del Definition of Ready (DoR)** para el tipo de trabajo **HDU / Historia de Usuario**, aplicable sea cual sea el modelo de trabajo (jerárquico o por etiquetas) y el proveedor de origen (GitHub, Azure DevOps o manual).

El proyecto debe poder configurar sus propios criterios de "historia lista" y usarlos al validar, generar suites de pruebas y desbloquear flujos dependientes del DoR.

## Contexto

- El DoR actual de HDUs vive en `api/src/services/dorValidator.ts` (`validateDoR`), con checklist, score, recomendaciones y sugerencias IA (`geminiAI.ts`), usado desde `api/src/routes/userStories.ts`, `chat.ts` y `bugs.ts`.
- La estructura de tipos de trabajo se configura en la HDU #73 (modelo de trabajo y estructura por proyecto).
- Varios flujos dependen del estado ready (`isReady`): generación de suites, validaciones de portfolio, recomendaciones de cobertura.

## Alcance

1. Esquema de criterios DoR del tipo HDU: plantilla por defecto (checklist actual de `dorValidator`) + criterios personalizados por proyecto.
2. Persistencia de la configuración por proyecto y tipo (activados, obligatorios, peso, plantilla).
3. Ejecución de `validateDoR` con la configuración del proyecto, manteniendo compatibilidad con el resultado actual (score, checklist, recomendaciones, sugerencias IA).
4. Exposición de resultado (score, checklist, faltantes, ready) en API y UI.
5. Migración de proyectos existentes usando la plantilla por defecto.
6. Trazabilidad: cada validación registra fecha, versión de configuración y resultado.
7. Independencia del modelo/proveedor: una HDU importada de cualquier origen valida igual.

## Fuera de alcance

- Configuración de estructura y tipos de la HDU #73.
- Los demás tipos de trabajo (Épica, Feature, Tarea, Bug), cada uno con su propia HDU.

## Criterios de aceptación

1. El proyecto puede editar los criterios DoR del tipo HDU (agregar, editar, desactivar, marcar obligatorio).
2. Sin personalización, el resultado replica el comportamiento actual de `validateDoR` (mismo score y checklist base).
3. La configuración es por proyecto y no afecta a otros proyectos.
4. La API de configuración valida autorización y rechaza payloads inválidos con 400 y mensaje claro.
5. El score usa criterios habilitados y pesos; los obligatorios faltantes impiden `isReady`.
6. El estado ready sigue controlando la generación de suites de pruebas.
7. Las sugerencias IA siguen mapeando a criterios válidos del checklist configurado.
8. Cada validación registra la versión de configuración usada.
9. Las suites `dorValidator` y rutas `userStories` siguen pasando y se amplían.

## Pruebas

- Unitarias: score, obligatorios/pesos, configuración inválida, plantilla por defecto, mapeo de sugerencias IA.
- API: GET/PUT configuración, autorización, aislamiento entre proyectos, 400/404, validación de DoR existente.
- Regresión: `dorValidator.test.ts`, rutas `userStories`, `chat` y flujos de generación de suites.
- E2E: editar criterios DoR de una HDU, validar y verificar el checklist y el estado ready.

## Trazabilidad

- Rama: `feature/hdu-{n}-dor-hdu`.
- Commits: `feat(dor-hdu): ...`, `test(dor-hdu): ...`.
- Relacionada con HDU #73 (modelo de trabajo).