# Skill: Code Review

## Descripción
Guía para realizar code reviews efectivos con enfoque en calidad, seguridad y mejores prácticas.

## Checklist de Code Review

### 1. Funcionalidad
- [ ] El código cumple con los requerimientos
- [ ] Maneja casos edge correctamente
- [ ] No hay lógica duplicada
- [ ] Los tests cubren los cambios

### 2. Código Limpio
- [ ] Nombres descriptivos (variables, funciones, clases)
- [ ] Funciones pequeñas y enfocadas
- [ ] No hay código comentado o muerto
- [ ] Formato consistente (ESLint/Prettier)

### 3. Seguridad
- [ ] No hay secrets hardcodeados
- [ ] Inputs son validados y sanitizados
- [ ] Autenticación/autorización correcta
- [ ] No hay vulnerabilidades comunes (XSS, SQL Injection)

### 4. Performance
- [ ] No hay consultas N+1
- [ ] Uso eficiente de memoria
- [ ] Lazy loading donde aplica
- [ ] Caché implementada correctamente

### 5. Testing
- [ ] Tests unitarios para lógica de negocio
- [ ] Tests de integración para APIs
- [ ] Tests E2E para flujos críticos
- [ ] Cobertura adecuada (>80%)

## Template de Code Review

```markdown
## Resumen
[Descripción breve de los cambios]

## Checklist
- [ ] Funcionalidad correcta
- [ ] Código limpio
- [ ] Seguridad validada
- [ ] Performance aceptable
- [ ] Tests adecuados

## Comentarios

### 🟢 Puntos Fuertes
- [Aspecto positivo 1]
- [Aspecto positivo 2]

### 🟡 Sugerencias
- [Mejora sugerida 1]
- [Mejora sugerida 2]

### 🔴 Issues Bloqueantes
- [Issue que debe ser corregido]

## Veredicto
- [ ] Aprobado
- [ ] Aprobado con sugerencias
- [ ] Cambios requeridos
```

## Comentarios Constructivos

### Formato sugerido:
```
[Nivel] [Archivo:Linea] - [Descripción]

Ejemplo:
🟡 src/services/user.ts:45 - Considera usar un Set en lugar de Array 
para mejorar la búsqueda de O(n) a O(1)
```

### Niveles:
- 🔴 **Bloqueante**: Debe ser corregido antes de merge
- 🟡 **Sugerencia**: Mejora recomendada pero no bloqueante
- 🟢 **Positivo**: Buena práctica, destacar
- 💡 **Pregunta**: Para entender la intención
- 📝 **Nota**: Información adicional

## Reglas de Conventional Commits

```
feat:     Nueva feature
fix:      Corrección de bug
docs:     Documentación
style:    Formato (no afecta código)
refactor: Refactorización
test:     Agregar tests
chore:    Tareas de mantenimiento
```

## Automatización con GitHub

```yaml
# .github/workflows/pr-checks.yml
name: PR Validation

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Lint
        run: npm run lint
      
      - name: Type Check
        run: npm run type-check
      
      - name: Test
        run: npm run test:unit
      
      - name: Check PR Title
        uses: amannn/action-semantic-pull-request@v5
```

## Mejores Practicas

1. **Responde rápido**: Reviews en menos de 24 horas
2. **Sé respetuoso**: Critica el código, no a la persona
3. **Explica el "por qué"**: No solo qué, sino por qué es mejor
4. **Aprende de cada review**: Comparte conocimiento
5. **Usa emojis**: 🟢 🟡 💡 para feedback visual