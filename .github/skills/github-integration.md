# Skill: GitHub Integration

## Descripción
Integración completa con GitHub para gestión de repositorios, issues, PRs, labels y automatizaciones.

## Comandos Disponibles

### Issues
```powershell
# Crear issue
gh issue create --title "Titulo" --body "Descripcion" --label "sdet,p0"

# Listar issues
gh issue list --state open --label "qa"

# Cerrar issue
gh issue close 123

# Ver issue
gh issue view 123
```

### Pull Requests
```powershell
# Crear PR
gh pr create --title "feat: nueva feature" --body "Descripcion" --reviewer user1,user2

# Listar PRs
gh pr list --state open

# Review PR
gh pr review 456 --approve --comment "Excelente trabajo"

# Merge PR
gh pr merge 456 --squash --delete-branch
```

### Labels
```powershell
# Listar labels
gh label list

# Crear label
gh label create "nueva-label" --color "ff0000"

# Eliminar label
gh label delete "vieja-label"
```

### API GitHub
```powershell
# Usar API REST
gh api repos/matiasagg/AgenticaQaFramework/issues --method GET

# Crear issue via API
gh api repos/matiasagg/AgenticaQaFramework/issues --method POST -f title="Bug" -f body="Descripcion"
```

### Sincronización de HDUs

La vista previa de issues (`GET /api/github-sync/:projectId/issues`) compara
`updated_at` de GitHub con la última sincronización de cada HDU y devuelve
`needsSync: true` cuando detecta cambios. La interfaz consulta periódicamente
este endpoint y muestra una notificación para que el usuario seleccione las HDUs
actualizadas. Los cambios seleccionados se aplican con
`POST /api/github-sync/:projectId/sync` y el cuerpo
`{ "issueNumbers": [123] }`.

## Workflow: Crear Issue desde Bug Report

1. Recibir descripción del bug
2. Clasificar severidad (p0, p1, p2)
3. Asignar labels apropiadas
4. Crear issue con template estandarizado
5. Asignar al equipo correspondiente

## Template de Issue

```markdown
## Descripcion
[Descripcion clara del problema]

## Pasos para Reproducir
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

## Resultado Esperado
[Lo que deberia pasar]

## Resultado Actual
[Lo que realmente pasa]

## Evidencia
- Screenshots: [adjuntar]
- Logs: [adjuntar]

## Entorno
- OS: [Windows/Mac/Linux]
- Browser: [Chrome/Firefox/Safari]
- Version: [version de la app]

/label ~severity::critical ~type::bug
```

## Integracion con Cline

Para usar esta skill en Cline, simplemente pide:
- "Crea un issue para el bug de login"
- "Lista los issues abiertos de QA"
- "Cierra el issue #45"
- "Crea un PR para la feature de autenticación"