/**
 * Script de diagnóstico (mantener en api/scripts/):
 * 1. Lista las columnas reales de la tabla "UserStory" en PostgreSQL,
 *    incluyendo columnas generadas.
 * 2. Ejecuta la misma consulta que fallaba en la ruta GET /api/user-stories
 *    para verificar que el schema y la BD están alineados.
 *
 * Contexto: la BD estaba desalineada con el schema Prisma (faltaban las
 * columnas hduNumber y displayId), lo que provocaba el error
 * "The column `existe` does not exist...". Se corrigió con `prisma db push`.
 *
 * Uso: node scripts/check-userstory-columns.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Columnas de la tabla UserStory (nombre, si es generada y su expresión)
  const cols = await prisma.$queryRawUnsafe(
    "SELECT column_name, is_generated, generation_expression FROM information_schema.columns WHERE table_name = 'UserStory' ORDER BY ordinal_position"
  );
  console.log('Columnas de UserStory:');
  cols.forEach((c) => console.log(' -', c.column_name, '| generada:', c.is_generated, '| expr:', c.generation_expression));

  // Buscar cualquier columna (en cualquier tabla) cuyo nombre contenga "existe"
  const matches = await prisma.$queryRawUnsafe(
    "SELECT table_name, column_name FROM information_schema.columns WHERE column_name ILIKE '%existe%'"
  );
  console.log('\nColumnas llamadas *existe* en toda la BD:');
  console.log(JSON.stringify(matches, null, 1));

  // Verificación end-to-end: misma consulta que hace GET /api/user-stories
  const stories = await prisma.userStory.findMany({
    take: 1,
    include: { project: true, epic: true, feature: true, testSuite: true },
  });
  console.log('\nfindMany userStory OK, historias obtenidas:', stories.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });