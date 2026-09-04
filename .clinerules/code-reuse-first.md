## Brief overview
  Esta regla establece el principio de reutilización de código como prioridad fundamental. Los agentes deben siempre buscar reutilizar código, clases, scripts y casos de prueba existentes antes de crear nuevos.

## Principios de reutilización
  - **Reutilizar antes de crear**: Siempre verificar si existe código, clases, scripts o casos de prueba que puedan ser aprovechados antes de desarrollar nuevos componentes.
  - **Identificar patrones existentes**: Analizar la estructura actual del proyecto para identificar patrones, utilidades y componentes reutilizables.
  - **Extender en lugar de duplicar**: Cuando se necesite funcionalidad similar, extender o modificar componentes existentes en lugar de crear duplicados.

## Scripts y herramientas CLI
  - **Actualizar scripts existentes**: Priorizar la actualización y mejora de scripts CLI existentes en lugar de crear temporales.
  - **Mantener centralizado**: Los scripts deben mantenerse en ubicaciones centralizadas y documentadas, no dispersos como archivos temporales.
  - **Planificar la creación**: Antes de crear un nuevo script, planificar si puede integrarse o reemplazar uno existente.

## Casos de prueba
  - **Revisar existentes primero**: Siempre examinar los casos de prueba actuales antes de escribir nuevos.
  - **Extender cobertura**: Modificar pruebas existentes para cubrir nuevos escenarios cuando sea posible, en lugar de crear archivos de prueba separados.
  - **Mantener organización**: Conservar la estructura y organización de las pruebas existentes al añadir nueva cobertura.

## Flujo de trabajo recomendado
  1. Identificar el requerimiento o funcionalidad necesaria
  2. Buscar en el código existente componentes reutilizables
  3. Evaluar si se puede extender o adaptar código existente
  4. Solo crear nuevo código si no existe alternativa reutilizable
  5. Documentar los componentes reutilizados y las extensiones realizadas