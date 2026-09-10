/**
 * Script para purgar la caché IA inválida guardada por el fallback silencioso.
 *
 * Antes de la corrección, cuando Gemini fallaba (ej. key inválida), el endpoint
 * validate-dor guardaba un análisis falso (score 50, "No se pudo conectar...")
 * dentro de staticAnalysis.aiAnalysis y esa caché nunca se reintentaba.
 *
 * Este script busca esas entradas y las limpia para que la siguiente validación
 * re-ejecute el análisis con la key/modelo correctos.
 *
 * Uso (desde api/):
 *   npx ts-node scripts/purge-invalid-ai-cache.ts
 *   o con ts-node-dev: npx ts-node-dev --transpile-only scripts/purge-invalid-ai-cache.ts
 *   o transpilar rápido con tsx si está disponible: npx tsx scripts/purge-invalid-ai-cache.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Determina si un aiAnalysis guardado corresponde al fallback inválido:
// score 50, isReady false y sugerencias con el mensaje de error de conexión.
function isInvalidFallback(aiAnalysis: any): boolean {
  if (!aiAnalysis || typeof aiAnalysis !== 'object') return false;
  const score = aiAnalysis.score;
  const isReady = aiAnalysis.isReady;
  const suggestions = JSON.stringify(aiAnalysis.suggestions ?? []);
  return score === 50 && isReady === false && suggestions.includes('No se pudo conectar');
}

async function main() {
  const stories = await prisma.userStory.findMany({
    select: { id: true, displayId: true, title: true, staticAnalysis: true },
  });

  const invalid = stories.filter((s) => {
    const analysis = s.staticAnalysis as any;
    return isInvalidFallback(analysis?.aiAnalysis);
  });

  if (invalid.length === 0) {
    console.log('✅ No se encontraron cachés IA inválidas. Nada que purgar.');
    return;
  }

  console.log(`🔎 Encontradas ${invalid.length} HDUs con caché IA inválida (fallback score 50):`);
  for (const s of invalid) {
    console.log(`   - ${s.displayId ?? s.id}: ${s.title}`);
  }

  // Eliminar SOLO el aiAnalysis inválido; conserva checklist/score estático
  for (const s of invalid) {
    const updated = {
      ...(s.staticAnalysis as object),
      aiAnalysis: null,
    };
    await prisma.userStory.update({
      where: { id: s.id },
      data: { staticAnalysis: JSON.parse(JSON.stringify(updated)) },
    });
  }

  console.log(`🧹 Purgadas ${invalid.length} HDUs. La próxima validación re-ejecutará el análisis IA.`);
}

main()
  .catch((e) => {
    console.error('❌ Error purgando caché:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());