## Brief overview
  Regla obligatoria para garantizar la trazabilidad y la calidad de cada desarrollo: todo cambio debe nacer de una HDU, ejecutarse en una rama propia, incluir una estrategia de pruebas completa y documentarse íntegramente en su Pull Request.

## 1. Origen obligatorio en una HDU
  - Ningún desarrollo debe comenzar sin una HDU aprobada y trazable.
  - La HDU debe contener como mínimo: objetivo, alcance, criterios de aceptación, prioridad y dependencias conocidas.
  - Antes de implementar, verificar que la HDU esté identificada en el sistema de seguimiento y que sus criterios de aceptación sean verificables.
  - Todo commit, suite de pruebas, evidencia y Pull Request debe referenciar el identificador de la HDU.
  - Si el cambio corrige un defecto, debe existir además un issue o bug asociado y vinculado a la HDU cuando corresponda.

## 2. Relaciones obligatorias y trazabilidad automatizada en el SaaS
  - La HDU debe funcionar como el registro central del desarrollo y tener enlazados, como mínimo:
    - Proyecto y repositorio de GitHub.
    - Épica y Feature relacionadas.
    - Responsable o persona asignada.
    - Rama de desarrollo.
    - Suite de pruebas y casos de prueba asociados.
    - Issues, bugs, tareas técnicas y dependencias relacionadas.
    - Commits y Pull Request.
    - Milestone, release, sprint o ciclo cuando existan.
    - Labels, estado, prioridad y criterios de aceptación.
    - Ejecuciones de CI, resultados, cobertura y evidencias de prueba.
  - El SaaS debe simplificar y automatizar la creación y mantenimiento de estos enlaces, evitando que el equipo tenga que registrar manualmente la misma información en varias pantallas.
  - Al crear o activar una HDU para desarrollo, el SaaS debe facilitar o automatizar, cuando la integración y permisos lo permitan:
    1. Crear o validar la relación con Epic y Feature.
    2. Asignar responsable y generar la rama con el nombre normalizado de la HDU.
    3. Crear o vincular la suite y los casos de prueba.
    4. Asociar automáticamente commits y Pull Requests mediante el ID de la HDU, nombre de rama o referencias configuradas.
    5. Sincronizar estado, labels, reviewers, checks y resultados de CI desde GitHub.
    6. Mostrar en una única vista el progreso de implementación, pruebas, cobertura, evidencias y aprobación.
  - La HDU debe mostrar la trazabilidad en ambos sentidos: desde el requerimiento hacia GitHub y desde cada commit, rama, PR, prueba o evidencia hacia la HDU.
  - Si algún enlace no puede automatizarse, el SaaS debe dejarlo visible como pendiente y solicitar la acción mínima necesaria; no debe ocultar relaciones faltantes.
  - La configuración de integración debe usar permisos mínimos y almacenar los tokens de forma segura. Un PAT (Personal Access Token) nunca debe guardarse en la HDU, commits, logs, evidencias ni Pull Requests; solo debe almacenarse como secreto seguro de la integración.
  - La ausencia de una relación obligatoria debe impedir pasar la HDU a desarrollo completado o solicitar revisión, salvo una excepción documentada.

## 3. Rama exclusiva por HDU
  - Cada HDU debe desarrollarse en su propia rama; no se deben mezclar HDUs ni funcionalidades no relacionadas.
  - Crear la rama desde `main` o `develop` actualizada, según la estrategia activa del repositorio.
  - Usar una convención consistente, por ejemplo:
    - `feature/{hdu-id}-{nombre-corto}`
    - `fix/{hdu-id}-{nombre-corto}`
  - La rama debe contener únicamente cambios relacionados con la HDU, sus pruebas, documentación y evidencias.
  - Si aparece trabajo fuera del alcance, crear o asociar otra HDU y otra rama.

## 4. Commits temáticos
  - Los commits deben ser atómicos, temáticos y trazables.
  - No mezclar cambios de dominios, funcionalidades o HDUs diferentes en un mismo commit.
  - Usar el formato definido en `.clinerules/commit-guidelines.md`, incluyendo la referencia a la HDU cuando aplique:
    - `feat(hdu-001): implementa ...`
    - `test(hdu-001): agrega ...`
    - `fix(hdu-001): corrige ...`
    - `docs(hdu-001): documenta ...`
  - Separar, cuando sea útil para la revisión, commits de implementación, pruebas, documentación y configuración.
  - No incluir archivos temporales, credenciales, artefactos generados innecesarios ni cambios no relacionados.

