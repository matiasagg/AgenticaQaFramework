/**
 * Backfill de campos enriquecidos para HDUs existentes (issue: sincronización HDU).
 *
 * Las HDUs importadas antes de la implementación de los campos enriquecidos
 * (definitionOfDone, technicalNotes, evidences, dependencies) tienen las
 * secciones embebidas en la descripción. Este script:
 *
 * 1. Recorre todas las UserStory (o solo las de GitHub con --github).
 * 2. Re-extrae las secciones desde la descripción almacenada usando las
 *    mismas funciones del servicio de integración GitHub.
 * 3. Rellena los campos vacíos con lo extraído y limpia la descripción.
 *
 * Uso (desde api/):
 *   npm run backfill:enriched          # procesa todas las HDUs
 *   npm run backfill:enriched -- --github   # solo HDUs de GitHub
 *
 * Es idempotente: si la descripción ya está limpia y los campos llenos,
 * no cambia nada.
 */
import { PrismaClient } from '@prisma/client';
import {
  extractDefinitionOfDone,
  extractBulletSection,
  extractStoryPoints,
  cleanIssueDescription,
} from '../src/services/githubIntegration';

const prisma = new PrismaClient();

const onlyGithub = process.argv.includes('--github');

async function main() {
  const stories = await prisma.userStory.findMany({
    where: onlyGithub ? { externalSystem: 'GITHUB' } : {},
  });

  console.log(`Procesando ${stories.length} HDUs${onlyGithub ? ' (solo GitHub)' : ''}...`);

  let updated = 0;
  for (const story of stories) {
    const body = story.description || '';
    if (!body) continue;

    // Extraer las secciones desde la descripción actual
    const definitionOfDone = extractDefinitionOfDone(body);
    const technicalNotes = extractBulletSection(body, /notas?\s+t[eé]cnicas?|technical\s+notes/i);
    const evidences = extractBulletSection(body, /evidencias?|evidences?/i);
    const dependencies = extractBulletSection(body, /dependencias?|dependencies?/i);
    const storyPoints = extractStoryPoints(body);

    // Limpiar la descripción de las secciones estructuradas
    const cleaned = cleanIssueDescription(body);

    // Solo actualizar si hay algo nuevo que completar y la limpieza cambió algo
    const hasNewData =
      definitionOfDone.length > 0 ||
      technicalNotes.length > 0 ||
      evidences.length > 0 ||
      dependencies.length > 0 ||
      (storyPoints !== null && story.storyPoints === null);

    const descriptionChanged = cleaned !== body;

    if (!hasNewData && !descriptionChanged) continue;

    await prisma.userStory.update({
      where: { id: story.id },
      data: {
        // No sobrescribir datos ya completados manualmente: solo rellenar vacíos
        definitionOfDone: story.definitionOfDone.length === 0 ? definitionOfDone : story.definitionOfDone,
        technicalNotes: story.technicalNotes.length === 0 ? technicalNotes : story.technicalNotes,
        evidences: story.evidences.length === 0 ? evidences : story.evidences,
        dependencies: story.dependencies.length === 0 ? dependencies : story.dependencies,
        storyPoints: story.storyPoints === null ? storyPoints : story.storyPoints,
        description: cleaned,
      },
    });

    updated += 1;
    const ref = story.displayId || story.id;
    console.log(
      `  ✓ ${ref}: DoD=${definitionOfDone.length}, notas=${technicalNotes.length}, ` +
      `evidencias=${evidences.length}, deps=${dependencies.length}, SP=${storyPoints ?? '-'}`
    );
  }

  console.log(`\nCompletado: ${updated} HDU(s) actualizadas de ${stories.length}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('ERROR:', err);
    process.exit(1);
  });