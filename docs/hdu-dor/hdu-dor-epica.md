# HDU: DoR configurable para el tipo de trabajo Épica

## Objetivo

Analizar y desarrollar la **configuración y ejecución del Definition of Ready (DoR)** para el tipo de trabajo **Épica**, aplicable sea cual sea el modelo de trabajo (jerárquico o por etiquetas) y el proveedor de origen (GitHub, Azure DevOps o manual).

Idea central: cada tipo de trabajo debe poder definir **sus propios criterios DoR configurables**, no depender de una checklist fija global.

## Contexto

- El DoR actual de épicas vive en `api/src/services/portfolioDor.ts` con un checklist fijo (`validatePortfolioDor` para `kind: 'EPIC'`), expuesto desde `api/src/routes/epics.ts`.
- La estructura de tipos de trabajo se configura en la HDU #73 (modelo de trabajo y estructura por proyecto).
- Este DoR debe funcionar para una Épica importada desde cualquier proveedor, no solo del flujo manual.

## Alcance

1. Definir el esquema de criterios DoR del tipo Épica: criterios por defecto + criterios personalizados por proyecto.
2. Persistir la configuración de criterios por proyecto y tipo de trabajo (activados, obligatorios, peso/puntuación, plantilla).
3. Ejecutar la validación del DoR de épicas usando la configuración del proyecto.
4. Exponer resultado de DoR (score, checklist, items faltantes, estado ready) en API y UI.
5. Compatibilidad: mantener el checklist actual como plantilla por defecto y migrar proyectos existentes.
6. Trazabilidad: cada ejecución de DoR guarda fecha, versión de configuración y resultado.
7. Independencia del modelo/proveedor: la validación usa el modelo interno, no la herramienta de origen.

## Fuera de alcance

- La configuración de estructura y tipos de la HDU #73.
- Los otros tipos de trabajo (Feature, HDU, Tarea, Bug), cada uno con su propia HDU.

## Criterios de aceptación

1. El proyecto puede editar los criterios DoR del tipo Épica (agregar, editar, desactivar, marcar obligatorio).
2. Los criterios por defecto replican el comportamiento actual de `validatePortfolioDor` para Épica cuando no se personalizan.
3. La validación usa la configuración vigente del proyecto y no afecta a otros proyectos.
4. La API `GET/PUT` de configuración DoR valida pertenencia al proyecto y rechaza configuraciones inválidas (400) con mensaje claro.
5. El score se calcula según los criterios habilitados y su peso; los items obligatorios faltantes impiden el estado "ready".
6. El resultado de DoR se muestra en la vista de Épicas y queda disponible para métricas de cobertura.
7. Existe registro de la versión de configuración usada en cada validación.
8. Las suites existentes de `portfolioDor` siguen pasando y se amplían con los nuevos escenarios.

## Pruebas

- Unitarias: cálculo de score, criterios obligatorios/pesos, configuración inválida, plantilla por defecto.
- API: GET/PUT configuración, autorización por proyecto, aislamiento entre proyectos, errores 400/404.
- Regresión: `api/src/tests/services/portfolioDor.test.ts` y rutas `epics.test.ts`.
- E2E: editar criterios DoR de una Épica y verificar que el checklist refleja los cambios.

## Trazabilidad

- Rama: `feature/hdu-{n}-dor-epica`.
- Commits: `feat(dor-epica): ...`, `test(dor-epica): ...`.
- Relacionada con HDU #73 (modelo de trabajo).