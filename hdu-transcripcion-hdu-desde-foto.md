# HDU-013: Transcribir una HDU desde una foto

> **Estado:** Propuesta para refinamiento  
> **Prioridad:** P1  
> **Área:** Frontend, Backend e IA/OCR  
> **Agente asignado:** Dev Fullstack / SDET  
> **Dependencias:** Servicio OCR o modelo multimodal, autenticación y creación de HDUs

## Descripción

**Como** Product Owner, QA Analyst o integrante del equipo de producto,  
**quiero** cargar una foto o captura de una HDU escrita en papel, una pizarra o un documento,  
**para** transcribirla automáticamente al SaaS y revisar sus datos antes de guardarla como una HDU editable.

## Objetivo

Reducir el trabajo manual de registrar HDUs permitiendo convertir una imagen en un borrador estructurado con, como mínimo:

- Título.
- Rol, acción y beneficio de la historia de usuario.
- Descripción completa.
- Criterios de aceptación.
- Prioridad, cuando pueda identificarse.
- Story points, cuando pueda identificarse.

La información extraída debe considerarse un borrador y nunca debe guardarse automáticamente sin confirmación explícita del usuario.

## Flujo esperado

1. El usuario autenticado abre la acción **Transcribir HDU desde foto**.
2. Selecciona o arrastra una imagen compatible.
3. El sistema valida el tipo y el tamaño del archivo y muestra una vista previa.
4. El sistema procesa la imagen mediante OCR o un modelo multimodal.
5. El sistema presenta los campos detectados en un formulario editable.
6. El usuario corrige los errores, completa los datos faltantes y confirma.
7. El SaaS crea una nueva HDU en el proyecto seleccionado y conserva la imagen original como evidencia opcional.
8. Si el usuario cancela, no se crea ni modifica ninguna HDU.

## Criterios de aceptación

- [ ] Dado un usuario autenticado, cuando abre la acción de transcripción, entonces puede seleccionar una imagen desde su dispositivo o arrastrarla al área de carga.
- [ ] El sistema acepta, como mínimo, archivos JPG, JPEG, PNG y WEBP, y rechaza formatos no soportados con un mensaje comprensible.
- [ ] El sistema rechaza imágenes que superen el límite configurado y comunica el tamaño máximo permitido antes de iniciar el procesamiento.
- [ ] Antes de procesar la imagen, el sistema muestra una vista previa y el nombre del archivo seleccionado.
- [ ] Cuando la imagen contiene una HDU legible, el sistema devuelve un borrador con los campos detectados y no inventa información que no esté presente en la imagen.
- [ ] El borrador permite editar el título, la descripción, el rol, la acción, el beneficio, los criterios de aceptación, la prioridad y los story points antes de guardar.
- [ ] El sistema marca como pendientes o inciertos los campos que no pudo leer con suficiente confianza y permite completarlos manualmente.
- [ ] El usuario puede seleccionar el proyecto de destino antes de confirmar la creación.
- [ ] Al confirmar un borrador válido, el sistema crea una única HDU editable asociada al proyecto seleccionado.
- [ ] La HDU creada puede pasar por la validación DoR existente sin perder los datos extraídos ni la trazabilidad de su origen.
- [ ] El sistema no crea una HDU cuando el usuario cancela, cuando la imagen no puede procesarse o cuando falla la validación de campos.
- [ ] Si el OCR o el modelo de IA falla, el sistema informa el error, permite reintentar y conserva la posibilidad de crear la HDU manualmente.
- [ ] El sistema muestra un estado de carga y evita enviar dos veces la misma imagen mientras el procesamiento está en curso.
- [ ] La imagen y el texto extraído no son visibles para usuarios que no tengan permisos sobre el proyecto.
- [ ] Los logs no contienen imágenes, tokens, credenciales ni el contenido completo de la HDU extraída.
- [ ] La interfaz es usable con teclado, muestra mensajes accesibles de carga y error, y funciona en los tamaños de pantalla soportados por el SaaS.

## Fuera de alcance

- Interpretar diagramas complejos, flujos BPMN o wireframes como entidades del sistema.
- Crear automáticamente épicas, features, tareas o casos de prueba a partir de la imagen.
- Guardar una HDU sin revisión y confirmación del usuario.
- Garantizar una transcripción perfecta para fotografías borrosas, manuscritos ilegibles o imágenes con contenido cortado.
- Entrenar un modelo propio de OCR como parte de esta HDU.

