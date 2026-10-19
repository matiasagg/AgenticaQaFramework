/**
 * Epics Page
 *
 * Gestiona épicas (epics) que agrupan features y user stories (HDUs).
 * Consume la API REST `/api/epics` para listar, crear y eliminar épicas.
 * Los datos de bugs, tests y coverage se usan como indicadores sumarios.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { epicsApi, githubSyncApi, projectsApi } from '../services/api'
import PortfolioDorModal from '../components/dor/PortfolioDorModal'

/** Épica como viene de la API */
interface EpicItem {
  id: string
  name: string
  description: string
  status: string
  projectId: string
  project?: { id: string; name: string }
  features?: Array<{ id: string; name: string; status: string }>
  userStories?: Array<{ id: string; title: string; status: string }>
  createdAt: string
  updatedAt: string
  dorScore?: number | null
  isReady?: boolean
  externalSystem?: string | null
  externalId?: string | null
  syncStatus?: string | null
}

export default function EpicsPage() {
  const { token } = useAuth()
  const [epics, setEpics] = useState<EpicItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEpic, setEditingEpic] = useState<EpicItem | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
  })
  const [dorEntity, setDorEntity] = useState<EpicItem | null>(null)
  const [dorValidation, setDorValidation] = useState<any>(null)
  const [dorPreview, setDorPreview] = useState<any>(null)
  const [selectedDorFixes, setSelectedDorFixes] = useState<string[]>([])
  const [validatingDor, setValidatingDor] = useState(false)
  const [previewingDor, setPreviewingDor] = useState(false)
  const [applyingDor, setApplyingDor] = useState(false)
  const [pushingEpicId, setPushingEpicId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchEpics()
      fetchProjects()
    }
  }, [token])

  const fetchEpics = async () => {
    try {
      const response = await epicsApi.getAll()
      setEpics(response.epics || [])
    } catch (error: any) {
      console.error('Error fetching epics:', error)
      alert(error?.error?.message || 'Error al cargar las épicas')
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await projectsApi.getAll()
      setProjects(response.projects || [])
      if (response.projects?.length > 0) {
        setFormData((prev) => ({ ...prev, projectId: response.projects[0].id }))
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.projectId) {
      alert('El nombre y el proyecto son obligatorios')
      return
    }
    try {
      if (editingEpic) {
        await epicsApi.update(editingEpic.id, { name: formData.name, description: formData.description })
      } else {
        await epicsApi.create({
          name: formData.name,
          description: formData.description,
          projectId: formData.projectId,
        })
      }
      setShowForm(false)
      setEditingEpic(null)
      setFormData({ name: '', description: '', projectId: projects[0]?.id || '' })
      fetchEpics()
    } catch (error: any) {
      alert(error?.error?.message || 'Error al crear/actualizar la épica')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta épica?')) return
    try {
      await epicsApi.delete(id)
      fetchEpics()
    } catch (error: any) {
      alert(error?.error?.message || 'Error al eliminar la épica')
    }
  }

  const handlePushToGitHub = async (epic: EpicItem) => {
    if (!epic.externalId) return
    try {
      setPushingEpicId(epic.id)
      await githubSyncApi.pushWorkItem(epic.projectId, { entityType: 'EPIC', entityId: epic.id })
      alert('Épica sincronizada con GitHub correctamente.')
      await fetchEpics()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || error?.error?.message || 'Error al sincronizar la épica con GitHub')
    } finally {
      setPushingEpicId(null)
    }
  }

  const closeDor = () => {
    setDorEntity(null)
    setDorValidation(null)
    setDorPreview(null)
    setSelectedDorFixes([])
  }

  const validateEpicDor = async (epic: EpicItem) => {
    setDorEntity(epic)
    setValidatingDor(true)
    setDorPreview(null)
    setSelectedDorFixes([])
    try {
      const response = await epicsApi.validateDor(epic.id)
      setDorValidation(response.validation)
      if (response.epic) {
        setDorEntity(response.epic)
        setEpics((current) => current.map((item) => item.id === epic.id ? response.epic : item))
      }
    } catch (error: any) {
      alert(error?.error?.message || error?.response?.data?.error?.message || 'Error al validar el DoR de la épica')
    } finally {
      setValidatingDor(false)
    }
  }

  const getDorRecommendations = () => (dorValidation?.checklist || [])
    .filter((item: any) => selectedDorFixes.includes(item.id) && item.suggestedFix)
    .map((item: any) => ({ checkId: item.id, checkName: item.name, message: item.suggestion || item.name, source: 'rules', suggestedFix: item.suggestedFix }))

  const previewEpicDor = async () => {
    if (!dorEntity) return
    setPreviewingDor(true)
    try {
      const recommendations = getDorRecommendations()
      const response = await epicsApi.previewDorFixes(dorEntity.id, { fixes: recommendations.map((item: any) => item.suggestedFix), recommendations })
      setDorPreview(response.preview)
    } catch (error: any) {
      alert(error?.error?.message || error?.response?.data?.error?.message || 'Error al previsualizar las mejoras')
    } finally {
      setPreviewingDor(false)
    }
  }

  const applyEpicDor = async () => {
    if (!dorEntity || !dorPreview) return
    setApplyingDor(true)
    try {
      const recommendations = getDorRecommendations()
      const response = await epicsApi.applyDorFixes(dorEntity.id, { fixes: recommendations.map((item: any) => item.suggestedFix), recommendations, baseUpdatedAt: dorPreview.baseUpdatedAt })
      setDorEntity(response.epic)
      setEpics((current) => current.map((item) => item.id === dorEntity.id ? response.epic : item))
      setDorPreview(null)
      setSelectedDorFixes([])
      setDorValidation(response.validation)
      alert(`✅ Mejoras aplicadas. Campos modificados: ${(response.changedFields || []).join(', ')}`)
    } catch (error: any) {
      alert(error?.error?.message || error?.response?.data?.error?.message || 'Error al aplicar las mejoras')
    } finally {
      setApplyingDor(false)
    }
  }

  const handleEdit = (epic: EpicItem) => {
    setEditingEpic(epic)
    setFormData({ name: epic.name, description: epic.description || '', projectId: epic.projectId })
    setShowForm(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'ARCHIVED':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PLANNING: 'Planificación',
      IN_PROGRESS: 'En Progreso',
      COMPLETED: 'Completada',
      ARCHIVED: 'Archivada',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {validatingDor && <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center text-white">Validando DoR...</div>}
      <PortfolioDorModal
        entity={dorEntity || { name: '', description: '' }}
        entityLabel="Épica"
        validation={dorValidation}
        preview={dorPreview}
        selectedFixes={selectedDorFixes}
        onToggleFix={(checkId, checked) => setSelectedDorFixes((current) => checked ? [...current, checkId] : current.filter((id) => id !== checkId))}
        onPreview={previewEpicDor}
        onConfirm={applyEpicDor}
        onCancelPreview={() => setDorPreview(null)}
        onRefresh={() => dorEntity && validateEpicDor(dorEntity)}
        onClose={closeDor}
        isRefreshing={validatingDor}
        isPreviewing={previewingDor}
        isApplying={applyingDor}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Épicas</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestión de épicas que agrupan features y user stories (HDUs)
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Nueva Épica
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nueva Épica
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proyecto *
                </label>
                {projects.length === 0 ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      No tienes proyectos. Crea uno primero en la sección de Projects.
                    </p>
                  </div>
                ) : (
                  <select
                    value={formData.projectId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, projectId: e.target.value }))
                    }
                    className="input-field"
                    required
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Ej: Sistema de Autenticación"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="input-field"
                  rows={3}
                  placeholder="Describe el alcance de la épica..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear Épica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de épicas */}
      <div className="grid gap-4">
        {epics.length === 0 ? (
          <div className="card dark:bg-gray-800 text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No hay épicas. Crea una nueva para comenzar.
            </p>
          </div>
        ) : (
          epics.map((epic) => (
            <div key={epic.id} className="card dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {epic.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(epic.status)}`}
                    >
                      {getStatusLabel(epic.status)}
                    </span>
                    {epic.dorScore !== null && epic.dorScore !== undefined && (
                      <span className={`px-2 py-1 rounded-full text-xs ${epic.dorScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        DoR: {epic.dorScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {epic.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Features: {epic.features?.length || 0}</span>
                    <span>HDUs: {epic.userStories?.length || 0}</span>
                    <span>
                      Creado: {new Date(epic.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {epic.userStories && epic.userStories.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {epic.userStories.slice(0, 5).map((story) => (
                          <span
                            key={story.id}
                            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                          >
                            {story.title}
                          </span>
                        ))}
                        {epic.userStories.length > 5 && (
                          <span className="text-xs text-gray-400">
                            +{epic.userStories.length - 5} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200" onClick={() => validateEpicDor(epic)}>Analizar DoR</button>
                  {epic.externalSystem === 'GITHUB' && epic.externalId && (
                    <button
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      onClick={() => handlePushToGitHub(epic)}
                      disabled={pushingEpicId === epic.id}
                      title="Publicar cambios locales en GitHub"
                    >
                      {pushingEpicId === epic.id ? 'Sincronizando...' : 'Push a GitHub'}
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => handleEdit(epic)}>Editar</button>
                  <button
                    onClick={() => handleDelete(epic.id)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
