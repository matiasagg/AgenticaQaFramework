# Identidad de HDUs: SaaS y fuente externa

## Regla canónica

El identificador público de una HDU lo gobierna el SaaS:

- `hduNumber`: correlativo global entero.
- `displayId`: representación canónica `HDU-###`.

El número de issue de GitHub o un texto como `HDU-048` encontrado en el título
no se usa para asignar el ID interno. La fuente externa puede tener otro
orden, huecos, duplicados históricos o un correlativo independiente.

## Fallback de importación

Al importar una HDU nueva:

1. Se identifica el issue por `externalSystem = GITHUB` y `externalId`.
2. Si ya existe esa combinación en el proyecto, no se crea otra HDU.
3. Si no existe, el allocator global reserva el siguiente `hduNumber` del SaaS
   dentro de la misma transacción que crea la HDU.
4. El ID encontrado en la fuente se guarda en `sourceDisplayId` y en
   `syncMetadata.sourceDisplayId` como referencia informativa.
5. El resultado conserva también `syncMetadata.canonicalDisplayId`.

Ejemplo:

| Fuente | SaaS |
|---|---|
| GitHub `HDU-048`, issue `#120` | `HDU-017` |

Esto no es una colisión: `HDU-017` es la identidad oficial del SaaS y
`HDU-048` es la identidad histórica de la fuente.

## Concurrencia y reparaciones

La tabla `HduSequence` reserva números mediante una operación SQL atómica.
Esto evita que dos importaciones simultáneas reciban el mismo correlativo.
También se ajusta automáticamente si una reparación legacy dejó
`UserStory.hduNumber` por delante de la secuencia.

El script `repair:hdu-ids` actualiza la secuencia después de reasignar IDs.

## Resolver discrepancias existentes

No ejecutes `repair:hdu-ids` directamente si quieres conservar IDs que ya
fueron publicados en GitHub: ese script reasigna toda la colección según el
orden de los issues.

Usa primero el reconciliador seguro, que consulta los issues de GitHub y hace
un dry-run:

```text
cd api
npm run reconcile:hdu-ids
```

El reporte muestra, por cada HDU:

- ID canónico actual del SaaS.
- ID encontrado en GitHub.
- Si se puede restaurar.
- Si existe un conflicto porque otro registro ya posee ese número.

Si el reporte es correcto, aplica únicamente las restauraciones compatibles:

```text
cd api
npm run reconcile:hdu-ids -- --apply
```

También se puede limitar a un proyecto:

```text
npm run reconcile:hdu-ids -- --project=<PROJECT_ID> --apply
```

Si existen dos issues con el mismo `HDU-###`, aplica la política aprobada de
antigüedad: el issue de GitHub con menor número conserva el ID y el posterior
recibe un nuevo correlativo del SaaS:

```text
npm run reconcile:hdu-ids -- --resolve-duplicates=oldest --apply
```

El reconciliador actualiza el `displayId`, `hduNumber`, `sourceDisplayId`, la
metadata de sincronización y el título de la suite de pruebas. Los conflictos
no se fuerzan: quedan reportados para resolución manual.

## Sincronización posterior

Cuando se publica una HDU en GitHub, el título se construye con el
`displayId` canónico del SaaS. De esa forma, la siguiente sincronización
externa tiende a alinear la referencia visible de GitHub con la identidad
oficial sin modificar el `hduNumber` interno.