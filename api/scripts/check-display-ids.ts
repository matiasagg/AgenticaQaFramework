import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function check() {
  const stories = await prisma.userStory.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, displayId: true, hduNumber: true, title: true, createdAt: true },
  })

  console.log('Verificando displayIds...\n')
  
  let problemas = 0
  
  for (const s of stories) {
    const esperado = `HDU-${String(s.hduNumber).padStart(3, '0')}`
    const ok = s.displayId === esperado
    if (!ok) problemas++
    
    const status = ok ? '✅' : '❌'
    console.log(`${status} hduNumber=${s.hduNumber} displayId="${s.displayId}" esperado="${esperado}"`)
    if (!ok) {
      console.log(`   ID interno: ${s.id}`)
      console.log(`   Título: ${s.title.substring(0, 50)}`)
    }
  }
  
  console.log(`\n${problemas === 0 ? '✅ Todos los displayIds están correctos' : `❌ ${problemas} displayIds con problemas`}`)
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect())