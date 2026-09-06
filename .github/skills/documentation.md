# Skill: Documentation

## Descripción
Guía para crear documentación técnica clara y mantenible para el proyecto.

## Estructura de Documentación

```
docs/
├── README.md               # Overview del proyecto
├── CONTRIBUTING.md         # Guía de contribución
├── ARCHITECTURE.md         # Decisiones arquitectónicas
├── API.md                  # Documentación de API
├── TESTING.md              # Guía de testing
├── DEPLOYMENT.md           # Guía de deployment
└── adr/                    # Architecture Decision Records
    ├── 001-use-typescript.md
    └── 002-playwright-over-cypress.md
```

## README Template

```markdown
# [Nombre del Proyecto]

Descripción breve del proyecto.

## Inicio Rápido

### Prerrequisitos
- Node.js 20+
- npm o pnpm

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/user/repo.git
cd repo

# Instalar dependencias
npm ci

# Configurar variables de entorno
cp .env.example .env

# Iniciar desarrollo
npm run dev
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run test` | Ejecuta tests |
| `npm run lint` | Ejecuta linter |

## Estructura del Proyecto

```
src/
├── components/     # Componentes React
├── services/       # Lógica de negocio
├── utils/          # Utilidades
└── pages/          # Páginas
```

## Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para detalles.

## Licencia

[MIT](./LICENSE)
```

## ADR Template (Architecture Decision Record)

```markdown
# ADR-001: [Título de la Decisión]

## Estado
- [ ] Propuesto
- [ ] Aceptado
- [ ] Deprecado
- [ ] Reemplazado por ADR-XXX

## Contexto
[Describir el contexto y el problema que se enfrenta]

## Decisión
[Describir la decisión tomada]

## Alternativas Consideradas

### Alternativa 1: [Nombre]
- Ventajas: [...]
- Desventajas: [...]

### Alternativa 2: [Nombre]
- Ventajas: [...]
- Desventajas: [...]

## Consecuencias

### Positivas
- [Consecuencia 1]
- [Consecuencia 2]

### Negativas
- [Consecuencia 1]

## Referencias
- [Link a documentación relevante]
```

## API Documentation Template

```markdown
# API Endpoints

## Autenticación

### POST /api/auth/login

Inicia sesión de usuario.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "Usuario"
  }
}
```

**Errors:**
- `401`: Credenciales inválidas
- `404`: Usuario no encontrado

### GET /api/auth/me

Obtiene usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "123",
  "email": "user@example.com",
  "name": "Usuario"
}
```

## Users

### GET /api/users

Lista todos los usuarios.

**Query Parameters:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | number | Página (default: 1) |
| `limit` | number | Items por página (default: 10) |
| `search` | string | Búsqueda por nombre/email |

**Response (200):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```
```

## Mejores Practicas

1. **Mantén actualizado**: Documentación desactualizada es peor que sin documentación
2. **Sé conciso**: Ve al grano, usa ejemplos
3. **Usa formato consistente**: Mismos headers, mismos estilos
4. **Incluye ejemplos**: Código funcional que se pueda copiar y pegar
5. **Versiona cambios**: Usa git para trackear cambios en documentación