## Brief overview
  Esta regla establece el principio de reutilizar step definitions existentes antes de crear nuevas en tests automatizados. Los agentes deben siempre buscar steps reutilizables (Given/When/Then, hooks, fixtures) antes de desarrollar nuevas definiciones.

## Principios de reutilización de steps
  - **Buscar steps existentes**: Siempre verificar si ya existen step definitions que cubran la funcionalidad necesaria antes de crear nuevas.
  - **Identificar patrones comunes**: Analizar steps actuales para identificar patrones reutilizables (login, navegación, validaciones, etc.).
  - **Extender en lugar de duplicar**: Cuando se necesite comportamiento similar, parametrizar o extender steps existentes en lugar de crear duplicados.

## Tipos de steps reutilizables
  - **Given (Precondiciones)**: Steps de setup como "usuario autenticado", "datos de prueba cargados", "navegar a página X".
  - **When (Acciones)**: Steps de interacción como "hacer clic en botón", "llenar formulario", "enviar datos".
  - **Then (Validaciones)**: Steps de verificación como "verificar mensaje de éxito", "comprobar redirección", "validar datos en pantalla".
  - **Hooks**: beforeAll, beforeEach, afterEach, afterAll para setup y teardown reutilizable.
  - **Fixtures**: Datos de prueba y configuraciones reutilizables entre tests.
  - **Custom steps**: Steps de dominio específico que encapsulan lógica compleja.

## Flujo de trabajo recomendado
  1. Identificar el step necesario para el caso de prueba
  2. Buscar en el proyecto step definitions existentes que cubran la funcionalidad
  3. Evaluar si se puede reutilizar directamente o con parámetros
  4. Solo crear nuevo step si no existe alternativa reutilizable
  5. Documentar el step nuevo para futuros casos de uso

## Buenas prácticas
  - **Mantener steps atómicos**: Cada step debe realizar una sola acción o verificación clara.
  - **Parametrizar steps**: Usar parámetros para hacer steps más flexibles y reutilizables.
  - **Organizar por dominio**: Agrupar steps relacionados (auth, checkout, navegación, etc.).
  - **Documentar propósito**: Agregar comentarios que describan cuándo y cómo usar cada step.
  - **Evitar acoplamiento**: Los steps no deben depender de otros steps específicos.