/**
 * GitHub Sync Page
 * Importa issues de GitHub como Historias de Usuario (HDUs).
 * Permite ver ramas y PRs del repositorio del proyecto.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { githubSyncApi, projectsApi } from '../services/api'

interface GitHubIssuePreview {
  number: number
  title: string
  url: string
  labels: string[]
  state: 'open' | 'closed'
  updatedAt?: string
  targetType: 'EPIC' | 'FEATURE' | 'HDU' | 'BUG'
  alreadyImported: boolean
  needsSync: boolean
  syncEventId?: string | null
  sourceDisplayId?: string | null
  canonicalDisplayId?: string | null
  changes: GitHubSyncChange[]
  mapped: {
    title: string
    priority?: string
    severity?: string
    acceptanceCriteria?: string[]
  }
}

interface GitHubSyncChange {
  field: string
  label: string
  localValue: string | string[] | number | null
  githubValue: string | string[] | number | null
}

interface GitHubProject {
  id: string
  name: string
  repository?: string | null
}

interface PullRequest {
  number: number
  title: string
  branch: string
  url: string
  state: string
}

function getErrorMessage(error: unknown, fallback: string): string {
  const value = error as {
    response?: { data?: { error?: { message?: string } | string; message?: string } }
    error?: { message?: string } | string
  }
  const responseError = value.response?.data?.error
  if (typeof responseError === 'string') return responseError
  if (responseError?.message) return responseError.message
  if (value.response?.data?.message) return value.response.data.message
  if (typeof value.error === 'string') return value.error
  if (value.error?.message) return value.error.message
  return fallback
}

export default function GitHubSyncPage() {
  const { token } = useAuth()
  const [projects, setProjects] = useState<GitHubProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [issues, setIssues] = useState<GitHubIssuePreview[]>([])
  const [selectedIssues, setSelectedIssues] = useState<number[]>([])
  const [pulls, setPulls] = useState<PullRequest[]>([])
  const [branches, setBranches] = useState<string[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [pullsLoading, setPullsLoading] = useState(false)
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [issueState, setIssueState] = useState<'open' | 'closed' | 'all'>('open')
  const [pullState, setPullState] = useState<'open' | 'closed' | 'all'>('open')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedChanges, setExpandedChanges] = useState<number | null>(null)
  const currentProject = projects.find(project => project.id === selectedProject)
  const pendingUpdates = issues.filter(issue => issue.needsSync)
  const selectedImportNumbers = selectedIssues.filter(number => {
    const issue = issues.find(item => item.number === number)
    return issue && !issue.alreadyImported
  })
  const selectedSyncNumbers = selectedIssues.filter(number => {
    const issue = issues.find(item => item.number === number)
    return issue?.needsSync
  })

  useEffect(() => {
    if (token) fetchProjects()
  }, [token])

  const fetchProjects = async () => {
    try {
      setProjectsLoading(true)
      const res = await projectsApi.getAll()
      const nextProjects: GitHubProject[] = res.projects || []
      setProjects(nextProjects)
      setSelectedProject(previous => nextProjects.some(project => project.id === previous)
        ? previous
        : nextProjects[0]?.id || '')
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al cargar proyectos'))
    } finally {
      setProjectsLoading(false)
    }
  }

  const loadIssues = async () => {
    if (!selectedProject) return
    if (!currentProject?.repository) {
      setIssues([])
      setSelectedIssues([])
      return
    }

    try {
      setIssuesLoading(true)
      setError(null)
      const res = await githubSyncApi.previewIssues(selectedProject, issueState)
      const nextIssues: GitHubIssuePreview[] = res.issues || []
      setIssues(nextIssues)
      setSelectedIssues(previous => previous.filter(number => nextIssues.some(issue => issue.number === number)))
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al cargar issues de GitHub'))
      setIssues([])
    } finally {
      setIssuesLoading(false)
    }
  }

  const loadPulls = async () => {
    if (!selectedProject || !currentProject?.repository) {
      setPulls([])
      return
    }

    try {
      setPullsLoading(true)
      const res = await githubSyncApi.getPulls(selectedProject, pullState)
      setPulls(res.pulls || [])
    } catch (err: any) {
      setPulls([])
      setError(getErrorMessage(err, 'Error al cargar pull requests de GitHub'))
    } finally {
      setPullsLoading(false)
    }
  }

  const loadBranches = async () => {
    if (!selectedProject || !currentProject?.repository) {
      setBranches([])
      return
    }

    try {
      setBranchesLoading(true)
      const res = await githubSyncApi.getBranches(selectedProject)
      setBranches(res.branches || [])
    } catch (err: any) {
      setBranches([])
      setError(getErrorMessage(err, 'Error al cargar ramas de GitHub'))
    } finally {
      setBranchesLoading(false)
    }
  }

  useEffect(() => {
    setSelectedIssues([])
    setMessage(null)
    setExpandedChanges(null)

    if (!selectedProject || !currentProject?.repository) {
      setIssues([])
      setPulls([])
      setBranches([])
      setError(null)
      return
    }

    void loadIssues()
    void loadPulls()
    void loadBranches()
    const interval = window.setInterval(() => void loadIssues(), 60_000)
    return () => window.clearInterval(interval)
  }, [selectedProject, issueState, pullState, currentProject?.repository])

  const toggleIssue = (number: number) => {
    setSelectedIssues(prev =>
      prev.includes(number) ? prev.filter(n => n !== number) : [...prev, number]
    )
  }

  const handleImport = async () => {
    if (selectedImportNumbers.length === 0) return
    try {
      setImporting(true)
      setError(null)
      const res = await githubSyncApi.importIssues(selectedProject, {
        issueNumbers: selectedImportNumbers,
      })
      const byType = res.summary.byType || {}
      setMessage(
        `✅ ${res.summary.success} issues importados (${byType.EPIC || 0} épicas, ${byType.FEATURE || 0} features, ${byType.HDU || 0} HDUs, ${byType.BUG || 0} bugs)` +
        `${res.summary.skipped > 0 ? ` · ${res.summary.skipped} omitidos` : ''}` +
        `${res.summary.failed > 0 ? ` · ${res.summary.failed} fallaron` : ''}`
      )
      setSelectedIssues([])
      await loadIssues()
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al importar issues'))
    } finally {
      setImporting(false)
    }
  }

  const handleSync = async () => {
    if (selectedSyncNumbers.length === 0) return
    try {
      setSyncing(true)
      setError(null)
      const res = await githubSyncApi.syncIssues(selectedProject, selectedSyncNumbers)
      setMessage(`✅ ${res.summary.synced} elementos actualizados desde GitHub`)
      setSelectedIssues([])
      await loadIssues()
    } catch (err: any) {
      setError(getErrorMessage(err, 'Error al sincronizar cambios de GitHub'))
    } finally {
      setSyncing(false)
    }
  }

  const handleResolveEvent = async (issue: GitHubIssuePreview, action: 'accept' | 'reject') => {
    if (!issue.syncEventId) return
    try {
      setSyncing(true)
      setError(null)
      if (action === 'accept') {
        await githubSyncApi.acceptEvent(selectedProject, issue.syncEventId)
        setMessage(`✅ Cambios del issue #${issue.number} aplicados en el SaaS`)
      } else {
        await githubSyncApi.rejectEvent(selectedProject, issue.syncEventId)
        setMessage(`✅ Cambios del issue #${issue.number} rechazados`)
      }
      setSelectedIssues(previous => previous.filter(number => number !== issue.number))
      setExpandedChanges(null)
      await loadIssues()
    } catch (err: any) {
      setError(getErrorMessage(err, 'No se pudo resolver el cambio de GitHub'))
    } finally {
      setSyncing(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTargetTypeBadge = (targetType: 'EPIC' | 'FEATURE' | 'HDU' | 'BUG') => {
    if (targetType === 'EPIC') return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    if (targetType === 'FEATURE') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    if (targetType === 'BUG') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
  }

  const formatChangeValue = (value: string | string[] | number | null) => {
    if (Array.isArray(value)) return value.length > 0 ? value.join(' · ') : 'Sin elementos'
    if (value === null || value === '') return 'Sin definir'
    return String(value)
  }

  if (!token) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GitHub Sync</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Importa issues de GitHub como Historias de Usuario y sincroniza ramas/PRs
          </p>
        </div>
      </div>

      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-300">{message}</p>
        </div>
      )}

      {error && (
        <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {pendingUpdates.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Hay {pendingUpdates.length} elemento{pendingUpdates.length === 1 ? '' : 's'} con cambios en GitHub.
            Selecciónalas para sincronizarlas.
          </p>
        </div>
      )}

      {/* Selector de proyecto */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Proyecto (debe tener repositorio GitHub configurado)
        </label>
        <select
          aria-label="Proyecto de GitHub"
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="input-field max-w-md"
          disabled={projectsLoading || projects.length === 0}
        >
          {projects.length === 0 && <option value="">Sin proyectos</option>}
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.repository ? '' : ' (sin repo)'}
            </option>
          ))}
        </select>
        {currentProject?.repository && (
          <a
            href={currentProject.repository}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-primary-600 hover:underline"
          >
            Abrir repositorio ↗
          </a>
        )}
      </div>

      {currentProject && !currentProject.repository && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Este proyecto no tiene un repositorio de GitHub configurado. Configúralo en Proyectos para habilitar la sincronización.
          </p>
        </div>
      )}

      {/* Issues importables */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Issues de GitHub ({issues.length})
            </h2>
            <label className="block mt-2 text-xs text-gray-500 dark:text-gray-400">
              Estado de issues
              <select
                aria-label="Estado de issues"
                value={issueState}
                onChange={(event) => setIssueState(event.target.value as 'open' | 'closed' | 'all')}
                className="ml-2 rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="open">Abiertos</option>
                <option value="closed">Cerrados</option>
                <option value="all">Todos</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button onClick={loadIssues} disabled={issuesLoading || !currentProject?.repository} className="btn-secondary text-sm">
              {issuesLoading ? 'Cargando...' : 'Refrescar'}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedImportNumbers.length === 0}
              className="btn-primary text-sm"
            >
              {importing ? 'Importando...' : `Importar ${selectedImportNumbers.length} nuevos`}
            </button>
            <button
              onClick={handleSync}
              disabled={syncing || selectedSyncNumbers.length === 0}
              className="btn-secondary text-sm"
            >
              {syncing ? 'Sincronizando...' : `Sincronizar ${selectedSyncNumbers.length} cambios`}
            </button>
          </div>
        </div>

        {issuesLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 py-4">
            {currentProject?.repository
              ? 'No hay issues para el filtro seleccionado o no se pudo obtener información de GitHub.'
              : 'Configura un repositorio de GitHub para consultar sus issues.'}
          </p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.number}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  issue.alreadyImported && !issue.needsSync
                    ? 'bg-gray-50 dark:bg-gray-800 opacity-50 border-gray-200 dark:border-gray-700'
                    : selectedIssues.includes(issue.number)
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => (!issue.alreadyImported || issue.needsSync) && toggleIssue(issue.number)}
                onKeyDown={(event) => {
                  if ((event.key === 'Enter' || event.key === ' ') && (!issue.alreadyImported || issue.needsSync)) {
                    event.preventDefault()
                    toggleIssue(issue.number)
                  }
                }}
                role="button"
                tabIndex={issue.alreadyImported && !issue.needsSync ? -1 : 0}
                aria-pressed={selectedIssues.includes(issue.number)}
              >
                <input
                  type="checkbox"
                  aria-label={`Seleccionar issue #${issue.number}`}
                  checked={selectedIssues.includes(issue.number)}
                  disabled={issue.alreadyImported && !issue.needsSync}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  onChange={() => toggleIssue(issue.number)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-400 w-12">#{issue.number}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{issue.title}</p>
                  {(issue.sourceDisplayId || issue.canonicalDisplayId) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Fuente: {issue.sourceDisplayId || 'sin ID'} · SaaS: {issue.canonicalDisplayId || 'se asignará al importar'}
                    </p>
                  )}
                  <div className="flex gap-2 mt-1">
                    {issue.labels.map(label => (
                      <span key={label} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                        {label}
                      </span>
                    ))}
                    <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(issue.mapped.priority || issue.mapped.severity || 'MEDIUM')}`}>
                      {issue.targetType === 'BUG' ? `severidad: ${issue.mapped.severity || 'MEDIUM'}` : `prioridad: ${issue.mapped.priority || 'MEDIUM'}`}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getTargetTypeBadge(issue.targetType)}`}>
                      destino: {issue.targetType}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {issue.state === 'open' ? 'abierto' : 'cerrado'}
                    </span>
                    {issue.mapped.acceptanceCriteria && issue.mapped.acceptanceCriteria.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {issue.mapped.acceptanceCriteria.length} criterios detectados
                      </span>
                    )}
                  </div>
                </div>
                {issue.alreadyImported && (
                  <span className={`text-xs ${issue.needsSync ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                    {issue.needsSync ? '⚠ Cambios pendientes' : '✓ Importado'}
                  </span>
                )}
                {issue.needsSync && (
                  <button
                    type="button"
                    className="text-xs text-primary-600 hover:underline whitespace-nowrap"
                    aria-expanded={expandedChanges === issue.number}
                    onClick={(event) => {
                      event.stopPropagation()
                      setExpandedChanges(current => current === issue.number ? null : issue.number)
                    }}
                  >
                    {expandedChanges === issue.number ? 'Ocultar cambios' : `Ver cambios (${issue.changes.length})`}
                  </button>
                )}
                <a
                  href={issue.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary-600 hover:underline text-sm"
                >
                  Ver ↗
                </a>
                {expandedChanges === issue.number && (
                  <div className="basis-full mt-2 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 p-3 space-y-3">
                    <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                      Cambios detectados antes de sincronizar
                    </p>
                    {issue.changes.length === 0 ? (
                      <p className="text-xs text-gray-600 dark:text-gray-300">GitHub reportó una actualización, pero no hay diferencias en los campos importados.</p>
                    ) : issue.changes.map(change => {
                      const localText = formatChangeValue(change.localValue)
                      const githubText = formatChangeValue(change.githubValue)
                      const isLongDescription = change.field === 'description' && (localText.length > 280 || githubText.length > 280)
                      return (
                        <div key={change.field} className="grid gap-1 text-xs border-t border-yellow-200 dark:border-yellow-800 pt-2 first:border-t-0 first:pt-0">
                          <p className="font-medium text-gray-800 dark:text-gray-100">{change.label}</p>
                          {isLongDescription ? (
                            <>
                              <p className="text-gray-600 dark:text-gray-300">Contenido actualizado: {localText.length} → {githubText.length} caracteres.</p>
                              <details className="text-gray-600 dark:text-gray-300">
                                <summary className="cursor-pointer text-primary-600 hover:underline">Ver contenido completo</summary>
                                <div className="mt-2 space-y-2">
                                  <p className="text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">SaaS: {localText}</p>
                                  <p className="text-green-700 dark:text-green-300 whitespace-pre-wrap break-words">GitHub: {githubText}</p>
                                </div>
                              </details>
                            </>
                          ) : (
                            <>
                              <p className="text-red-700 dark:text-red-300 whitespace-pre-wrap break-words">SaaS: {localText}</p>
                              <p className="text-green-700 dark:text-green-300 whitespace-pre-wrap break-words">GitHub: {githubText}</p>
                            </>
                          )}
                        </div>
                      )
                    })}
                    {issue.syncEventId && (
                      <div className="flex gap-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void handleResolveEvent(issue, 'accept') }}
                          disabled={syncing}
                          className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Aplicar en SaaS
                        </button>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void handleResolveEvent(issue, 'reject') }}
                          disabled={syncing}
                          className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ramas */}
      {currentProject?.repository && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ramas del repositorio ({branches.length})
          </h2>
          {branchesLoading ? (
            <p className="text-gray-500 dark:text-gray-400">Cargando ramas...</p>
          ) : branches.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No se encontraron ramas.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {branches.map(branch => (
                <span key={branch} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {branch}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pull Requests */}
      {currentProject?.repository && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pull Requests ({pulls.length})
            </h2>
            <label className="text-xs text-gray-500 dark:text-gray-400">
              Estado
              <select
                aria-label="Estado de pull requests"
                value={pullState}
                onChange={(event) => setPullState(event.target.value as 'open' | 'closed' | 'all')}
                className="ml-2 rounded border-gray-300 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="open">Abiertos</option>
                <option value="closed">Cerrados</option>
                <option value="all">Todos</option>
              </select>
            </label>
          </div>
          {pullsLoading ? (
            <p className="text-gray-500 dark:text-gray-400">Cargando pull requests...</p>
          ) : pulls.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No se encontraron pull requests.</p>
          ) : (
            <div className="space-y-2">
              {pulls.map(pr => (
                <div key={pr.number} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-400 w-12">#{pr.number}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{pr.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">rama: {pr.branch} · {pr.state}</p>
                  </div>
                  <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm">
                    Ver ↗
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}