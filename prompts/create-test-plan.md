# Prompt: Crear Plan de Pruebas

## Uso
Usa este prompt cuando necesites crear un plan de pruebas completo.

## Prompt Template

```
Actúa como QA Engineer y SDET para crear el siguiente plan de pruebas:

## Módulo: [NOMBRE DEL MÓDULO]

### Descripción
[Descripción del módulo a probar]

### Alcance
- **In Scope**: [Qué se va a probar]
- **Out of Scope**: [Qué no se va a probar]

### Estrategia de Testing

#### Niveles de Prueba
| Tipo | Herramienta | Responsable | Prioridad |
|------|-------------|-------------|-----------|
| Unitarias | Jest | Dev | P0 |
| Integración | Playwright | SDET | P0 |
| E2E | Playwright | SDET | P1 |
| Manual | - | QA Engineer | P1 |
| Performance | k6 | DevOps | P2 |

#### Casos de Prueba Críticos
- [ ] [Caso de prueba 1]
- [ ] [Caso de prueba 2]
- [ ] [Caso de prueba 3]

### Criterios de Entrada
- [ ] Código deployado en staging
- [ ] Tests unitarios pasando
- [ ] Datos de prueba configurados

### Criterios de Salida
- [ ] 100% de casos críticos ejecutados
- [ ] 0 bugs P0/P1 abiertos
- [ ] Cobertura > 80%

### Riesgos
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| [Riesgo 1] | Media | Alta | [Mitigación] |

### Entregables
- [ ] Plan de pruebas documentado
- [ ] Casos de prueba en TestRail/Xray
- [ ] Tests automatizados implementados
- [ ] Reporte de resultados
- [ ] Bugs reportados en GitHub
```

## Ejemplo de Uso

```
Actúa como QA Engineer y SDET para crear el siguiente plan de pruebas:

## Módulo: Sistema de Pagos

### Descripción
Plan de pruebas para el módulo de pagos con Stripe.

### Alcance
- **In Scope**: Checkout, reembolsos, webhooks
- **Out of Scope**: Impuestos, facturación