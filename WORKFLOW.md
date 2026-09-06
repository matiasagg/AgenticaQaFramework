# QA SaaS Platform - Workflow de Desarrollo

## Agentes Disponibles

### 1. Product Owner (PO)
- Crear y priorizar el Product Backlog
- Definir Historias de Usuario (HDU)
- Aceptar o rechazar entregables

### 2. Tech Lead (TL)
- Revisión técnica de HDUs
- Crear ramas de feature
- Code review y merge a main

### 3. Dev Fullstack (DEV)
- Implementar features (frontend + backend)
- Crear tests unitarios
- Integrar APIs

### 4. DevOps (OPS)
- Configurar CI/CD
- Deploy a staging/production

### 5. QA Engineer (QA)
- Crear planes de prueba
- Ejecutar tests de integración
- Reportar bugs

### 6. SDET
- Automatizar tests
- Performance y security testing

---

## Git Flow

- `main` - Producción (solo código estable)
- `develop` - Desarrollo (integración de features)
- `feature/hdu-XXX-nombre` - Ramas de feature

### Crear una nueva feature
```bash
git checkout -b feature/hdu-XXX-nombre develop
```

---

## Product Backlog - Sprint MVP Core

| ID | HDU | Prioridad | Estado |
|----|-----|-----------|--------|
| HDU-001 | Lista de Bugs con filtros | Alta | Pendiente |
| HDU-002 | Detalle de Bug con evidencias | Alta | Pendiente |
| HDU-003 | Lista de Casos de Prueba | Alta | Pendiente |
| HDU-004 | Tarjetas de Agentes IA | Media | Pendiente |
| HDU-005 | Chat con Agente IA | Media | Pendiente |
| HDU-006 | Subida de Evidencias | Media | Pendiente |
| HDU-007 | Dashboard de Cobertura | Baja | Pendiente |
| HDU-008 | Planes de Mejora | Baja | Pendiente |

---

## Ciclo de Vida de una HDU

1. **Creación (PO):** HDU creada con criterios de aceptación
2. **Planificación (TL):** Rama feature creada desde develop
3. **Implementación (DEV):** Código + tests unitarios
4. **Pruebas (QA + SDET):** Tests manuales y automatizados
5. **Revisión (TL):** Code review y merge a develop
6. **Deploy (OPS):** CI/CD y deploy a staging
7. **Aceptación (PO):** Validación de criterios

---

## Definition of Done (DoD)

- [ ] Código implementado y funcionando
- [ ] Tests unitarios pasando (>80% cobertura)
- [ ] Tests de integración pasando
- [ ] Code review aprobado
- [ ] Sin bugs críticos o altos
- [ ] Documentación actualizada
- [ ] Aceptada por Product Owner
