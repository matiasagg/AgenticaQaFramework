# DoR para Bugs, Features y Épicas

La validación DoR de Bugs, Features y Épicas usa un contrato común de preview y confirmación.

## Endpoints

Para cada entidad se exponen:

- `POST /api/{entity}/:id/validate-dor`: calcula y persiste el checklist actual.
- `POST /api/{entity}/:id/preview-dor-fixes`: valida la selección y devuelve cambios sin mutar datos.
- `POST /api/{entity}/:id/apply-dor-fixes`: confirma el preview dentro de una transacción.
- `GET /api/{entity}/:id/dor-history`: devuelve snapshots de validación y auditorías.

`{entity}` puede ser `bugs`, `features` o `epics`.

## Contrato de aplicación

```json
{
  "fixes": [
    { "field": "description", "value": "..." }
  ],
  "recommendations": [
    {
      "checkId": "description",
      "checkName": "Descripción con alcance",
      "message": "Agrega alcance",
      "source": "rules",
      "suggestedFix": { "field": "description", "value": "..." }
    }
  ],
  "baseUpdatedAt": "2026-10-04T09:00:00.000Z"
}
```

Los campos permitidos dependen de la entidad:

- **Bug**: `title`, `description`, `severity`, `priority`, `stepsToReproduce`, `acceptanceCriteria`, `expectedResult`, `actualResult`, `environment`.
- **Feature/Epic**: `name`, `description`, `status`.

El backend rechaza campos de otra entidad, valores inválidos y previews obsoletos (`409`). Las propuestas incompatibles sobre el mismo campo también requieren una resolución explícita.

## Reglas estáticas

- **Bug**: reutiliza el validador DoR existente de HDUs sobre título, descripción, pasos, resultados y severidad.
- **Feature**: valida nombre, descripción, alcance y existencia de HDUs asociadas.
- **Épica**: valida nombre, descripción, alcance y existencia de Features asociadas.

Las recomendaciones sin `suggestedFix` se muestran como revisión manual y nunca modifican datos automáticamente.

## Proveedor de sincronización

El endpoint actual de publicación de HDUs (`POST /api/user-stories/:id/push-hdu`)
es exclusivamente de GitHub. Una HDU importada desde GitHub usa
`externalSystem = GITHUB`, el repositorio del proyecto debe ser una URL de
`github.com` y el proyecto debe tener un GitHub PAT con permisos de escritura
sobre Issues.

Azure DevOps todavía no tiene un conector de escritura implementado en este
repositorio. Si se intenta usar un repositorio o PAT de Azure en el flujo de
GitHub, la API ahora devuelve un error explícito en lugar de enviar las
credenciales a GitHub. Para implementar Azure se requiere una integración
separada con organización, proyecto, PAT de Azure y mapeo de Work Items.

## Persistencia

Los campos `dorScore`, `dorChecklist`, `isReady` y `staticAnalysis` se mantienen en Bugs, Features y Épicas. Los snapshots y auditorías se almacenan en `DorEntityValidation` y `DorEntityAudit`, vinculados al usuario autenticado y al identificador de entidad.
