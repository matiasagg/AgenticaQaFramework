### HDU-XX: Bosquejo para ordenar y jerarquizar requerimientos

> **Estado:** Propuesta para validación funcional. No implica todavía cambios en el modelo de datos.

## Resumen ejecutivo

Se propone organizar el SaaS con una jerarquía simple y trazable:

```text
Proyecto
└── Épica
    └── Feature
        └── HDU
            ├── Tarea técnica
            ├── Caso de prueba
            └── Bug
```

Los elementos de planificación se mantienen separados:

```text
Proyecto ── Release / Milestone / Sprint ── Backlog ordenado
```

La primera versión debería resolver únicamente el ordenamiento y la trazabilidad de las HDUs. La incorporación de épicas, features, releases y escenarios BDD puede hacerse de forma incremental.

## Decisiones que se deben validar

- [ ] ¿`Project` será el contexto raíz del producto?
- [ ] ¿Una `Epic` agrupará varias `Feature`?
- [ ] ¿Una `Feature` agrupará varias HDUs?
- [ ] ¿Las tareas técnicas y los casos de prueba serán entidades independientes o relaciones de la HDU?
- [ ] ¿`Milestone`, `Release` y `Sprint` serán agrupadores temporales, sin formar parte de la jerarquía?
- [ ] ¿El backlog se ordenará manualmente mediante `sortOrder`?
- [ ] ¿BDD será opcional y se almacenará como escenarios asociados a los criterios de aceptación?

## Propuesta mínima para el MVP

1. Agregar orden persistente al backlog de HDUs.
2. Permitir reordenamiento manual mediante drag and drop o controles arriba/abajo.
3. Mantener filtros por estado, prioridad, proyecto y sprint.
4. Permitir dependencias entre HDUs.
5. Mostrar bugs, pruebas y tareas vinculadas.
6. Agregar `Epic` y `Feature` como relaciones opcionales, sin obligar a migrar todas las HDUs existentes.

## Fuera de alcance inicial

- Implementar un framework completo de Jira o Azure DevOps.
- Crear una jerarquía obligatoria de muchos niveles.
- Ejecutar escenarios BDD automáticamente.
- Convertir TDD o BDD en tipos de requerimiento.
- Implementar roadmap, portfolio management o métricas avanzadas.


**Prioridad:** P1  
**Agente Asignado:** POA / TLA  
**Dependencias:** []

**Descripción:**

**Como** Product Owner o responsable de QA, **quiero** organizar los requerimientos del producto mediante una jerarquía clara, separando niveles de planificación, desarrollo, ejecución y verificación, **para** priorizar el trabajo, mantener la trazabilidad y evitar confundir entidades como Epic, Feature, HDU, Issue, Milestone, Test y Bug.

La solución debe adoptar un modelo comprensible para equipos que trabajan con enfoques ágiles y prácticas de calidad como BDD y TDD, sin imponer que estas prácticas sean entidades del backlog.

## Objetivo

Definir un modelo común para:

1. Ordenar las necesidades del negocio desde el mayor nivel de abstracción hasta el trabajo ejecutable.
2. Relacionar requerimientos con entregas, iteraciones, tareas, bugs y pruebas.
3. Mantener trazabilidad desde una necesidad de negocio hasta su implementación y evidencia de calidad.
4. Permitir priorización por valor, riesgo, dependencias y urgencia.
5. Evitar mezclar jerarquía del producto con métodos de desarrollo o niveles de prueba.

## Opciones utilizadas en el mercado

