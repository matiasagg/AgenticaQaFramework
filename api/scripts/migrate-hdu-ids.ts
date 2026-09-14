/**
 * Repara los identificadores públicos de las HDU y los títulos de suites
 * existentes. Es idempotente: puede ejecutarse más de una vez sin crear
 * correlativos duplicados.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  const stories = await prisma.userStory.findMany({
    select: { id: true, title: true, externalSystem: true, externalId: true, createdAt: true },
  })

  // GitHub asigna los números de issue en orden ascendente de creación. La
  // API lista normalmente los issues más nuevos primero, por lo que ordenar
  // por createdAt local podía dejar HDU-001 en el issue más reciente.
  stories.sort((left, right) => {
    const leftIssue = left.externalSystem === 'GITHUB' && left.externalId
      ? Number(left.externalId)
      : Number.POSITIVE_INFINITY
    const rightIssue = right.externalSystem === 'GITHUB' && right.externalId
      ? Number(right.externalId)
      : Number.POSITIVE_INFINITY

    if (Number.isFinite(leftIssue) && Number.isFinite(rightIssue) && leftIssue !== rightIssue) {
      return leftIssue - rightIssue
    }
    if (Number.isFinite(leftIssue) !== Number.isFinite(rightIssue)) {
      return Number.isFinite(leftIssue) ? -1 : 1
    }
    return left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id)
  })

  console.log(`Reparando ${stories.length} HDUs y sus suites asociadas`)

  await prisma.$transaction(async (tx) => {
    // Liberar primero las restricciones únicas para permitir corregir datos
    // existentes aunque dos HDU tengan actualmente números intercambiados.
    await tx.userStory.updateMany({
      data: { hduNumber: null, displayId: null },
    })

    for (let i = 0; i < stories.length; i++) {
      const story = stories[i]
      const hduNumber = i + 1
      const displayId = `HDU-${String(hduNumber).padStart(3, '0')}`

      await tx.userStory.update({
        where: { id: story.id },
        data: { hduNumber, displayId },
      })

      await tx.testSuite.updateMany({
        where: { userStoryId: story.id },
        data: {
          title: `${displayId} - ${story.title
            .replace(/^\s*HDU\s*[-_:]\s*\d+\s*[-–—:]\s*/i, '')
            .replace(/^\s*\[\s*HDU(?:\s*[-_:]\s*\d+)?\s*\]\s*/i, '')
            .trim()}`,
        },
      })

      console.log(`  ${displayId} -> ${story.title.substring(0, 50)}`)
    }
  })

  console.log('\nMigración completada: HDU y suites actualizadas!')
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())