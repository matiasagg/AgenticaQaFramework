## Brief overview
  Esta regla establece el uso de servidores MCP (Model Context Protocol) y tecnologías gratuitas para automatizar y mejorar los procesos de desarrollo, testing y operaciones. Se prioriza la integración de herramientas que extiendan las capacidades del agente sin costo.

## Principios de automatización
  - **Automatizar tareas repetitivas**: Identificar procesos manuales que pueden ser automatizados mediante scripts o servidores MCP.
  - **Integrar servicios gratuitos**: Utilizar APIs y servicios free-tier para extender funcionalidades (GitHub, GitLab, Slack, etc.).
  - **Mantener configuraciones centralizadas**: Las configuraciones de MCP y herramientas de automatización deben estar documentadas y versionadas.

## Servidores MCP recomendados
  - **Control de versiones**: GitHub MCP, GitLab MCP para gestión de repositorios, issues y PRs.
  - **Bases de datos**: PostgreSQL MCP, SQLite MCP para consultas y migraciones.
  - **Documentación**: FileSystem MCP para gestión de archivos, Fetch MCP para obtener recursos web.
  - **CI/CD**: Integraciones con GitHub Actions, GitLab CI para monitoreo de pipelines.

## Tecnologías de automatización gratuitas
  - **Contenedores**: Docker y Docker Compose para entornos reproducibles.
  - **Infraestructura**: Terraform, Ansible para aprovisionamiento automatizado.
  - **Monitoreo**: Prometheus, Grafana para métricas y alertas.
  - **Notificaciones**: Webhooks, Slack API, Discord API para alertas de CI/CD.
  - **Scheduling**: Cron jobs, GitHub Actions scheduled workflows.

## Flujo de implementación
  1. Identificar el proceso a automatizar y su frecuencia de ejecución.
  2. Buscar servidores MCP o herramientas gratuitas que cubran la necesidad.
  3. Evaluar la complejidad de integración vs el beneficio obtenido.
  4. Implementar la solución preferiblemente reutilizando scripts existentes.
  5. Documentar la automatización y configurar monitoreo básico.

## Consideraciones de mantenimiento
  - Monitorear cuotas de uso de servicios free-tier para evitar interrupciones.
  - Versionar en el repositorio **únicamente manifiestos sin credenciales** (por ejemplo `mcp-servers/*/config.json`, que documentan qué servidores y tools usa el equipo).
  - **NUNCA** versionar `cline_mcp_settings.json` ni ningún archivo que contenga credenciales. Ese archivo vive fuera del repo (en `AppData` en Windows) y suele contener tokens como `GITHUB_PERSONAL_ACCESS_TOKEN` o API keys. Copiarlo al repositorio equivale a publicar esas credenciales.
  - Al documentar configuraciones, usar rutas genéricas o variables de entorno en lugar de rutas absolutas: una ruta como `C:\Users\<usuario>\AppData\...` filtra el nombre de usuario local.
  - Revisar periódicamente si las herramientas utilizadas siguen siendo gratuitas y activas.


