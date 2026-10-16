import { PrismaClient } from '@prisma/client'
import { decryptApiKey } from '../src/utils/encryption'
import { extractSourceHduDisplayId, parseHduNumber, reserveHduIdentity } from '../src/services/hduIdentity'
import { fetchIssues } from '../src/services/githubIntegration'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const resolveDuplicatesByAge = process.argv.includes('--resolve-duplicates=oldest')
const projectFilter = process.argv.find((argument) => argument.startsWith('--project='))?.split('=')[1]

type StoryRow = {
  id: string
  projectId: string
  externalId: string | null
  title: string
  hduNumber: number | null
  displayId: string | null
  sourceDisplayId: string | null
  syncMetadata: unknown
  testSuite?: { id: string } | null
}

function projectName(project: { id: string; name: string }): string {
  return `${project.name} (${project.id})`
}

async function reconcile() {
  const projects = await prisma.project.findMany({
    where: {
      ...(projectFilter ? { id: projectFilter } : {}),
      repository: { not: null },
    },
    select: { id: true, name: true, repository: true, githubToken: true },
    orderBy: { createdAt: 'asc' },
  })

  const allStories: StoryRow[] = await prisma.userStory.findMany({
    where: { externalSystem: 'GITHUB' },
    select: {
      id: true,
      projectId: true,
      externalId: true,
      title: true,
      hduNumber: true,
      displayId: true,
      sourceDisplayId: true,
      syncMetadata: true,
      testSuite: { select: { id: true } },
    },
  })

  const ownerByNumber = new Map<number, string>()
  for (const story of allStories) {
    if (story.hduNumber !== null) ownerByNumber.set(story.hduNumber, story.id)
  }

  const discovered: Array<{
    story: StoryRow
    sourceDisplayId: string
    sourceNumber: number
  }> = []

  for (const project of projects) {
    if (!project.repository) continue
    const projectStories = allStories.filter((story) => story.projectId === project.id && story.externalId)
    if (projectStories.length === 0) continue

    let issues
    try {
      const token = project.githubToken ? decryptApiKey(project.githubToken) : undefined
      issues = await fetchIssues(project.repository, 'all', token)
    } catch (error) {
      console.error(`ERROR ${projectName(project)}: ${error instanceof Error ? error.message : String(error)}`)
      continue
    }

    const issueByNumber = new Map(issues.map((issue) => [String(issue.number), issue]))
    for (const story of projectStories) {
      const issue = issueByNumber.get(String(story.externalId))
      if (!issue) {
        console.log(`WARN ${projectName(project)} issue #${story.externalId}: no encontrado en la fuente`)
        continue
      }

      const sourceDisplayId = extractSourceHduDisplayId(issue.title, issue.body)
      const sourceNumber = parseHduNumber(sourceDisplayId)
      if (!sourceDisplayId || sourceNumber === null) {
        console.log(`INFO ${projectName(project)} issue #${story.externalId}: sin ID HDU recuperable`)
        continue
      }

      discovered.push({ story, sourceDisplayId, sourceNumber })
    }
  }

  const candidateById = new Map(discovered.map((candidate) => [candidate.story.id, candidate]))
  const sourceCounts = new Map<number, number>()
  for (const candidate of discovered) {
    sourceCounts.set(candidate.sourceNumber, (sourceCounts.get(candidate.sourceNumber) || 0) + 1)
  }

  const duplicateWinnerByNumber = new Map<number, string>()
  if (resolveDuplicatesByAge) {
    for (const candidate of discovered) {
      if ((sourceCounts.get(candidate.sourceNumber) || 0) <= 1) continue
      const currentWinner = duplicateWinnerByNumber.get(candidate.sourceNumber)
      const currentWinnerCandidate = currentWinner ? candidateById.get(currentWinner) : undefined
      if (!currentWinnerCandidate || Number(candidate.story.externalId) < Number(currentWinnerCandidate.story.externalId)) {
        duplicateWinnerByNumber.set(candidate.sourceNumber, candidate.story.id)
      }
    }
  }

  const sourceCandidateIds = new Set(discovered
    .filter((candidate) => (sourceCounts.get(candidate.sourceNumber) || 0) <= 1 || duplicateWinnerByNumber.get(candidate.sourceNumber) === candidate.story.id)
    .map((candidate) => candidate.story.id))

  const restoreMemo = new Map<string, boolean>()
  const resolving = new Set<string>()
  const canRestore = (candidate: (typeof discovered)[number]): boolean => {
    const cached = restoreMemo.get(candidate.story.id)
    if (cached !== undefined) return cached
    if ((sourceCounts.get(candidate.sourceNumber) || 0) > 1 && duplicateWinnerByNumber.get(candidate.sourceNumber) !== candidate.story.id) {
      restoreMemo.set(candidate.story.id, false)
      return false
    }

    const owner = ownerByNumber.get(candidate.sourceNumber)
    if (!owner || owner === candidate.story.id) {
      restoreMemo.set(candidate.story.id, true)
      return true
    }
    if (!sourceCandidateIds.has(owner)) {
      restoreMemo.set(candidate.story.id, false)
      return false
    }
    // A complete permutation/cycle is safe: all participants move through
    // temporary values before final IDs are written.
    if (resolving.has(candidate.story.id)) return true
    resolving.add(candidate.story.id)
    const ownerCandidate = candidateById.get(owner)
    const result = ownerCandidate ? canRestore(ownerCandidate) : false
    resolving.delete(candidate.story.id)
    restoreMemo.set(candidate.story.id, result)
    return result
  }

  const repairs = discovered.map((candidate) => {
    const owner = ownerByNumber.get(candidate.sourceNumber)
    const duplicateSource = (sourceCounts.get(candidate.sourceNumber) || 0) > 1
    if (duplicateSource) {
      if (resolveDuplicatesByAge && duplicateWinnerByNumber.get(candidate.sourceNumber) !== candidate.story.id) {
        const metadata = candidate.story.syncMetadata && typeof candidate.story.syncMetadata === 'object'
          ? candidate.story.syncMetadata as Record<string, unknown>
          : {}
        if (metadata.identityResolution === 'DUPLICATE_SOURCE_NEW_CANONICAL') {
          return { ...candidate, action: 'ALREADY_CANONICAL' as const, reason: 'El ID fuente es duplicado; el SaaS ya conserva un ID canónico nuevo' }
        }
        return { ...candidate, action: 'ALLOCATE_NEW' as const, reason: `ID duplicado; conserva el issue más antiguo (#${duplicateWinnerByNumber.get(candidate.sourceNumber) ? candidateById.get(duplicateWinnerByNumber.get(candidate.sourceNumber)!)?.story.externalId : 'desconocido'})` }
      }
      if (!resolveDuplicatesByAge) {
        return { ...candidate, action: 'CONFLICT' as const, reason: 'Más de una HDU externa reclama el mismo número fuente' }
      }
    }
    if (!canRestore(candidate)) {
      return { ...candidate, action: 'CONFLICT' as const, reason: `El número ya pertenece a otra HDU no reconciliable (${owner || 'sin propietario libre'})` }
    }
    if (candidate.story.hduNumber === candidate.sourceNumber) {
      return { ...candidate, action: 'ALREADY_CANONICAL' as const, reason: 'El ID fuente ya coincide con el canónico SaaS' }
    }
    return {
      ...candidate,
      action: 'RESTORE' as const,
      reason: owner ? 'Se resolverá un intercambio de IDs dentro de la misma reconciliación' : 'El ID fuente está libre y puede recuperarse',
    }
  })

  console.log(`\nModo: ${apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Candidatos: ${repairs.length}`)
  for (const repair of repairs) {
    console.log(
      `${repair.action.padEnd(18)} ${repair.story.id} ` +
      `${repair.story.displayId || 'sin ID'} -> ${repair.sourceDisplayId} ` +
      `issue #${repair.story.externalId}: ${repair.reason}`,
    )
  }

  const restorable = repairs.filter((repair) => repair.action === 'RESTORE')
  const allocateNew = repairs.filter((repair) => repair.action === 'ALLOCATE_NEW')
  if (!apply) {
    console.log(`\nDry-run finalizado. Se restaurarían ${restorable.length} IDs y se asignarían ${allocateNew.length} IDs nuevos.`)
    console.log('Para aplicar, ejecuta nuevamente con --apply.')
    return
  }

  if (restorable.length === 0 && allocateNew.length === 0) {
    console.log('\nNo hay IDs para restaurar.')
    return
  }

  await prisma.$transaction(async (tx) => {
    // Use temporary unique values instead of nulls. This makes swaps/cycles
    // safe even when a database engine validates unique indexes per row.
    const toMove = [...restorable, ...allocateNew]
    for (let index = 0; index < toMove.length; index += 1) {
      const repair = toMove[index]
      await tx.userStory.update({
        where: { id: repair.story.id },
        data: {
          hduNumber: -(index + 1),
          displayId: `RECONCILE-${index + 1}`,
        },
      })
    }

    for (const repair of restorable) {
      const metadata = repair.story.syncMetadata && typeof repair.story.syncMetadata === 'object'
        ? { ...(repair.story.syncMetadata as Record<string, unknown>) }
        : {}
      metadata.sourceDisplayId = repair.sourceDisplayId
      metadata.canonicalDisplayId = repair.sourceDisplayId
      metadata.identityResolution = 'RECONCILED_SOURCE'
      metadata.reconciledAt = new Date().toISOString()

      await tx.userStory.update({
        where: { id: repair.story.id },
        data: {
          hduNumber: repair.sourceNumber,
          displayId: repair.sourceDisplayId,
          sourceDisplayId: repair.sourceDisplayId,
          syncMetadata: JSON.parse(JSON.stringify(metadata)),
        },
      })

      if (repair.story.testSuite) {
        await tx.testSuite.update({
          where: { id: repair.story.testSuite.id },
          data: {
            title: `${repair.sourceDisplayId} - ${repair.story.title
              .replace(/^\s*HDU\s*[-_:]\s*\d+\s*[-–—:]\s*/i, '')
              .trim()}`,
          },
        })
      }
    }

    for (const repair of allocateNew) {
      const identity = await reserveHduIdentity(tx)
      const metadata = repair.story.syncMetadata && typeof repair.story.syncMetadata === 'object'
        ? { ...(repair.story.syncMetadata as Record<string, unknown>) }
        : {}
      metadata.sourceDisplayId = repair.sourceDisplayId
      metadata.canonicalDisplayId = identity.displayId
      metadata.identityResolution = 'DUPLICATE_SOURCE_NEW_CANONICAL'
      metadata.reconciledAt = new Date().toISOString()

      await tx.userStory.update({
        where: { id: repair.story.id },
        data: {
          hduNumber: identity.hduNumber,
          displayId: identity.displayId,
          sourceDisplayId: repair.sourceDisplayId,
          syncMetadata: JSON.parse(JSON.stringify(metadata)),
        },
      })

      if (repair.story.testSuite) {
        await tx.testSuite.update({
          where: { id: repair.story.testSuite.id },
          data: {
            title: `${identity.displayId} - ${repair.story.title
              .replace(/^\s*HDU\s*[-_:]\s*\d+\s*[-–—:]\s*/i, '')
              .trim()}`,
          },
        })
      }
    }

    const max = await tx.userStory.aggregate({ _max: { hduNumber: true } })
    await tx.hduSequence.upsert({
      where: { id: 'GLOBAL' },
      create: { id: 'GLOBAL', nextNumber: (max._max.hduNumber || 0) + 1 },
      update: { nextNumber: (max._max.hduNumber || 0) + 1 },
    })
  })

  console.log(`\nAplicación completada. IDs restaurados: ${restorable.length}. IDs nuevos asignados: ${allocateNew.length}.`)
}

reconcile()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
