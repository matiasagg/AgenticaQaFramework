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
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [validatingDor, setValidatingDor] = useState<string | null>(null)
  const [applyingFix, setApplyingFix] = useState<string | null>(null)
  // Bug cuyo "push" a GitHub está en curso (para deshabilitar el botón y evitar dobles envíos).
  const [pushingGithub, setPushingGithub] = useState<string | null>(null)
  // La edición dentro del modal DoR la maneja BugDetail (que incluye los
  // metadatos de GitHub: assignee, labels, branchName), igual que la HDU.
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
      setAiError(response.aiError || null)
      setSelectedBug(response.bug)
      await fetchBugs()
    } catch (err: any) {
      alert(err?.error?.message || err?.response?.data?.error?.message || err?.message || 'Error al validar el DoR del bug')
    } finally {
      setValidatingDor(null)
    }
  }

  /**
   * Guarda los cambios del bug y revalida el DoR.
   * Incluye los metadatos de GitHub (assignee, labels, branchName) para que la
   * edición dentro del DoR cubra TODOS los datos que luego se validan/sincronizan.
   */
  const handleSaveBug = async (data: any) => {
    if (!selectedBug) return
    try {
      const response = await bugsApi.update(selectedBug.id, {
        title: data.title,
        description: data.description,
        severity: data.severity,
        stepsToReproduce: data.stepsToReproduce.filter((s: string) => s.trim() !== ''),
        expectedResult: data.expectedResult,
        actualResult: data.actualResult,
        environment: data.environment,
        assignee: data.assignee,
        labels: data.labels,
        branchName: data.branchName,
      })
      if (response.bug) setSelectedBug(response.bug)
      await fetchBugs()
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

  /**
   * Sincroniza los cambios del bug con su issue de GitHub (reutiliza el endpoint
   * /push-to-github, equivalente al push de la HDU). Solo aplica a bugs vinculados.
   */
  const handlePushToGitHub = async (bug: Bug) => {
    if (!bug.githubId) {
      alert('Este bug no está vinculado a un issue de GitHub. Importa el issue desde GitHub Sync para poder sincronizarlo.')
      return
    }
    setPushingGithub(bug.id)
    try {
      const response = await bugsApi.pushToGitHub(bug.id)
      alert(`✅ ${response.message || 'Bug sincronizado con GitHub correctamente.'}`)
      const refreshed = await bugsApi.getById(bug.id)
      if (refreshed.bug && selectedBug?.id === bug.id) setSelectedBug(refreshed.bug)
      await fetchBugs()
    } catch (error: any) {
      alert(error?.error?.message || error?.response?.data?.error?.message || error?.message || 'Error al sincronizar el bug con GitHub')
    } finally {
      setPushingGithub(null)
    }
  }

  /**
   * Abre el detalle de un bug y precarga las opciones de GitHub (colaboradores
   * y ramas del proyecto) para que los combos del modal DoR funcionen igual
   * que en el flujo de las HDUs.
   */
  const handleSelectBug = (bug: Bug) => {
    setSelectedBug(bug)
    if (bug.projectId) loadGithubOptions(bug.projectId)
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

  // Se usa una variable booleana (en vez de "!selectedBug") para que TypeScript
  // no estreche el tipo de selectedBug a null/never dentro del JSX del listado.
  const showList = !selectedBug

  return (
    <div className="space-y-6">
      {/* Detalle del bug: se muestra en lugar del listado cuando hay uno seleccionado.
          Se renderiza dentro del mismo árbol para que los modales (crear/editar,
          overlay DoR) aparezcan ENCIMA del detalle y no queden tapados. */}
      {Boolean(selectedBug) && (
        <BugDetail
          bug={selectedBug!}
          onBack={() => setSelectedBug(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onValidateDor={validateBugDor}
          dorResult={dorResult}
          aiAnalysis={aiAnalysis}
          aiError={aiError}
          onApplyFix={handleApplyFix}
          onCloseDor={() => { setDorResult(null); setAiAnalysis(null); setAiError(null); }}
          isRefreshing={validatingDor !== null}
          applyingFix={applyingFix}
          onSaveBug={handleSaveBug}
          onPushToGitHub={handlePushToGitHub}
          isPushingGithub={pushingGithub === selectedBug?.id}
          collaborators={collaborators}
          branches={branches}
        />
      )}
      {showList && (<>
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
                    onClick={() => handleSelectBug(bug)}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                       <button
                         onClick={(e) => {
                           e.stopPropagation()
                           handleSelectBug(bug)
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
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(bug) }}
                        className="ml-3 text-amber-600 hover:text-amber-800 dark:text-amber-400"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePushToGitHub(bug) }}
                        disabled={!bug.githubId || pushingGithub === bug.id}
                        title={bug.githubId ? 'Sincronizar con GitHub' : 'Solo bugs importados de GitHub'}
                        className="ml-3 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                      >
                        {pushingGithub === bug.id ? 'Sincronizando…' : 'Sincronizar GitHub'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>)}

      {/* Create/Edit Modal (compartido entre listado y detalle) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingBug ? 'Editar Bug' : 'Nuevo Bug'}</h2>
              <button
                onClick={() => { setShowCreate(false); setEditingBug(null) }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Cerrar"
              >
                ✕
              </button>
            </div>
            {/* Formulario ampliado para capturar TODOS los datos que luego valida el DoR
                y se sincronizan con GitHub (pasos, esperado, actual, entorno y metadatos). */}
            <div className="p-6 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Proyecto</label>
                <select className="input-field" value={createData.projectId || ''} onChange={(e) => { setCreateData({ ...createData, projectId: e.target.value }); loadGithubOptions(e.target.value) }}>
                  <option value="">Seleccionar proyecto...</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Título</label>
                <input className="input-field" placeholder="Título" value={createData.title} onChange={(e) => setCreateData({ ...createData, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción</label>
                <textarea className="input-field" placeholder="Descripción" value={createData.description} onChange={(e) => setCreateData({ ...createData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Severidad</label>
                  <select className="input-field" value={createData.severity} onChange={(e) => setCreateData({ ...createData, severity: e.target.value })}>
                    <option value="CRITICAL">Critica</option>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Entorno</label>
                  <input className="input-field" placeholder="Ej: producción, staging, Chrome 120" value={createData.environment || ''} onChange={(e) => setCreateData({ ...createData, environment: e.target.value })} />
                </div>
              </div>

              {/* Pasos para reproducir (lista editable) */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Pasos para reproducir</label>
                {(createData.stepsToReproduce || []).map((step: string, i: number) => (
                  <div key={i} className="flex gap-1 mt-1">
                    <input
                      className="input-field flex-1"
                      placeholder={`Paso ${i + 1}`}
                      value={step}
                      onChange={(e) => {
                        const newSteps = [...(createData.stepsToReproduce || [])]
                        newSteps[i] = e.target.value
                        setCreateData({ ...createData, stepsToReproduce: newSteps })
                      }}
                    />
                    <button
                      onClick={() => {
                        const newSteps = (createData.stepsToReproduce || []).filter((_: string, idx: number) => idx !== i)
                        setCreateData({ ...createData, stepsToReproduce: newSteps })
                      }}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setCreateData({ ...createData, stepsToReproduce: [...(createData.stepsToReproduce || []), ''] })}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  + Agregar paso
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Resultado esperado</label>
                  <textarea className="input-field" placeholder="Resultado esperado" value={createData.expectedResult || ''} onChange={(e) => setCreateData({ ...createData, expectedResult: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Resultado actual</label>
                  <textarea className="input-field" placeholder="Resultado actual" value={createData.actualResult || ''} onChange={(e) => setCreateData({ ...createData, actualResult: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Asignado a</label>
                  <select className="input-field" value={createData.assignee || ''} onChange={(e) => setCreateData({ ...createData, assignee: e.target.value })}>
                    <option value="">Sin asignar</option>
                    {collaborators.map((user) => <option key={user.login} value={user.login}>{user.login}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rama</label>
                  <input className="input-field" list="bug-github-branches" placeholder="Rama" value={createData.branchName || ''} onChange={(e) => setCreateData({ ...createData, branchName: e.target.value })} />
                  <datalist id="bug-github-branches">{branches.map((branch) => <option key={branch} value={branch} />)}</datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Labels (separados por coma)</label>
                <input className="input-field" placeholder="bug, alta, frontend" value={(createData.labels || []).join(', ')} onChange={(e) => setCreateData({ ...createData, labels: e.target.value.split(',').map((label: string) => label.trim()).filter(Boolean) })} />
              </div>
            </div>
            <div className="p-6 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => { setShowCreate(false); setEditingBug(null); }}>Cancelar</button>
              <button className="btn-primary" onClick={async () => {
                try {
                  const payload = {
                    title: createData.title,
                    description: createData.description,
                    severity: createData.severity,
                    stepsToReproduce: (createData.stepsToReproduce || []).filter((s: string) => s && s.trim() !== ''),
                    expectedResult: createData.expectedResult || '',
                    actualResult: createData.actualResult || '',
                    environment: createData.environment || '',
                    assignee: createData.assignee || '',
                    labels: createData.labels || [],
                    branchName: createData.branchName || '',
                  }
                  if (editingBug) {
                    await bugsApi.update(editingBug.id, payload)
                  } else {
                    await bugsApi.create({
                      ...payload,
                      projectId: createData.projectId || projects[0]?.id || '',
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
      )}

      {/* Overlay de carga para validación DoR */}
      {validatingDor && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[200]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-white text-lg font-medium">Validando DoR con IA...</p>
          <p className="text-gray-300 text-sm mt-1">🤖 Gemini está analizando el bug</p>
        </div>
      )}

      {/* El modal DoR se muestra via BugDetail/BugDorModal al validar (el bug queda seleccionado). */}

      {/* Summary */}
      {showList && !loading && !error && bugs.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Mostrando {bugs.length} bug{bugs.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