| Producto / enfoque | Jerarquía o modelo habitual | Cómo se llevan los desarrollos | Observaciones |
|---|---|---|---|
| **Jira / Jira Product Discovery** | Initiative / Theme → Epic → Story / Task / Bug → Sub-task. Versiones, releases y sprints organizan el tiempo. | El Product Owner prioriza el backlog; el equipo planifica el sprint; las historias se implementan mediante tareas y se cierran con pruebas y revisión. | Modelo muy completo y configurable. Conviene no abusar de los niveles personalizados. |
| **Azure DevOps Boards** | Epic → Feature → User Story / Product Backlog Item → Task / Bug. Iterations y Areas agregan planificación y contexto. | Features se dividen en historias; las historias en tareas; el equipo trabaja por sprint y vincula commits, PRs, builds y tests. | Fuerte trazabilidad entre backlog, código, CI/CD y pruebas. |
| **GitHub Projects / Issues** | No impone una jerarquía estricta. Se suelen usar Issue, sub-issue, task list, milestone, labels y Projects. | Una Issue representa trabajo; las sub-issues descomponen el trabajo; milestones agrupan entregas; Projects ofrece vistas de backlog, board o roadmap. | Flexible y simple, pero la jerarquía debe definirse mediante convenciones del equipo. |
| **GitLab** | Epic → Issue → Task / Child issue. Milestones, iterations y roadmaps organizan la ejecución. | Un Epic agrupa issues; cada issue puede tener tareas hijas; merge requests, pipelines y tests se vinculan al trabajo. | Buena integración entre planificación, repositorio, CI/CD y seguridad. |
| **Linear** | Initiative → Project → Issue. Las issues pueden tener sub-issues; cycles y milestones organizan el trabajo. | Un proyecto representa un resultado concreto; las issues son unidades pequeñas que se priorizan y ejecutan en cycles. | Modelo liviano, orientado a equipos de producto y desarrollo. |
| **YouTrack** | Proyectos con issues configurables, subtareas, sprints, versiones y enlaces entre issues. | El equipo adapta tipos, estados y workflows; las tareas se asignan a sprints y se relacionan con bugs o cambios. | Flexible para Scrum, Kanban y flujos personalizados. |
| **Shortcut** | Objective → Epic → Story → Task / Bug. Iterations y milestones soportan la planificación. | Las stories describen trabajo de producto; tasks y bugs permiten ejecutar y validar cada story. | Enfoque directo para equipos ágiles, con poca burocracia. |
| **Rally / herramientas SAFe** | Portfolio Epic → Capability → Feature → User Story → Task. | La planificación baja desde portfolio hacia equipos, releases, iterations y tareas. | Adecuado para organizaciones grandes; puede ser excesivo para un equipo pequeño. |
| **Aha! / Productboard** | Ideas / feedback → Initiative → Feature → Release / roadmap. | Primero se valida el problema y el valor; luego se priorizan features y se sincronizan con una herramienta de ejecución como Jira. | Más orientado a discovery, estrategia y roadmap que a ejecución técnica. |
| **Trello / Asana / Monday** | Listas, tableros, tareas, subtareas, proyectos y dependencias. | El trabajo se mueve por estados o columnas; la jerarquía depende principalmente de la configuración del equipo. | Útiles para coordinación general, pero menos especializados en trazabilidad de requisitos y pruebas. |

## Modelo recomendado para esta plataforma

Se recomienda separar cuatro dimensiones que suelen confundirse:

### 1. Jerarquía del producto y del requerimiento

```text
Objetivo / Iniciativa
└── Épica (Epic)
    └── Feature / Capacidad
        └── HDU (User Story)
            ├── Tarea técnica
            ├── Subtarea
            ├── Caso de prueba
            └── Bug relacionado
```

- **Objetivo / Iniciativa:** resultado estratégico o problema de alto nivel.
- **Épica:** gran resultado de producto que requiere varias entregas.
- **Feature:** capacidad observable para el usuario o el negocio.
- **HDU:** unidad de valor pequeña, verificable y potencialmente entregable dentro de una iteración.
- **Tarea técnica:** trabajo necesario para implementar una HDU, aunque no siempre tenga valor directo para el usuario.
- **Subtarea:** división operativa de una tarea o HDU.
- **Bug:** desviación respecto de un comportamiento esperado; puede vincularse a una HDU, feature o caso de prueba.
- **Caso de prueba:** verificación de un comportamiento, no un requerimiento.

### 2. Planificación y entrega

```text
Proyecto
├── Release / Versión
├── Milestone
├── Sprint / Iteration / Cycle
└── Backlog priorizado
```

- **Proyecto:** contexto organizacional y técnico que contiene el producto o iniciativa.
- **Release / Versión:** conjunto de funcionalidades que se pretende entregar.
- **Milestone:** hito o fecha de control; no necesariamente contiene una sola funcionalidad.
- **Sprint / Iteration / Cycle:** ventana de ejecución del equipo.
- **Backlog:** lista ordenada de trabajo pendiente, no una entidad de negocio independiente.

### 3. Calidad y trazabilidad

```text
HDU / Feature
└── Criterios de aceptación
    ├── Escenarios BDD (Given / When / Then)
    ├── Casos de prueba funcionales
    ├── Tests automatizados
    └── Evidencia de ejecución
```

Los criterios de aceptación definen cuándo el requerimiento es aceptable. Los casos de prueba y la evidencia demuestran si se cumple.

### 4. Prácticas de desarrollo

- **BDD (Behavior-Driven Development):** práctica para especificar el comportamiento esperado desde ejemplos comprensibles para negocio, QA y desarrollo. Usa escenarios como **Given / When / Then**.
- **TDD (Test-Driven Development):** práctica de implementación en la que se escribe primero una prueba automatizada, se implementa el mínimo código para hacerla pasar y luego se refactoriza.
- **ATDD (Acceptance Test-Driven Development):** práctica colaborativa donde se acuerdan primero las pruebas de aceptación del requerimiento.
- **Specification by Example:** especificación mediante ejemplos concretos y verificables; BDD es una de sus formas más conocidas.
- **Shift-left testing:** incorporación de actividades de calidad desde el refinamiento, antes de que termine la implementación.

BDD, TDD y ATDD **no deben modelarse como niveles de jerarquía**. Son prácticas que pueden aplicarse sobre una HDU, sus criterios de aceptación, sus tareas y sus pruebas.

