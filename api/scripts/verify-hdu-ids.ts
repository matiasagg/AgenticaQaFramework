import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  const total = await prisma.userStory.count()
  const conId = await prisma.userStory.count({ where: { displayId: { not: null } } })
  const sinId = await prisma.userStory.count({ where: { displayId: null } })

  console.log(`Total HDUs: ${total}`)
  console.log(`Con displayId: ${conId}`)
  console.log(`Sin displayId: ${sinId}`)

  const todas = await prisma.userStory.findMany({
    orderBy: { hduNumber: 'asc' },
    select: { displayId: true, title: true },
  })

  todas.forEach((s) => console.log(`  ${s.displayId} -> ${s.title.substring(0, 50)}`))
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect())