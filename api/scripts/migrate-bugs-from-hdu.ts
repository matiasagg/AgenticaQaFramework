/**
 * Script de migración: convierte UserStories importadas desde GitHub
 * que tienen labels de "bug" en BugReports.
 * 
 * Esto corrige el bug donde los issues de GitHub con label "bug"
 * se importaban incorrectamente como HDUs en lugar de BugReports.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Labels que indican que un issue es un bug
const BUG_LABELS = ['bug', 'bugfix', 'error', 'defect']

function hasBugLabels(syncMetadata: any): boolean {
  if (!syncMetadata || typeof syncMetadata !== 'object') return false
  
  // Verificar en labels si existen en metadata
  const labels = syncMetadata.labels as string[] | undefined
  if (labels) {
    const lowerLabels = labels.map((l: string) => l.toLowerCase())
    return lowerLabels.some((l: string) => BUG_LABELS.includes(l))
  }
  
  // Verificar en targetType si fue clasificado como bug
  if (syncMetadata.targetType === 'BUG') return true
  
  return false
}

async function migrate() {
  console.log('🔍 Buscando UserStories importadas desde GitHub con labels de bug...\n')

  // Obtener todas las UserStories importadas desde GitHub
  const stories = await prisma.userStory.findMany({
    where: {
      externalSystem: 'GITHUB',
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Encontradas ${stories.length} UserStories importadas desde GitHub`)

  const storiesToMigrate: Array<{
    id: string
    title: string
    description: string
    syncMetadata: any
    projectId: string
    userId: string
    externalId: string | null
    externalUrl: string | null
  }> = []

  // Filtrar las que tienen labels de bug
  for (const story of stories) {
    const metadata = story.syncMetadata as any
    if (hasBugLabels(metadata)) {
      storiesToMigrate.push({
        id: story.id,
        title: story.title,
        description: story.description,
        syncMetadata: metadata,
        projectId: story.projectId,
        userId: story.userId,
        externalId: story.externalId,
        externalUrl: story.externalUrl,
      })
    }
  }

  if (storiesToMigrate.length === 0) {
    console.log('\n✅ No se encontraron UserStories con labels de bug para migrar.')
    return
  }

  console.log(`\n📋 Se migrarán ${storiesToMigrate.length} UserStories a BugReports:\n`)

  let migratedCount = 0
  let errorCount = 0

  for (const story of storiesToMigrate) {
    try {
      // Verificar si ya existe un BugReport para este issue
      const existingBug = await prisma.bugReport.findFirst({
        where: {
          projectId: story.projectId,
          githubId: story.externalId,
        },
      })

      if (existingBug) {
        console.log(`  ⏭️  "${story.title.substring(0, 50)}" - Ya existe un BugReport para este issue`)
        // Eliminar la UserStory duplicada
        await prisma.userStory.delete({ where: { id: story.id } })
        console.log(`     🗑️  UserStory eliminada (duplicado)`)
        continue
      }

      // Mapear severidad desde labels
      const labels = (story.syncMetadata?.labels as string[]) || []
      const lowerLabels = labels.map((l: string) => l.toLowerCase())
      
      let severity = 'MEDIUM'
      if (lowerLabels.includes('critical') || lowerLabels.includes('p0') || lowerLabels.includes('alta')) {
        severity = 'CRITICAL'
      } else if (lowerLabels.includes('high') || lowerLabels.includes('p1')) {
        severity = 'HIGH'
      } else if (lowerLabels.includes('low') || lowerLabels.includes('p2') || lowerLabels.includes('baja')) {
        severity = 'LOW'
      }

      // Crear el BugReport
      const bug = await prisma.bugReport.create({
        data: {
          title: story.title,
          description: story.description,
          severity: severity as any,
          status: 'OPEN',
          projectId: story.projectId,
          userId: story.userId,
          githubId: story.externalId,
        },
      })

      // Eliminar la UserStory original
      await prisma.userStory.delete({ where: { id: story.id } })

      console.log(`  ✅ "${story.title.substring(0, 50)}" -> Bug #${bug.id.substring(0, 8)} (${severity})`)
      migratedCount++
    } catch (err: any) {
      console.error(`  ❌ Error migrando "${story.title.substring(0, 50)}": ${err.message}`)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 Resumen:`)
  console.log(`   - Migrados: ${migratedCount}`)
  console.log(`   - Errores: ${errorCount}`)
  console.log(`   - Total procesados: ${storiesToMigrate.length}`)
  console.log('\n🎉 Migración completada!')
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())