## Flujo de desarrollo propuesto

```text
Descubrimiento del problema
→ Iniciativa / Épica
→ Feature
→ HDU atómica
→ Refinamiento y DoR
→ Criterios de aceptación / escenarios BDD
→ Tareas técnicas y pruebas TDD/ATDD
→ Implementación
→ Revisión de código y CI
→ Ejecución de pruebas
→ Validación QA / DoD
→ Release
```

### Definition of Ready (DoR)

Una HDU puede entrar al desarrollo cuando tiene, como mínimo:

- Valor y usuario objetivo claros.
- Descripción en formato de historia de usuario.
- Criterios de aceptación verificables.
- Dependencias identificadas.
- Prioridad y estimación.
- Alcance suficientemente pequeño para una iteración.
- Riesgos técnicos conocidos o registrados.

### Definition of Done (DoD)

Una HDU puede marcarse como completada cuando:

- La implementación está integrada y revisada.
- Los tests automatizados relevantes pasan.
- Los criterios de aceptación fueron validados.
- No existen bugs bloqueantes asociados.
- La documentación y la evidencia requerida están actualizadas.
- La funcionalidad está disponible en el entorno acordado.

## Criterios de Aceptación

- [ ] El sistema permite distinguir entre iniciativa, épica, feature, HDU, tarea, subtarea, bug y caso de prueba.
- [ ] El sistema permite relacionar una HDU con una épica o feature padre.
- [ ] El sistema permite relacionar tareas, subtareas, casos de prueba y bugs con una HDU.
- [ ] El sistema permite asociar HDUs a proyectos, releases, milestones y sprints sin confundir esas entidades con la jerarquía del requerimiento.
- [ ] El backlog permite ordenar HDUs mediante prioridad y, como mínimo, soporta reordenamiento manual.
- [ ] El sistema muestra las dependencias que bloquean o son bloqueadas por una HDU.
- [ ] El sistema conserva la trazabilidad desde la iniciativa o épica hasta la evidencia de pruebas y los bugs relacionados.
- [ ] Los criterios de aceptación pueden expresarse como texto verificable y, opcionalmente, como escenarios Given / When / Then.
- [ ] La documentación funcional explica que BDD, TDD y ATDD son prácticas de desarrollo y calidad, no tipos de requerimiento.
- [ ] El ordenamiento funciona con una vista de backlog y una vista jerárquica tipo árbol.
- [ ] Los cambios de orden mantienen la prioridad al recargar la página y son consistentes entre usuarios autorizados.
- [ ] La solución permite evolucionar desde el modelo actual de `Project` y `UserStory` sin romper los datos existentes.

## Notas Técnicas (TLA)

- Mantener `Project` como contexto raíz en la primera versión.
- Considerar `Epic`, `Feature` y `UserStory/HDU` como entidades relacionadas por `parentId` o relaciones explícitas, evitando un único campo ambiguo para todos los tipos.
- Usar relaciones explícitas para `blocks`, `blockedBy`, `relatesTo` y `duplicates` cuando se implemente el grafo de dependencias.
- Mantener `Milestone`, `Release` y `Sprint` como agrupadores temporales o de entrega, no como padres obligatorios de una HDU.
- Definir un campo de orden estable, por ejemplo `backlogRank` o `sortOrder`, y no depender únicamente de `priority` para ordenar.
- Mantener compatibilidad con las rutas actuales de HDUs y agregar endpoints específicos solo cuando el dominio esté definido.
- Evaluar una migración incremental: primero ordenamiento de HDUs, luego relaciones Epic/Feature, y finalmente trazabilidad con pruebas y releases.
- Para BDD, almacenar escenarios o criterios de aceptación como datos estructurados solo cuando exista una necesidad concreta de ejecución automatizada; no obligar a todos los equipos a usar Gherkin.

## Recomendación de alcance

### MVP

1. Ordenar HDUs manualmente por `sortOrder`.
2. Filtrar por prioridad, estado, proyecto y sprint.
3. Agregar relación opcional con `Epic` y `Feature`.
4. Agregar dependencias entre HDUs.
5. Mostrar criterios de aceptación, tests y bugs relacionados.

### Evolución posterior

1. Roadmap de iniciativas, épicas, features y releases.
2. Vista de árbol y vista de dependencias.
3. Importación o sincronización con GitHub, Jira o Azure DevOps.
4. Escenarios BDD estructurados y generación de casos de prueba.
5. Métricas de flujo: lead time, cycle time, throughput, bloqueos y defectos por release.

## Evidencia Requerida

- [ ] Captura de la vista de backlog ordenable.
- [ ] Captura de la vista jerárquica Initiative → Epic → Feature → HDU.
- [ ] Test de persistencia del ordenamiento.
- [ ] Test de relaciones y dependencias.
- [ ] Test de regresión para las HDUs existentes.
- [ ] Documentación actualizada del modelo de dominio y del flujo BDD/TDD.
