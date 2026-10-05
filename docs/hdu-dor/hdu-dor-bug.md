# HDU: DoR configurable para el tipo de trabajo Bug

## Objetivo

Analizar y desarrollar la **configuración y ejecución del Definition of Ready (DoR)** para el tipo de trabajo **Bug**, aplicable sea cual sea el modelo de trabajo (jerárquico o por etiquetas) y el proveedor de origen (GitHub, Azure DevOps o manual).

Cada proyecto debe poder definir qué hace que un bug esté "listo para atacar": datos de reproducción, severidad, entorno, evidencias, impacto, etc.

## Contexto

- Los bugs tienen DoR vía `validatePortfolioDor` con `kind: 'BUG'` (que reutiliza `validateDoR`) y rutas en `api/src/routes/bugs.ts`; existe además push de bugs a GitHub.
- La estructura de tipos de trabajo se configura en la HDU #73 (modelo de trabajo y estructura por proyecto).
- En el modelo por etiquetas, un bug se clasifica con label `bug`; en el jerárquico es un tipo de work item con reglas propias.

## Alcance

1. Esquema de criterios DoR del tipo Bug: plantilla por defecto + criterios personalizados por proyecto.
2. Persistencia de la configuración por proyecto y tipo (activados, obligatorios, peso, plantilla).
3. Ejecución de la validación de DoR de bugs con la configuración del proyecto.
4. Exposición de resultado (score, checklist, faltantes, ready) en API y UI.
5. Compatibilidad: la plantilla por defecto replica el comportamiento actual de `validatePortfolioDor` para BUG; migración de proyectos existentes.
6. Trazabilidad: cada validación registra fecha, versión de configuración y resultado.
7. Independencia del modelo/proveedor.
8. Evaluación de si el DoR debe influir en el flujo de bugs (por ejemplo, bloquear asignación o push a GitHub hasta estar ready), dejando la decisión explícita en el análisis.

## Fuera de alcance

- Configuración de estructura y tipos de la HDU #73.
- Los demás tipos de trabajo (Épica, Feature, HDU, Tarea), cada uno con su propia HDU.

## Criterios de aceptación

1. El proyecto puede editar los criterios DoR del tipo Bug (agregar, editar, desactivar, marcar obligatorio).
2. Sin personalización, el resultado replica el comportamiento actual de `validatePortfolioDor` para BUG.
3. La configuración es por proyecto y no afecta a otros proyectos.
4. La API de configuración valida autorización y rechaza payloads inválidos con 400 y mensaje claro.
5. El score usa criterios habilitados y pesos; los obligatorios faltantes bloquean el estado ready.
6. El resultado se muestra en la vista de Bugs.
7. Cada validación registra la versión de configuración usada.
8. Las suites existentes de bugs y `portfolioDor` siguen pasando y se amplían con los nuevos escenarios.

## Pruebas

- Unitarias: score, obligatorios/pesos, configuración inválida, plantilla por defecto.
- API: GET/PUT configuración, autorización, aislamiento entre proyectos, 400/404, validación de bug existente.
- Regresión: `portfolioDor.test.ts`, rutas `bugs`, push a GitHub.
- E2E: editar criterios DoR de un Bug y verificar el checklist actualizado.

## Trazabilidad

- Rama: `feature/hdu-{n}-dor-bug`.
- Commits: `feat(dor-bug): ...`, `test(dor-bug): ...`.
- Relacionada con HDU #73 (modelo de trabajo).