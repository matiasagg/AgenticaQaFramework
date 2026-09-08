# Propuestas de diseño visual para el SaaS

## Diagnóstico breve

La interfaz actual es funcional, pero visualmente se percibe como un panel administrativo genérico por estas razones:

- La navegación lateral es extensa y todos los módulos tienen el mismo peso visual.
- El dashboard está basado principalmente en tarjetas y barras simples.
- Los emojis funcionan como iconos, pero no construyen una identidad visual consistente.
- Falta una jerarquía visual fuerte entre análisis estático, pruebas dinámicas, resultados y riesgos.
- El Chat IA aparece como una función separada, en lugar de integrarse al flujo de trabajo.
- El sistema utiliza principalmente grises y azul, sin estados visuales suficientemente expresivos.

La navegación actual está definida en `web/src/components/layout/Sidebar.tsx` y la estructura general en `web/src/components/layout/Layout.tsx`. El dashboard actual se concentra en tarjetas, bugs y distribución de tests.

---

## Propuesta A — QA Command Center

### Concepto

Un centro de control profesional para analizar el estado de calidad y riesgo del software. La prioridad visual son los resultados, los bloqueos y las acciones recomendadas.

### Personalidad visual

- Profesional.
- Analítica.
- Orientada a operaciones.
- Similar a un centro de observabilidad o plataforma DevOps.

### Paleta

- Fondo: `#0B1120` o azul noche.
- Superficies: `#111827` y `#172033`.
- Primario: azul eléctrico `#3B82F6`.
- Éxito: verde `#22C55E`.
- Riesgo: ámbar `#F59E0B`.
- Error: rojo `#EF4444`.
- Información: cyan `#06B6D4`.

### Estructura

```text
┌─────────────────────────────────────────────────────────┐
│ Logo | Proyecto actual | Buscar | Notificaciones | Usuario│
├──────────────┬──────────────────────────────────────────┤
│ Navegación   │ Score de riesgo   Tests   Bugs   Cobertura│
│              ├──────────────────────────────────────────┤
│ Overview     │ Tendencia de ejecuciones                 │
│ Requerimientos│                                         │
│ Pruebas      ├───────────────────┬──────────────────────┤
│ Resultados   │ Requerimientos    │ Actividad reciente   │
│ Evidencia    │ en riesgo         │                      │
│ Integraciones│                   │                      │
└──────────────┴───────────────────┴──────────────────────┘
```

### Componentes clave

- Score global de riesgo.
- Semáforo por épica y feature.
- Timeline de ejecuciones.
- Panel de bloqueos.
- Alertas accionables.
- Estado de CI/CD.
- Comparación entre análisis estático y pruebas dinámicas.

### Ventajas

- Muy claro para visualizar el estado general.
- Refuerza el posicionamiento de pruebas estáticas y dinámicas.
- Escala bien para equipos técnicos.
- Convierte el dashboard en una herramienta de decisión.

### Riesgos

- Puede sentirse demasiado técnico para usuarios no especializados.
- Requiere implementar métricas reales para no parecer una pantalla decorativa.

---

## Propuesta B — Product Quality Workspace

### Concepto

Un espacio de trabajo centrado en el requerimiento: cada HDU funciona como un objeto de trabajo que contiene análisis, pruebas, ejecuciones, evidencia y bugs.

### Personalidad visual

- Moderna.
- Colaborativa.
- Cercana a Linear, Height o Notion.
- Menos administrativa y más orientada al flujo del producto.

### Paleta

- Fondo claro cálido: `#F8FAFC`.
- Superficies: blanco.
- Texto: `#172033`.
- Primario: índigo `#6366F1`.
- Acento: violeta `#8B5CF6`.
- Éxito: esmeralda `#10B981`.
- Riesgo: naranja `#F97316`.
- Error: rosa-rojo `#F43F5E`.

### Estructura

```text
┌─────────────────────────────────────────────────────────┐
│ Proyecto / Breadcrumb       Buscar   IA   Usuario       │
├──────────────┬──────────────────────────────────────────┤
│ Inbox        │ Épica: Checkout                           │
│ Backlog      │ ├─ Feature: Pagos                         │
│ Épicas       │ │  ├─ HDU-021  Score 92%                  │
│ Features     │ │  ├─ HDU-022  2 fallos                  │
│ HDUs         │ │  └─ HDU-023  Sin cobertura             │
│ Pruebas      │                                            │
│ Bugs         │ Panel lateral de detalle contextual      │
│ Evidencia    │                                            │
└──────────────┴──────────────────────────────────────────┘
```

### Componentes clave

