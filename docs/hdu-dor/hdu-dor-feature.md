# HDU: DoR configurable para el tipo de trabajo Feature

## Objetivo

Analizar y desarrollar la **configuración y ejecución del Definition of Ready (DoR)** para el tipo de trabajo **Feature**, aplicable sea cual sea el modelo de trabajo (jerárquico o por etiquetas) y el proveedor de origen (GitHub, Azure DevOps o manual).

Cada proyecto debe poder definir los criterios de listo de sus Features en lugar de depender de una checklist fija.

## Contexto

- El DoR actual de features vive en `api/src/services/portfolioDor.ts` (`validatePortfolioDor` para `kind: 'FEATURE'`), expuesto desde `api/src/routes/features.ts`.
- La estructura de tipos de trabajo se configura en la HDU #73 (modelo de trabajo y estructura por proyecto).
- En el modelo por etiquetas, una Feature puede llegar como un issue clasificado con label `feature`, por lo que el DoR debe aplicarse sobre el modelo interno.

## Alcance

1. Esquema de criterios DoR del tipo Feature: plantilla por defecto + criterios personalizados por proyecto.
2. Persistencia de la configuración por proyecto y tipo (activados, obligatorios, peso, plantilla).
3. Ejecución de la validación de DoR de Features con la configuración del proyecto.
4. Exposición de resultado (score, checklist, faltantes, ready) en API y UI.
5. Compatibilidad: la plantilla por defecto replica el checklist actual; migración de proyectos existentes.
6. Trazabilidad: cada ejecución guarda fecha, versión de configuración y resultado.
7. Independencia del modelo/proveedor.

## Fuera de alcance

- Configuración de estructura y tipos de la HDU #73.
- Los demás tipos de trabajo (Épica, HDU, Tarea, Bug), cada uno con su propia HDU.

## Criterios de aceptación

1. El proyecto puede editar los criterios DoR del tipo Feature (agregar, editar, desactivar, marcar obligatorio).
2. Sin personalización, el resultado replica el comportamiento actual de `validatePortfolioDor` para Feature.
3. La configuración es por proyecto y no afecta a otros proyectos.
4. La API de configuración valida autorización y rechaza payloads inválidos con 400 y mensaje claro.
5. El score usa criterios habilitados y pesos; los obligatorios faltantes bloquean el estado ready.
6. El resultado se muestra en la vista de Features y alimenta métricas de cobertura.
7. Cada validación registra la versión de configuración usada.
8. Las suites `portfolioDor` y de `features` siguen pasando y se amplían.

## Pruebas

- Unitarias: score, obligatorios/pesos, configuración inválida, plantilla por defecto.
- API: GET/PUT configuración, autorización, aislamiento entre proyectos, 400/404.
- Regresión: `api/src/tests/services/portfolioDor.test.ts` y rutas `features`.
- E2E: editar criterios DoR de una Feature y verificar el checklist actualizado.

## Trazabilidad

- Rama: `feature/hdu-{n}-dor-feature`.
- Commits: `feat(dor-feature): ...`, `test(dor-feature): ...`.
- Relacionada con HDU #73 (modelo de trabajo).