## Notas técnicas

- Agregar un endpoint autenticado de previsualización, por ejemplo `POST /api/user-stories/transcribe-image`, que devuelva un borrador y metadatos de confianza sin crear la HDU.
- Mantener separado el endpoint de transcripción del endpoint existente de creación de HDUs.
- Validar MIME type, extensión, tamaño máximo, dimensiones razonables y contenido real del archivo; no confiar únicamente en la extensión.
- Usar un proveedor OCR o multimodal configurable mediante variables de entorno, con timeout, manejo de errores y límites de consumo.
- Normalizar la respuesta del proveedor a un contrato interno estable. Los campos no detectados deben ser `null` o listas vacías, no valores inventados.
- Registrar auditoría de que la HDU fue creada desde una imagen, sin guardar secretos ni datos sensibles en logs.
- Aplicar autorización por propietario o miembro autorizado del proyecto tanto a la transcripción como a la creación.
- Considerar almacenamiento temporal y eliminación automática de la imagen original. Si se conserva como evidencia, debe utilizar el almacenamiento de evidencias existente y sus permisos.
- No enviar la imagen a terceros sin una configuración explícita del proveedor y una política de privacidad documentada.
- Limitar frecuencia, tamaño y cantidad de reintentos para evitar abuso y costes inesperados.

## Estrategia de pruebas

### Backend

- Pruebas unitarias del parser y normalizador de la respuesta OCR.
- Pruebas de contrato para imágenes válidas, formatos inválidos, archivos sobredimensionados y respuestas incompletas.
- Pruebas de autorización para usuarios sin acceso al proyecto.
- Pruebas de timeout, error del proveedor, respuesta malformada y reintento.
- Prueba de que la previsualización no persiste una HDU.
- Prueba de que la confirmación crea una sola HDU y conserva la trazabilidad del origen.

### Frontend

- Selección y arrastre de imágenes.
- Vista previa, validaciones y mensajes de error.
- Estados de carga, éxito, cancelación y reintento.
- Edición de los campos detectados y señalización de campos inciertos.
- Confirmación, prevención de doble envío y navegación a la HDU creada.
- Accesibilidad básica del flujo y comportamiento responsive.

### E2E

- Cargar una imagen de ejemplo, revisar el borrador y crear una HDU.
- Cancelar después de la transcripción y verificar que no se creó ningún registro.
- Rechazar un formato no permitido.
- Simular un fallo del servicio de transcripción y comprobar el mensaje de recuperación.
- Verificar que un usuario sin permisos no puede transcribir ni crear HDUs en otro proyecto.

## Evidencia requerida

- [ ] Captura o video del flujo completo de carga, revisión y confirmación.
- [ ] Imagen de prueba sin datos personales ni información sensible.
- [ ] Resultado de pruebas unitarias, API, frontend y E2E aplicables.
- [ ] Evidencia de que cancelar o fallar no crea registros duplicados.
- [ ] Evidencia de autorización y de ausencia de secretos en logs.
- [ ] Documentación del proveedor OCR/multimodal, límites, costes y política de retención.

## Definition of Ready

- [ ] Se definió el proveedor OCR o multimodal y su contrato de respuesta.
- [ ] Se acordó el límite de tamaño, formatos, retención y tratamiento de imágenes.
- [ ] Se definió el modelo de confianza y el comportamiento para campos no detectados.
- [ ] Se identificaron los permisos requeridos y el proyecto de destino.
- [ ] Se dispone de imágenes de prueba anonimizadas.
- [ ] Los criterios de aceptación fueron revisados por Product Owner, QA y desarrollo.

## Definition of Done

- [ ] La transcripción funciona en backend y frontend con manejo de errores.
- [ ] La creación requiere revisión y confirmación explícita del usuario.
- [ ] La HDU creada mantiene compatibilidad con la validación DoR existente.
- [ ] Las pruebas unitarias, de API, frontend y E2E aplicables pasan.
- [ ] La autorización, los límites de consumo y la protección de datos fueron validados.
- [ ] No se almacenan secretos ni contenido sensible en logs o artefactos.
- [ ] La documentación de uso, configuración y limitaciones está actualizada.
- [ ] El Pull Request referencia `HDU-013` y contiene evidencias reproducibles.
- [ ] Product Owner acepta el comportamiento y las limitaciones conocidas.