## 5. Suite de pruebas propia
  - Cada HDU debe tener una suite de pruebas identificable y trazable mediante el ID de la HDU.
  - Reutilizar y extender suites, fixtures, helpers y casos existentes antes de crear nuevos; evitar duplicar cobertura.
  - La suite debe mapear los criterios de aceptación con casos positivos, negativos, de límites y de regresión.
  - La suite debe poder ejecutarse de forma independiente y dejar claro qué dependencias o datos requiere.
  - Registrar en la HDU o en el Pull Request la ubicación de la suite y el comando utilizado para ejecutarla.

## 6. Cobertura mínima de pruebas
  La estrategia debe seleccionar las pruebas aplicables al alcance de la HDU y justificar explícitamente las que no correspondan:

  - **Pruebas unitarias**: lógica de negocio, validaciones, utilidades, hooks y componentes aislados.
  - **Pruebas funcionales de frontend**: flujos de usuario, estados de carga/error/vacío, validaciones y permisos.
  - **Pruebas funcionales de API**: contratos, autenticación/autorización, códigos HTTP, payloads, validaciones y errores.
  - **Pruebas de integración**: interacción entre módulos, base de datos, servicios y capas relevantes.
  - **Pruebas smoke**: verificación rápida de que los flujos críticos siguen operativos.
  - **Pruebas de regresión**: escenarios existentes afectados directa o indirectamente por el cambio.
  - **Pruebas de accesibilidad, compatibilidad y rendimiento**: incluirlas cuando el riesgo o el alcance de la HDU lo requiera.
  - Las pruebas deben ejecutarse en local y, cuando exista CI, también en el pipeline correspondiente.
  - Un fallo de pruebas, un criterio de aceptación incumplido o una cobertura insuficiente bloquea la aprobación del Pull Request hasta ser resuelto o formalmente justificado.

## 7. Evidencias de prueba
  - Toda HDU debe incluir evidencias reproducibles de sus validaciones.
  - Según el tipo de prueba, adjuntar resultados de comandos, reportes, logs, capturas de pantalla, videos, trazas, cobertura o enlaces a ejecuciones de CI.
  - Las evidencias deben indicar: fecha, entorno, versión/commit probado, comando o caso ejecutado, resultado esperado y resultado obtenido.
  - Para pruebas fallidas, documentar el defecto asociado; no ocultar ni sobrescribir evidencias de una ejecución fallida.
  - No incluir secretos, tokens, datos personales ni información sensible en capturas, logs o reportes.
  - Guardar artefactos en la ubicación establecida por el proyecto y enlazarlos desde la HDU o el Pull Request; no versionar artefactos pesados o temporales sin justificación.

## 8. Pull Request completo y trazable
  - No abrir el Pull Request hasta que la rama esté sincronizada con la rama base y la validación definida para la HDU haya sido ejecutada.
  - El Pull Request debe referenciar la HDU y describir **todos los cambios de la rama**, no solo el último commit.
  - Como mínimo, debe incluir:
    - Resumen del objetivo y contexto de la HDU.
    - Alcance implementado y lista de cambios por capa o componente.
    - Decisiones técnicas relevantes y dependencias.
    - Migraciones, cambios de configuración o impactos operativos.
    - Suite y matriz de pruebas ejecutadas, incluyendo resultados.
    - Cobertura o limitaciones conocidas.
    - Evidencias enlazadas.
    - Riesgos, deuda técnica y trabajo fuera de alcance.
    - Checklist de criterios de aceptación y Definition of Done.
  - El título del Pull Request debe incluir la referencia a la HDU y resumir el cambio principal.
  - Si la descripción queda desactualizada, debe actualizarse antes de solicitar revisión.
  - El PR debe permitir que una persona revisora entienda el cambio completo sin reconstruirlo únicamente desde el historial de commits.

## 9. Criterios de finalización (Definition of Done)
  Una HDU solo se considera terminada cuando:

  1. Sus criterios de aceptación están implementados y validados.
  2. El desarrollo permanece aislado en su rama propia.
  3. La HDU tiene enlazados proyecto, repositorio, Epic, Feature, responsable, rama, suite, casos de prueba e incidencias aplicables.
  4. Los commits son temáticos, trazables y no contienen cambios ajenos.
  5. Existe una suite de pruebas propia o una extensión documentada de una suite existente.
  6. Se ejecutaron las pruebas unitarias y las pruebas funcionales aplicables (frontend, API, integración, smoke y regresión, según riesgo).
  7. Las evidencias están disponibles y no contienen información sensible.
  8. El Pull Request describe la totalidad de los cambios de la rama y enlaza la HDU.
  9. Las revisiones y checks automatizados requeridos fueron aprobados.
  10. La HDU, el PR, GitHub y las evidencias mantienen trazabilidad bidireccional.

## 10. Excepciones
  - Toda excepción debe documentarse en la HDU y el Pull Request con motivo, impacto, riesgo, responsable y fecha de regularización.
  - Una excepción no elimina la obligación de crear la HDU, la rama, la trazabilidad ni la documentación de pruebas.
