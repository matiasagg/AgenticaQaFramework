import { useState, useEffect } from 'react'
import { Bug, Severity, BugStatus } from '../../types'
import { bugsApi, githubSyncApi, projectsApi } from '../../services/api'
import BugDetail from './BugDetail'

interface Filters {
  severity: Severity | ''
  status: BugStatus | ''
  search: string
}

export default function BugList() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createData, setCreateData] = useState<any>({ title: '', description: '', severity: 'MEDIUM', stepsToReproduce: [], expectedResult: '', actualResult: '', projectId: '' })
  const [projects, setProjects] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<Array<{ login: string }>>([])
  const [branches, setBranches] = useState<string[]>([])
  const [editingBug, setEditingBug] = useState<Bug | null>(null)
  const [dorResult, setDorResult] = useState<any>(null)
  const [filters, setFilters] = useState<Filters>({
    severity: '',
    status: '',
    search: '',
  })

  useEffect(() => {
    fetchBugs()
    fetchProjects()
  }, [filters])

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.getAll()
      setProjects(res.projects || [])
      if (!createData.projectId && res.projects?.length > 0) {
        setCreateData((p: any) => ({ ...p, projectId: res.projects[0].id }))
      }
    } catch (err) {
      console.error('Error loading projects', err)
    }
  }

  const loadGithubOptions = async (projectId: string) => {
    if (!projectId) return
    try {
      const [users, branchList] = await Promise.all([
        githubSyncApi.getCollaborators(projectId),
        githubSyncApi.getBranches(projectId),
      ])
      setCollaborators(users.collaborators || [])
      setBranches(branchList.branches || [])
    } catch {
      setCollaborators([])
      setBranches([])
    }
  }

  const validateBugDor = async (bug: Bug) => {
    try {
      const response = await bugsApi.validateDor(bug.id)
      setDorResult(response)
      await fetchBugs()
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Error al validar el DoR del bug')
    }
  }

  const fetchBugs = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (filters.severity) params.severity = filters.severity
      if (filters.status) params.status = filters.status
      if (filters.search) params.search = filters.search

      const response = await bugsApi.getAll(params)
      setBugs(response.bugs || [])
      setError(null)
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar los bugs')
      setBugs([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ severity: '', status: '', search: '' })
  }

  const getSeverityColor = (severity: Severity): string => {
    const colors: Record<Severity, string> = {
      CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return colors[severity]
  }

  const getStatusColor = (status: BugStatus): string => {
    const colors: Record<BugStatus, string> = {
      OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    }
    return colors[status]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleDelete = async (bug: Bug) => {
    if (!confirm('¿Eliminar bug?')) return
    try {
      await bugsApi.delete(bug.id)
      if (selectedBug?.id === bug.id) setSelectedBug(null)
      await fetchBugs()
    } catch (err) {
      console.error('Error deleting bug', err)
      alert('Error al eliminar bug')
    }
  }

  const openEdit = (bug: Bug) => {
    setEditingBug(bug)
    setCreateData({
      title: bug.title,
      description: bug.description,
      severity: bug.severity,
      stepsToReproduce: bug.stepsToReproduce || [],
      expectedResult: bug.expectedResult || '',
      actualResult: bug.actualResult || '',
      environment: bug.environment || '',
      projectId: bug.projectId,
      assignee: bug.assignee || '',
      labels: bug.labels || [],
      branchName: bug.branchName || '',
    })
    loadGithubOptions(bug.projectId)
    setShowCreate(true)
  }

  if (selectedBug) {
    return <BugDetail bug={selectedBug} onBack={() => setSelectedBug(null)} onEdit={openEdit} onDelete={handleDelete} onValidateDor={validateBugDor} dorResult={dorResult} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Bug Reports
        </h1>
        <button className="btn-primary" onClick={() => { setEditingBug(null); setCreateData((p: any) => ({ ...p, labels: [], assignee: '', branchName: '' })); setShowCreate(true); loadGithubOptions(createData.projectId || projects[0]?.id) }}>
          + Nuevo Bug
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por titulo o descripcion..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input-field"
            />
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Severidad
            </label>
            <select
              value={filters.severity}
              onChange={(e) => handleFilterChange('severity', e.target.value)}
              className="input-field"
            >
              <option value="">Todas</option>
              <option value="CRITICAL">Critica</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Media</option>
              <option value="LOW">Baja</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="input-field"
            >
              <option value="">Todos</option>
              <option value="OPEN">Abierto</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrado</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="btn-secondary w-full"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Bug Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando bugs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <button onClick={fetchBugs} className="btn-primary mt-4">
              Reintentar
            </button>
          </div>
        ) : bugs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron bugs con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Titulo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Severidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {bugs.map((bug) => (
                  <tr
                    key={bug.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => setSelectedBug(bug)}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {bug.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {bug.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(bug.severity)}`}>
                        {bug.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bug.status)}`}>
                        {bug.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {bug.projectName || 'Sin proyecto'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(bug.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedBug(bug)
                        }}
                        className="text-primary-600 hover:text-primary-800 dark:text-primary-400"
                      >
                        Ver Detalle
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); validateBugDor(bug) }}
                        className="ml-3 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                      >
                        Analizar DoR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Bug</h2>
              <button onClick={() => setShowCreate(false)} className="p-2">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <select className="input-field" value={createData.projectId || ''} onChange={(e) => { setCreateData({ ...createData, projectId: e.target.value }); loadGithubOptions(e.target.value) }}>
                <option value="">Seleccionar proyecto...</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input className="input-field" placeholder="Título" value={createData.title} onChange={(e) => setCreateData({ ...createData, title: e.target.value })} />
              <textarea className="input-field" placeholder="Descripción" value={createData.description} onChange={(e) => setCreateData({ ...createData, description: e.target.value })} />
              <select className="input-field" value={createData.severity} onChange={(e) => setCreateData({ ...createData, severity: e.target.value })}>
                <option value="CRITICAL">Critica</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </select>
              <select className="input-field" value={createData.assignee || ''} onChange={(e) => setCreateData({ ...createData, assignee: e.target.value })}>
                <option value="">Sin asignar</option>
                {collaborators.map((user) => <option key={user.login} value={user.login}>{user.login}</option>)}
              </select>
              <input className="input-field" placeholder="Labels separados por coma" value={(createData.labels || []).join(', ')} onChange={(e) => setCreateData({ ...createData, labels: e.target.value.split(',').map((label: string) => label.trim()).filter(Boolean) })} />
              <input className="input-field" list="bug-github-branches" placeholder="Rama" value={createData.branchName || ''} onChange={(e) => setCreateData({ ...createData, branchName: e.target.value })} />
              <datalist id="bug-github-branches">{branches.map((branch) => <option key={branch} value={branch} />)}</datalist>
              <div className="flex justify-end gap-2">
                <button className="btn-ghost" onClick={() => { setShowCreate(false); setEditingBug(null); }}>Cancelar</button>
                <button className="btn-primary" onClick={async () => {
                  try {
                    if (editingBug) {
                      await bugsApi.update(editingBug.id, {
                        title: createData.title,
                        description: createData.description,
                        severity: createData.severity,
                        expectedResult: createData.expectedResult,
                        actualResult: createData.actualResult,
                        environment: createData.environment,
                        assignee: createData.assignee,
                        labels: createData.labels || [],
                        branchName: createData.branchName || '',
                      })
                    } else {
                      await bugsApi.create({
                        ...createData,
                        projectId: createData.projectId || projects[0]?.id || '',
                        stepsToReproduce: createData.stepsToReproduce || [],
                        assignee: createData.assignee,
                        labels: createData.labels || [],
                        branchName: createData.branchName || '',
                      })
                    }
                    setShowCreate(false)
                    setEditingBug(null)
                    fetchBugs()
                  } catch (err) {
                    console.error(err)
                    alert('Error guardando bug')
                  }
                }}>{editingBug ? 'Guardar' : 'Crear'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dorResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Análisis DoR del Bug</h2><button onClick={() => setDorResult(null)}>✕</button></div>
            <p className="mb-4">Score: <strong>{dorResult.validation.score}%</strong> — {dorResult.validation.isReady ? 'Listo' : 'Requiere mejoras'}</p>
            <div className="space-y-2">{dorResult.validation.checklist.map((item: any) => <div key={item.id} className="border rounded p-2"><span>{item.passed ? '✅' : '❌'} {item.name}</span>{item.suggestion && <p className="text-sm text-gray-500">{item.suggestion}</p>}</div>)}</div>
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && !error && bugs.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Mostrando {bugs.length} bug{bugs.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}