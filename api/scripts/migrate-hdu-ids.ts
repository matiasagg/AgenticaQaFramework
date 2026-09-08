/**
 * Script de migración: asigna displayId correlativo (HDU-001, HDU-002, etc.)
 * a las User Stories existentes que no lo tienen.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrate() {
  const stories = await prisma.userStory.findMany({
    where: { displayId: null },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Encontradas ${stories.length} HDUs sin displayId`)

  for (let i = 0; i < stories.length; i++) {
    const story = stories[i]
    const hduNumber = i + 1
    const displayId = `HDU-${String(hduNumber).padStart(3, '0')}`

    await prisma.userStory.update({
      where: { id: story.id },
      data: { hduNumber, displayId },
    })

    console.log(`  ${displayId} -> ${story.title.substring(0, 50)}`)
  }

  console.log('\nMigración completada!')
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())