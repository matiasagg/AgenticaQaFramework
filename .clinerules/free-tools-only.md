## Brief overview
  Esta regla establece que los agentes deben utilizar exclusivamente herramientas, servicios y dependencias gratuitas (free-tier u open source) al desarrollar soluciones, evitando cualquier herramienta que requiera licencia de pago o suscripción comercial.

## Principios de selección de herramientas
  - **Preferir alternativas gratuitas**: Siempre buscar opciones free-tier u open source antes de considerar herramientas de pago.
  - **Verificar licencias**: Confirmar que las dependencias y herramientas seleccionadas tengan licencias permisivas (MIT, Apache, GPL) o sean free-tier.
  - **Evitar vendor lock-in con servicios pagos**: No depender de servicios cloud que requieran tarjeta de crédito para el tier gratuito.

## Categorías de herramientas aceptables
  - **Lenguajes de programación**: Python, JavaScript, TypeScript, Go, Rust, Java (OpenJDK), C#, etc.
  - **Frameworks y librerías**: React, Vue, Angular, Express, FastAPI, Django, Spring Boot, etc.
  - **Bases de datos**: SQLite, PostgreSQL, MySQL, MongoDB Community, Redis.
  - **Herramientas CLI**: Git, npm, pip, curl, wget, jq, etc.
  - **Infraestructura como código**: Docker, Terraform, Ansible, Vagrant.
  - **CI/CD**: GitHub Actions, GitLab CI, Jenkins.

## Herramientas a evitar
  - Servicios con trial limitado que requieren upgrade pagado
  - IDEs de pago (preferir VS Code, Vim, editores open source)
  - Librerías con licencias comerciales obligatorias
  - Servicios cloud sin tier gratuito permanente (no solo trial)

## Flujo de decisión
  1. Identificar la necesidad o funcionalidad requerida
  2. Buscar alternativas open source o free-tier primero
  3. Evaluar si la alternativa gratuita cumple con los requisitos
  4. Solo considerar opciones de pago si no existe alternativa gratuita viable (requiere aprobación del usuario)
  5. Documentar las dependencias y sus licencias en el proyecto