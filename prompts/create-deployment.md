# Prompt: Crear Deployment

## Uso
Usa este prompt cuando necesites configurar un deployment completo.

## Prompt Template

```
Actúa como DevOps para configurar el siguiente deployment:

## Aplicación: [NOMBRE DE LA APP]

### Ambiente
- [ ] Development
- [ ] Staging
- [ ] Producción

### Stack Tecnológico
- Contenedores: Docker
- Orquestación: Kubernetes / ECS
- Cloud: AWS / Azure / GCP
- CI/CD: GitHub Actions

### Requerimientos
- Escalado: [Número de instancias]
- Base de Datos: [Tipo y versión]
- Cache: [Redis/Memcached]
- CDN: [CloudFront/Cloudflare]

### Configuración Requerida

#### 1. Dockerfile
- [ ] Crear Dockerfile optimizado
- [ ] Configurar multistage build
- [ ] Minimizar tamaño de imagen

#### 2. CI/CD Pipeline
- [ ] Workflow de CI (build + test)
- [ ] Workflow de deploy a staging
- [ ] Workflow de deploy a producción
- [ ] Configurar secrets

#### 3. Infraestructura
- [ ] Crear configuración de Kubernetes/ECS
- [ ] Configurar load balancer
- [ ] Configurar SSL/TLS
- [ ] Configurar dominio

#### 4. Monitoreo
- [ ] Configurar health checks
- [ ] Configurar logging
- [ ] Configurar alertas
- [ ] Configurar dashboards

### Checklist de Deploy
- [ ] Tests pasando en CI
- [ ] Build exitoso
- [ ] Imagen Docker creada
- [ ] Deploy a staging completado
- [ ] Smoke tests en staging pasando
- [ ] Aprobación de QA
- [ ] Deploy a producción
- [ ] Monitoreo activo

### Rollback Plan
1. Revertir a versión anterior
2. Notificar al equipo
3. Analizar causa raíz
4. Crear issue para fix
```

## Ejemplo de Uso

```
Actúa como DevOps para configurar el siguiente deployment:

## Aplicación: AgenticaQaFramework API

### Ambiente
- [x] Staging
- [x] Producción

### Stack Tecnológico
- Contenedores: Docker
- Cloud: AWS (ECS + RDS)
- CI/CD: GitHub Actions