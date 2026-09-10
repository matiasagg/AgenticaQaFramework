/**
 * Repara los identificadores públicos de las HDU y los títulos de suites
 * existentes. Es idempotente: puede ejecutarse más de una vez sin crear
 * correlativos duplicados.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  const stories = await prisma.userStory.findMany({
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, title: true },
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
        data: { title: `${displayId} - ${story.title}` },
      })

      console.log(`  ${displayId} -> ${story.title.substring(0, 50)}`)
    }
  })

  console.log('\nMigración completada: HDU y suites actualizadas!')
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())