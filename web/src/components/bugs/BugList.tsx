import { useState, useEffect } from 'react'
import { Bug, Severity, BugStatus } from '../../types'
import { bugsApi, githubSyncApi, projectsApi } from '../../services/api'
import BugDetail from './BugDetail'

interface DorCheckItem {
  id: string
  name: string
  description: string
  passed: boolean
  weight: number
  suggestion?: string
  evaluatedValue?: string | string[]
  suggestedFix?: {
    field: 'title' | 'description' | 'severity' | 'stepsToReproduce' | 'expectedResult' | 'actualResult' | 'environment'
    value: string | string[] | number
  }
}

interface DorRecommendation {
  checkId: string
  checkName: string
  message: string
  source: 'rules' | 'ai'
  suggestedFix?: {
    field: 'title' | 'description' | 'severity' | 'stepsToReproduce' | 'expectedResult' | 'actualResult' | 'environment'
    value: string | string[] | number
  }
}

interface DorValidation {
  score: number
  isReady: boolean
  checklist: DorCheckItem[]
  summary: string
  recommendations: string[]
  recommendationsDetailed: DorRecommendation[]
  cached?: boolean
  validatedAt?: string
}

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
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [validatingDor, setValidatingDor] = useState<string | null>(null)
  const [applyingFix, setApplyingFix] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    stepsToReproduce: [''],
    expectedResult: '',
    actualResult: '',
    environment: '',
  })
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

  /**
   * Valida el DoR de un bug.
   * Por defecto usa la caché del backend (análisis persistido, estable).
   * Con `refresh=true` fuerza un nuevo análisis con IA (no-determinista).
   */
  const validateBugDor = async (bugId: string, refresh = false) => {
    setValidatingDor(bugId)
    try {
      const response = await bugsApi.validateDor(bugId, refresh)
      setDorResult(response)
      setAiAnalysis(response.aiAnalysis)
      setSelectedBug(response.bug)
      await fetchBugs()
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Error al validar el DoR del bug')
    } finally {
      setValidatingDor(null)
    }
  }

  /**
   * Inicia la edición del bug desde el modal DoR.
   */
  const handleStartEdit = () => {
    if (!selectedBug) return
    setEditFormData({
      title: selectedBug.title,
      description: selectedBug.description,
      severity: selectedBug.severity,
      stepsToReproduce: selectedBug.stepsToReproduce && selectedBug.stepsToReproduce.length > 0 ? selectedBug.stepsToReproduce : [''],
      expectedResult: selectedBug.expectedResult || '',
      actualResult: selectedBug.actualResult || '',
      environment: selectedBug.environment || '',
    })
    setIsEditing(true)
  }

  /**
   * Guarda los cambios del bug y revalida el DoR.
   */
  const handleSaveBug = async () => {
    if (!selectedBug) return
    try {
      await bugsApi.update(selectedBug.id, {
        title: editFormData.title,
        description: editFormData.description,
        severity: editFormData.severity,
        stepsToReproduce: editFormData.stepsToReproduce.filter((s: string) => s.trim() !== ''),
        expectedResult: editFormData.expectedResult,
        actualResult: editFormData.actualResult,
        environment: editFormData.environment,
      })
      setIsEditing(false)
      // Revalidar con los nuevos datos
      await validateBugDor(selectedBug.id, true)
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al guardar el bug')
    }
  }

  /**
   * Aplica un parche DoR específico al bug.
   * Llama al endpoint /apply-dor-fixes y recarga la validación.
   */
  const handleApplyFix = async (fix: { field: string; value: string | string[] | number }) => {
    if (!selectedBug) return
    setApplyingFix(selectedBug.id)
    try {
      await bugsApi.applyDorFixes(selectedBug.id, [fix])
      // Recargar la validación para reflejar los cambios
      await validateBugDor(selectedBug.id, true)
      alert(`✅ Mejora aplicada: ${fix.field} actualizado correctamente.`)
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al aplicar la mejora')
    } finally {
      setApplyingFix(null)
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
    return (
      <BugDetail
        bug={selectedBug}
        onBack={() => setSelectedBug(null)}
        onEdit={openEdit}
        onDelete={handleDelete}
        onValidateDor={validateBugDor}
        dorResult={dorResult}
        aiAnalysis={aiAnalysis}
        onApplyFix={handleApplyFix}
        onCloseDor={() => { setDorResult(null); setAiAnalysis(null); }}
        isRefreshing={validatingDor !== null}
      />
    )
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
                        onClick={(e) => { e.stopPropagation(); validateBugDor(bug.id) }}
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

      {/* Overlay de carga para validación DoR */}
      {validatingDor && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[200]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-white text-lg font-medium">Validando DoR con IA...</p>
          <p className="text-gray-300 text-sm mt-1">🤖 Gemini está analizando el bug</p>
        </div>
      )}

      {/* Modal de validación DoR del Bug */}
      {dorResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header fijo */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Validación DoR del Bug
              </h2>
              <div className="flex items-center gap-2">
                {dorResult.validation.cached && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs">
                    📌 Caché
                  </span>
                )}
                <button
                  onClick={() => selectedBug && validateBugDor(selectedBug.id, true)}
                  disabled={validatingDor === selectedBug?.id}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title="Refrescar análisis con IA"
                >
                  🔄
                </button>
                <button
                  onClick={() => { setDorResult(null); setAiAnalysis(null); }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido: 2 columnas */}
            <div className="flex-1 overflow-y-auto flex">
              {/* Columna izquierda: Bug (editable) */}
              <div className="w-2/5 border-r border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
                {selectedBug && !isEditing && (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white mt-1">
                          {selectedBug.title}
                        </h3>
                      </div>
                      <button
                        onClick={handleStartEdit}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 shrink-0"
                      >
                        ✏️ Editar
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedBug.description}
                    </p>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Severidad:</span>
                        <span className="font-medium">{selectedBug.severity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Entorno:</span>
                        <span className="font-medium">{selectedBug.environment || 'No especificado'}</span>
                      </div>
                    </div>
                    {selectedBug.stepsToReproduce && selectedBug.stepsToReproduce.length > 0 && (
                      <div className="text-xs">
                        <p className="text-xs font-medium text-gray-500 mb-1">Pasos para reproducir:</p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          {selectedBug.stepsToReproduce.map((step, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span className="text-gray-400">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedBug.expectedResult && (
                      <div className="text-xs">
                        <span className="text-gray-500">Resultado esperado:</span>
                        <p className="text-gray-600 dark:text-gray-400">{selectedBug.expectedResult}</p>
                      </div>
                    )}
                    {selectedBug.actualResult && (
                      <div className="text-xs">
                        <span className="text-gray-500">Resultado actual:</span>
                        <p className="text-gray-600 dark:text-gray-400">{selectedBug.actualResult}</p>
                      </div>
                    )}
                  </div>
                )}
                {selectedBug && isEditing && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">Editar Bug</span>
                      <div className="flex gap-1">
                        <button
                          onClick={handleSaveBug}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded hover:bg-green-200"
                        >
                          💾 Guardar
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-200"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Título</label>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Descripción</label>
                      <textarea
                        value={editFormData.description}
                        onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                        rows={3}
                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Severidad</label>
                      <select
                        value={editFormData.severity}
                        onChange={(e) => setEditFormData({ ...editFormData, severity: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="CRITICAL">Crítica</option>
                        <option value="HIGH">Alta</option>
                        <option value="MEDIUM">Media</option>
                        <option value="LOW">Baja</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Entorno</label>
                      <input
                        type="text"
                        value={editFormData.environment}
                        onChange={(e) => setEditFormData({ ...editFormData, environment: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Resultado esperado</label>
                      <input
                        type="text"
                        value={editFormData.expectedResult}
                        onChange={(e) => setEditFormData({ ...editFormData, expectedResult: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Resultado actual</label>
                      <input
                        type="text"
                        value={editFormData.actualResult}
                        onChange={(e) => setEditFormData({ ...editFormData, actualResult: e.target.value })}
                        className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Pasos para reproducir</label>
                      {editFormData.stepsToReproduce.map((step, i) => (
                        <div key={i} className="flex gap-1 mt-1">
                          <input
                            type="text"
                            value={step}
                            onChange={(e) => {
                              const newSteps = [...editFormData.stepsToReproduce]
                              newSteps[i] = e.target.value
                              setEditFormData({ ...editFormData, stepsToReproduce: newSteps })
                            }}
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() => {
                              const newSteps = editFormData.stepsToReproduce.filter((_, idx) => idx !== i)
                              setEditFormData({ ...editFormData, stepsToReproduce: newSteps })
                            }}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setEditFormData({ ...editFormData, stepsToReproduce: [...editFormData.stepsToReproduce, ''] })}
                        className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        + Agregar paso
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Columna derecha: Análisis */}
              <div className="w-3/5 p-4 space-y-4 overflow-y-auto">
                {/* Score */}
                <div className={`p-3 rounded-lg text-center ${dorResult.validation.isReady ? 'bg-green-50 dark:bg-green-900' : 'bg-yellow-50 dark:bg-yellow-900'}`}>
                  <div className="text-2xl font-bold">
                    {dorResult.validation.score}%
                  </div>
                  <div className={`text-xs font-medium ${dorResult.validation.isReady ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                    {dorResult.validation.isReady ? '✓ Listo para atención' : '✗ Necesita mejoras'}
                  </div>
                </div>

                {/* Criterios fallidos */}
                {(() => {
                  const failedChecks = dorResult.validation.checklist.filter((item: any) => !item.passed);
                  if (failedChecks.length === 0) return (
                    <p className="text-xs text-green-600 dark:text-green-400 text-center">✓ Todos los criterios pasaron</p>
                  );
                  return (
                    <div className="space-y-2">
                      <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        ⚠️ Por mejorar ({failedChecks.length})
                      </h3>
                      {failedChecks.map((item: any) => (
                        <div key={item.id} className="p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{item.name}</span>
                            {item.suggestedFix && selectedBug && (
                              <button
                                onClick={() => handleApplyFix(item.suggestedFix)}
                                disabled={applyingFix === selectedBug.id}
                                className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded hover:bg-orange-200 disabled:opacity-50"
                              >
                                ✨ Aplicar
                              </button>
                            )}
                          </div>
                          {item.suggestion && (
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              💡 {item.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Criterios pasados */}
                {(() => {
                  const passedChecks = dorResult.validation.checklist.filter((item: any) => item.passed);
                  if (passedChecks.length === 0) return null;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {passedChecks.map((item: any) => (
                        <span key={item.id} className="px-2 py-0.5 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                          ✓ {item.name}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {/* Análisis IA */}
                {aiAnalysis && (
                  <details className="group" open={false}>
                    <summary className="cursor-pointer text-xs font-medium text-purple-700 dark:text-purple-300 hover:text-purple-800 flex items-center gap-1">
                      🤖 Análisis IA ({aiAnalysis.score}%)
                      <span className="text-xs text-gray-400 group-open:hidden">click para expandir</span>
                    </summary>
                    <div className="mt-2 space-y-3 pl-3 border-l-2 border-purple-200 dark:border-purple-800 text-xs">
                      {aiAnalysis.missingElements?.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400">Elementos faltantes:</p>
                          <ul className="text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                            {aiAnalysis.missingElements.map((elem: string, i: number) => (
                              <li key={i}>{elem}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiAnalysis.suggestions?.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400">Sugerencias:</p>
                          <ul className="text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                            {aiAnalysis.suggestions.map((sug: string, i: number) => (
                              <li key={i}>{sug}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiAnalysis.riskAreas?.length > 0 && (
                        <div>
                          <p className="font-medium text-gray-600 dark:text-gray-400">Riesgos:</p>
                          <ul className="text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                            {aiAnalysis.riskAreas.map((risk: string, i: number) => (
                              <li key={i}>{risk}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Botones fijos */}
            <div className="p-4 pt-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => { setDorResult(null); setAiAnalysis(null); }}
                  className="btn-secondary text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
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