- Backlog tipo árbol.
- Panel lateral de detalle sin abandonar la lista.
- Tabs por HDU:
  - Resumen.
  - Análisis estático.
  - Criterios de aceptación.
  - Casos de prueba.
  - Ejecuciones.
  - Evidencia.
  - Bugs.
- Estados visuales con badges y barras de progreso.
- Comentarios y sugerencias del Chat IA dentro del contexto.

### Ventajas

- Hace que la trazabilidad sea el centro de la experiencia.
- Reduce la sensación de tener muchos módulos desconectados.
- Es ideal para trabajar diariamente sobre HDUs.
- Facilita incorporar drag and drop y ordenamiento.

### Riesgos

- Puede requerir reorganizar la navegación actual.
- El dashboard general tendría menos protagonismo que el workspace.

---

## Propuesta C — AI Testing Studio

### Concepto

Un estudio de pruebas asistido por IA. La interfaz guía al usuario desde el análisis de una HDU hasta la generación y ejecución de pruebas.

### Personalidad visual

- Innovadora.
- Asistida.
- Experimental, pero profesional.
- La IA está integrada en cada paso, no aislada en un chat flotante.

### Paleta

- Fondo: `#0F1020`.
- Superficies: `#1A1B2E`.
- Primario: violeta `#7C3AED`.
- Acento: cyan `#22D3EE`.
- Secundario: fucsia moderado `#EC4899`.
- Éxito: `#34D399`.
- Riesgo: `#FBBF24`.
- Error: `#FB7185`.

### Estructura

```text
┌─────────────────────────────────────────────────────────┐
│ Proyecto | Flujo: HDU-021 | Guardar | Ejecutar          │
├──────────────┬───────────────────────┬──────────────────┤
│ Paso 1       │ Contenido principal    │ Copiloto IA      │
│ Analizar     │ HDU y criterios        │                  │
│ Paso 2       │                       │ Recomendaciones  │
│ Diseñar      │ Casos de prueba       │ Riesgos          │
│ Paso 3       │                       │ Acciones rápidas │
│ Ejecutar     │ Resultado y evidencia  │                  │
│ Paso 4       │                       │                  │
│ Validar      │                       │                  │
└──────────────┴───────────────────────┴──────────────────┘
```

### Componentes clave

- Wizard de validación por etapas.
- Copiloto IA contextual.
- Generación de escenarios BDD.
- Generación de casos negativos y edge cases.
- Botón de ejecución visible.
- Resultado con explicación del fallo.
- Sugerencia automática de bug y regresión.

### Ventajas

- Diferencia claramente el producto frente a un gestor de tareas.
- Refuerza la propuesta de valor basada en IA.
- Guía a usuarios nuevos.
- Es excelente para demostrar el producto en una presentación.

### Riesgos

- Puede ocultar demasiado la navegación tradicional.
- Requiere definir muy bien los estados del flujo.
- Puede sentirse demasiado asistido para usuarios expertos.

---

## Recomendación

Se recomienda combinar:

- **Base de la Propuesta B:** workspace centrado en HDUs y trazabilidad.
- **Dashboard de la Propuesta A:** métricas de riesgo y resultados.
- **Copiloto de la Propuesta C:** IA contextual dentro de cada HDU, prueba y ejecución.

El resultado sería:

```text
Workspace de requerimientos
+ Dashboard de riesgo
+ Estudio de pruebas asistido por IA
```

## Dirección visual recomendada

Nombre conceptual: **Qacelerate IA Quality Engineering Workspace**

Características:

- Sidebar más compacta y agrupada por flujo, no por entidad.
- Selector global de proyecto.
- Navegación principal:
  - Overview.
  - Requerimientos.
  - Diseño de pruebas.
  - Ejecuciones.
  - Evidencia y bugs.
  - Integraciones.
- Iconografía consistente en lugar de emojis.
- Tarjetas con bordes suaves y estados semánticos.
- Más espacios en blanco y menos bordes pesados.
- Tipografía con mayor contraste entre títulos, metadatos y acciones.
- Chat IA integrado como panel contextual.
- Modo oscuro como experiencia principal y modo claro como alternativa.

## HDU visual propuesta

La HDU de implementación debería definirse después de seleccionar una dirección:

- **Opción A:** Rediseñar como QA Command Center.
- **Opción B:** Rediseñar como Product Quality Workspace.
- **Opción C:** Rediseñar como AI Testing Studio.
- **Opción D:** Implementar la combinación recomendada.

No se recomienda crear todavía una HDU técnica genérica de "mejorar estilos". Primero debe elegirse la experiencia objetivo para que los criterios de aceptación sean verificables.
