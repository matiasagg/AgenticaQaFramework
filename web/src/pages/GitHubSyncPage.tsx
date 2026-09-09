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
  targetType: 'EPIC' | 'FEATURE' | 'HDU'
  alreadyImported: boolean
  needsSync: boolean
  mapped: {
    title: string
    priority: string
    acceptanceCriteria: string[]
  }
}

interface PullRequest {
  number: number
  title: string
  branch: string
  url: string
  state: string
}

export default function GitHubSyncPage() {
  const { token } = useAuth()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [issues, setIssues] = useState<GitHubIssuePreview[]>([])
  const [selectedIssues, setSelectedIssues] = useState<number[]>([])
  const [pulls, setPulls] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pendingUpdates = issues.filter(issue => issue.needsSync)

  useEffect(() => {
    if (token) fetchProjects()
  }, [token])

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.getAll()
      setProjects(res.projects || [])
      if (res.projects?.length > 0) {
        setSelectedProject(res.projects[0].id)
      }
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar proyectos')
    }
  }

  const loadIssues = async () => {
    if (!selectedProject) return
    try {
      setLoading(true)
      setError(null)
      const res = await githubSyncApi.previewIssues(selectedProject)
      setIssues(res.issues || [])
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar issues de GitHub')
      setIssues([])
    } finally {
      setLoading(false)
    }
  }

  const loadPulls = async () => {
    if (!selectedProject) return
    try {
      const res = await githubSyncApi.getPulls(selectedProject)
      setPulls(res.pulls || [])
    } catch {
      setPulls([])
    }
  }

  useEffect(() => {
    if (selectedProject) {
      loadIssues()
      loadPulls()
      const interval = window.setInterval(loadIssues, 60_000)
      return () => window.clearInterval(interval)
    }
  }, [selectedProject])

  const toggleIssue = (number: number) => {
    setSelectedIssues(prev =>
      prev.includes(number) ? prev.filter(n => n !== number) : [...prev, number]
    )
  }

  const handleImport = async () => {
    if (selectedIssues.length === 0) return
    try {
      setImporting(true)
      setError(null)
      const res = await githubSyncApi.importIssues(selectedProject, {
        issueNumbers: selectedIssues,
      })
      const byType = res.summary.byType || {}
      setMessage(
        `✅ ${res.summary.success} issues importados (${byType.EPIC || 0} épicas, ${byType.FEATURE || 0} features, ${byType.HDU || 0} HDUs)` +
        `${res.summary.skipped > 0 ? ` · ${res.summary.skipped} omitidos` : ''}` +
        `${res.summary.failed > 0 ? ` · ${res.summary.failed} fallaron` : ''}`
      )
      setSelectedIssues([])
      await loadIssues()
    } catch (err: any) {
      setError(err?.error?.message || 'Error al importar issues')
    } finally {
      setImporting(false)
    }
  }

  const handleSync = async () => {
    if (selectedIssues.length === 0) return
    try {
      setLoading(true)
      setError(null)
      const res = await githubSyncApi.syncIssues(selectedProject, selectedIssues)
      setMessage(`✅ ${res.summary.synced} HDUs actualizadas desde GitHub`)
      setSelectedIssues([])
      await loadIssues()
    } catch (err: any) {
      setError(err?.error?.message || 'Error al sincronizar cambios de GitHub')
    } finally {
      setLoading(false)
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

  const getTargetTypeBadge = (targetType: 'EPIC' | 'FEATURE' | 'HDU') => {
    if (targetType === 'EPIC') return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    if (targetType === 'FEATURE') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
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
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {pendingUpdates.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">
            Hay {pendingUpdates.length} HDU{pendingUpdates.length === 1 ? '' : 's'} con cambios en GitHub.
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
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="input-field max-w-md"
        >
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.repository ? '' : ' (sin repo)'}
            </option>
          ))}
        </select>
      </div>

      {/* Issues importables */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Issues de GitHub ({issues.length})
          </h2>
          <div className="flex gap-2">
            <button onClick={loadIssues} disabled={loading} className="btn-secondary text-sm">
              {loading ? 'Cargando...' : 'Refrescar'}
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selectedIssues.length === 0}
              className="btn-primary text-sm"
            >
              {importing ? 'Importando...' : `Importar ${selectedIssues.length} seleccionados`}
            </button>
            <button
              onClick={handleSync}
              disabled={loading || selectedIssues.every(number => !issues.find(issue => issue.number === number)?.needsSync)}
              className="btn-secondary text-sm"
            >
              Sincronizar cambios
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando issues...</p>
          </div>
        ) : issues.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 py-4">
            No hay issues abiertos o el proyecto no tiene repositorio configurado.
          </p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.number}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  issue.alreadyImported
                    ? 'bg-gray-50 dark:bg-gray-800 opacity-50 border-gray-200 dark:border-gray-700'
                    : selectedIssues.includes(issue.number)
                    ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => (!issue.alreadyImported || issue.needsSync) && toggleIssue(issue.number)}
              >
                <input
                  type="checkbox"
                  checked={selectedIssues.includes(issue.number)}
                  disabled={issue.alreadyImported && !issue.needsSync}
                  onChange={() => toggleIssue(issue.number)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-400 w-12">#{issue.number}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{issue.title}</p>
                  <div className="flex gap-2 mt-1">
                    {issue.labels.map(label => (
                      <span key={label} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                        {label}
                      </span>
                    ))}
                    <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(issue.mapped.priority)}`}>
                      prioridad: {issue.mapped.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${getTargetTypeBadge(issue.targetType)}`}>
                      destino: {issue.targetType}
                    </span>
{issue.mapped.acceptanceCriteria?.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {issue.mapped.acceptanceCriteria.length} criterios detectados
                      </span>
                    )}
                  </div>
                </div>
                {issue.alreadyImported && (
                  <span className="text-xs text-green-600 dark:text-green-400">✓ Importado</span>
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pull Requests */}
      {pulls.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pull Requests abiertos ({pulls.length})
          </h2>
          <div className="space-y-2">
            {pulls.map(pr => (
              <div key={pr.number} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-400 w-12">#{pr.number}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{pr.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">rama: {pr.branch}</p>
                </div>
                <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm">
                  Ver ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}