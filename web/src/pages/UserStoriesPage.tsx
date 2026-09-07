/**
 * User Stories (HDU) Page
 * 
 * Página para gestionar Historias de Usuario:
 * - Crear nuevas HDUs
 * - Validar DoR (Definition of Ready)
 * - Generar suites de pruebas funcionales
 * - Ver suites de pruebas generadas
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

interface UserStory {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: string
  storyPoints: number | null
  status: string
  dorScore: number | null
  isReady: boolean
  qualityScore: number | null
  testSuite: any
  projectId: string
  epicId?: string | null
  featureId?: string | null
  epic?: { id: string; name: string } | null
  feature?: { id: string; name: string } | null
  createdAt: string
}

interface DorValidation {
  score: number
  isReady: boolean
  checklist: Array<{
    id: string
    name: string
    description: string
    passed: boolean
    weight: number
    suggestion?: string
  }>
  summary: string
  recommendations: string[]
  // Indica si el resultado viene de la caché del backend (análisis guardado)
  // o fue recién generado (con IA). validatedAt: fecha del análisis original.
  cached?: boolean
  validatedAt?: string
}

export default function UserStoriesPage() {
  const { token } = useAuth()
  const [userStories, setUserStories] = useState<UserStory[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [epics, setEpics] = useState<any[]>([])
  const [features, setFeatures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingStory, setEditingStory] = useState<UserStory | null>(null)
  const [selectedStory, setSelectedStory] = useState<UserStory | null>(null)
  const [validationResult, setValidationResult] = useState<DorValidation | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [generatingTests, setGeneratingTests] = useState(false)
  const [validatingDor, setValidatingDor] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    acceptanceCriteria: [''],
    priority: 'MEDIUM',
    storyPoints: 5,
    projectId: '',
    epicId: '',
    featureId: '',
  })

  useEffect(() => {
    if (token) {
      fetchUserStories()
      fetchProjects()
    }
  }, [token])

  const fetchUserStories = async () => {
    try {
      const response = await api.get('/user-stories')
      setUserStories(response.data.userStories)
    } catch (error) {
      console.error('Error fetching user stories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data.projects || [])
      if (response.data.projects?.length > 0) {
        const projectId = response.data.projects[0].id
        setFormData(prev => ({ ...prev, projectId }))
        await fetchEpics(projectId)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const fetchEpics = async (projectId: string) => {
    try {
      const response = await api.get('/epics', { params: { projectId } })
      const list = response.data.epics || []
      setEpics(list)
      const epicId = list[0]?.id || ''
      setFormData((prev) => ({ ...prev, epicId, featureId: '' }))
      if (epicId) {
        await fetchFeatures(epicId)
      } else {
        setFeatures([])
      }
    } catch (error) {
      console.error('Error fetching epics:', error)
      setEpics([])
      setFeatures([])
    }
  }

  const fetchFeatures = async (epicId: string) => {
    try {
      const response = await api.get('/features', { params: { epicId } })
      const list = response.data.features || []
      setFeatures(list)
      setFormData((prev) => ({ ...prev, featureId: list[0]?.id || '' }))
    } catch (error) {
      console.error('Error fetching features:', error)
      setFeatures([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/user-stories', {
        ...formData,
        acceptanceCriteria: formData.acceptanceCriteria.filter(c => c.trim() !== ''),
      })
      setShowForm(false)
      setFormData({
        title: '',
        description: '',
        acceptanceCriteria: [''],
        priority: 'MEDIUM',
        storyPoints: 5,
        projectId: projects[0]?.id || '',
        epicId: '',
        featureId: '',
      })
      fetchUserStories()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al crear la HDU')
    }
  }

  /**
   * Valida el DoR de una HDU.
   * Por defecto usa la caché del backend (análisis persistido, estable).
   * Con `refresh=true` fuerza un nuevo análisis con IA (no-determinista).
   */
  const handleValidateDor = async (storyId: string, refresh = false) => {
    setValidatingDor(storyId)
    try {
      const response = await api.post(
        `/user-stories/${storyId}/validate-dor${refresh ? '?refresh=true' : ''}`
      )
      setValidationResult(response.data.validation)
      setAiAnalysis(response.data.aiAnalysis)
      setSelectedStory(response.data.userStory)
      fetchUserStories()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al validar DoR')
    } finally {
      setValidatingDor(null)
    }
  }

  const handleGenerateTests = async (storyId: string) => {
    setGeneratingTests(true)
    try {
      const response = await api.post(`/user-stories/${storyId}/generate-tests`)
      alert(`Suite generada exitosamente! ${response.data.summary.totalTestCases} casos de prueba creados.`)
      fetchUserStories()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al generar pruebas')
    } finally {
      setGeneratingTests(false)
    }
  }

  const handleEdit = (story: UserStory) => {
    setEditingStory(story)
    setFormData({
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria.length > 0 ? story.acceptanceCriteria : [''],
      priority: story.priority,
      storyPoints: story.storyPoints || 5,
      projectId: story.projectId,
      epicId: story.epicId || '',
      featureId: story.featureId || '',
    })
    if (story.projectId) {
      fetchEpics(story.projectId).then(() => {
        if (story.epicId) fetchFeatures(story.epicId)
      })
    }
    setShowEditForm(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStory) return
    try {
      await api.put(`/user-stories/${editingStory.id}`, {
        ...formData,
        acceptanceCriteria: formData.acceptanceCriteria.filter(c => c.trim() !== ''),
      })
      setShowEditForm(false)
      setEditingStory(null)
      fetchUserStories()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al actualizar la HDU')
    }
  }

  const addCriteriaField = () => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: [...prev.acceptanceCriteria, ''],
    }))
  }

  const updateCriteria = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.map((c, i) => i === index ? value : c),
    }))
  }

  const removeCriteria = (index: number) => {
    setFormData(prev => ({
      ...prev,
      acceptanceCriteria: prev.acceptanceCriteria.filter((_, i) => i !== index),
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case 'DOR_IN_PROGRESS': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      case 'DOR_DONE': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'IN_DEVELOPMENT': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'DONE': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-700'
    }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Stories (HDU)</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona historias de usuario, valida DoR y genera suites de pruebas
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          + Nueva HDU
        </button>
      </div>

      {/* Overlay de carga para validación DoR */}
      {validatingDor && (
        <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-[200]">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-white text-lg font-medium">Validando DoR con IA...</p>
          <p className="text-gray-300 text-sm mt-1">🤖 Gemini está analizando la historia de usuario</p>
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header fijo */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nueva Historia de Usuario
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
            
            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="hdu-form" onSubmit={handleSubmit} className="space-y-5">
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
                    onChange={async (e) => {
                      const projectId = e.target.value
                      setFormData(prev => ({ ...prev, projectId, epicId: '', featureId: '' }))
                      if (projectId) await fetchEpics(projectId)
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Seleccionar proyecto...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Épica *
                  </label>
                  <select
                    value={formData.epicId}
                    onChange={async (e) => {
                      const epicId = e.target.value
                      setFormData(prev => ({ ...prev, epicId, featureId: '' }))
                      if (epicId) await fetchFeatures(epicId)
                    }}
                    className="input-field mt-1"
                    required
                  >
                    <option value="">Seleccionar épica...</option>
                    {epics.map((ep) => (
                      <option key={ep.id} value={ep.id}>{ep.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Feature *
                  </label>
                  <select
                    value={formData.featureId}
                    onChange={(e) => setFormData(prev => ({ ...prev, featureId: e.target.value }))}
                    className="input-field mt-1"
                    required
                  >
                    <option value="">Seleccionar feature...</option>
                    {features.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field mt-1"
                  placeholder="Ej: Inicio de sesión de usuario"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descripción (formato: Como [rol], quiero [acción], para [beneficio]) *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field mt-1"
                  rows={3}
                  placeholder="Como usuario registrado, quiero iniciar sesión en el sistema, para acceder a mi cuenta personal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Criterios de Aceptación * (mínimo 2)
                </label>
                {formData.acceptanceCriteria.map((criteria, index) => (
                  <div key={index} className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={criteria}
                      onChange={(e) => updateCriteria(index, e.target.value)}
                      className="input-field flex-1"
                      placeholder={`Criterio ${index + 1}`}
                    />
                    {formData.acceptanceCriteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCriteria(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCriteriaField}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  + Agregar criterio
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="input-field mt-1"
                  >
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Story Points
                  </label>
                  <select
                    value={formData.storyPoints}
                    onChange={(e) => setFormData(prev => ({ ...prev, storyPoints: Number(e.target.value) }))}
                    className="input-field mt-1"
                  >
                    {[1, 2, 3, 5, 8, 13, 21].map(p => (
                      <option key={p} value={p}>{p} puntos</option>
                    ))}
                  </select>
                </div>
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
                  Crear HDU
                </button>
              </div>
              </form>
            </div>
            
            {/* Botones fijos en la parte inferior */}
            <div className="p-6 pt-0 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" form="hdu-form" className="btn-primary">
                  Crear HDU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validación DoR */}
      {validationResult && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Resultado Validación DoR
              </h2>
              {/* Indicador de origen del resultado: caché (guardado) o freshly generado */}
              <div className="flex items-center gap-2">
                {validationResult.cached && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                    📌 Guardado{validationResult.validatedAt ? ` · ${new Date(validationResult.validatedAt).toLocaleString()}` : ''}
                  </span>
                )}
                <button
                  onClick={() => selectedStory && handleValidateDor(selectedStory.id, true)}
                  disabled={validatingDor === selectedStory?.id}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 disabled:opacity-50"
                  title="Vuelve a ejecutar el análisis con IA (el resultado puede variar)"
                >
                  🔄 Refrescar análisis
                </button>
              </div>
            </div>
            
            {/* Score */}
            <div className={`p-4 rounded-lg mb-4 ${validationResult.isReady ? 'bg-green-50 dark:bg-green-900' : 'bg-yellow-50 dark:bg-yellow-900'}`}>
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">
                  Score: {validationResult.score}%
                </span>
                <span className={`px-3 py-1 rounded-full text-sm ${validationResult.isReady ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                  {validationResult.isReady ? '✓ Lista para pruebas' : '✗ Necesita mejoras'}
                </span>
              </div>
              <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                {validationResult.summary}
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-2 mb-4">
              {validationResult.checklist.map((item) => (
                <div key={item.id} className={`p-3 rounded-lg ${item.passed ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.name}</span>
                    <span>{item.passed ? '✓' : '✗'}</span>
                  </div>
                  {!item.passed && item.suggestion && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      💡 {item.suggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {validationResult.recommendations.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-4">
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                  Recomendaciones:
                </h3>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300">
                  {validationResult.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Analysis */}
            {aiAnalysis && (
              <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg mb-4">
                <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-2 flex items-center">
                  🤖 Análisis de IA (Gemini)
                  <span className="ml-2 px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded-full text-xs">
                    Score IA: {aiAnalysis.score}%
                  </span>
                </h3>
                
                {aiAnalysis.missingElements?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Elementos faltantes:</p>
                    <ul className="list-disc list-inside text-sm text-purple-600 dark:text-purple-400">
                      {aiAnalysis.missingElements.map((elem: string, i: number) => (
                        <li key={i}>{elem}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.suggestions?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Sugerencias de IA:</p>
                    <ul className="list-disc list-inside text-sm text-purple-600 dark:text-purple-400">
                      {aiAnalysis.suggestions.map((sug: string, i: number) => (
                        <li key={i}>{sug}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.riskAreas?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Áreas de riesgo:</p>
                    <ul className="list-disc list-inside text-sm text-purple-600 dark:text-purple-400">
                      {aiAnalysis.riskAreas.map((risk: string, i: number) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiAnalysis.improvedDescription && (
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Descripción mejorada sugerida:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      "{aiAnalysis.improvedDescription}"
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setValidationResult(null)
                  setAiAnalysis(null)
                }}
                className="btn-secondary"
              >
                Cerrar
              </button>
              {validationResult.isReady && selectedStory && (
                <button
                  onClick={() => {
                    handleGenerateTests(selectedStory.id)
                    setValidationResult(null)
                    setAiAnalysis(null)
                  }}
                  className="btn-primary"
                  disabled={generatingTests}
                >
                  {generatingTests ? 'Generando...' : 'Generar Suite de Pruebas'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header fijo */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Editar Historia de Usuario
                </h2>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Contenido scrolleable */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="hdu-edit-form" onSubmit={handleUpdate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proyecto *
                </label>
                <select
                  value={formData.projectId}
                  onChange={async (e) => {
                    const projectId = e.target.value
                    setFormData(prev => ({ ...prev, projectId, epicId: '', featureId: '' }))
                    if (projectId) await fetchEpics(projectId)
                  }}
                  className="input-field"
                  required
                >
                  <option value="">Seleccionar proyecto...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Épica *
                  </label>
                  <select
                    value={formData.epicId}
                    onChange={async (e) => {
                      const epicId = e.target.value
                      setFormData(prev => ({ ...prev, epicId, featureId: '' }))
                      if (epicId) await fetchFeatures(epicId)
                    }}
                    className="input-field mt-1"
                    required
                  >
                    <option value="">Seleccionar épica...</option>
                    {epics.map((ep) => (
                      <option key={ep.id} value={ep.id}>{ep.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Feature *
                  </label>
                  <select
                    value={formData.featureId}
                    onChange={(e) => setFormData(prev => ({ ...prev, featureId: e.target.value }))}
                    className="input-field mt-1"
                    required
                  >
                    <option value="">Seleccionar feature...</option>
                    {features.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field mt-1"
                  placeholder="Ej: Inicio de sesión de usuario"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descripción *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field mt-1"
                  rows={3}
                  placeholder="Como usuario registrado, quiero iniciar sesión en el sistema, para acceder a mi cuenta personal"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Criterios de Aceptación * (mínimo 2)
                </label>
                {formData.acceptanceCriteria.map((criteria, index) => (
                  <div key={index} className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={criteria}
                      onChange={(e) => updateCriteria(index, e.target.value)}
                      className="input-field flex-1"
                      placeholder={`Criterio ${index + 1}`}
                    />
                    {formData.acceptanceCriteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCriteria(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCriteriaField}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  + Agregar criterio
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="input-field mt-1"
                  >
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Story Points
                  </label>
                  <select
                    value={formData.storyPoints}
                    onChange={(e) => setFormData(prev => ({ ...prev, storyPoints: Number(e.target.value) }))}
                    className="input-field mt-1"
                  >
                    {[1, 2, 3, 5, 8, 13, 21].map(p => (
                      <option key={p} value={p}>{p} puntos</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Cambios
                </button>
              </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Lista de HDUs */}
      <div className="grid gap-4">
        {userStories.length === 0 ? (
          <div className="card dark:bg-gray-800 text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No hay historias de usuario. Crea una nueva para comenzar.
            </p>
          </div>
        ) : (
          userStories.map((story) => (
            <div key={story.id} className="card dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {story.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(story.status)}`}>
                      {story.status}
                    </span>
                    {story.dorScore !== null && (
                      <span className={`px-2 py-1 rounded-full text-xs ${story.dorScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        DoR: {story.dorScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {story.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Prioridad: {story.priority}</span>
                    {story.storyPoints && <span>Story Points: {story.storyPoints}</span>}
                    <span>Épica: {story.epic?.name || 'Sin épica'}</span>
                    <span>Feature: {story.feature?.name || 'Sin feature'}</span>
                    {story.testSuite && <span className="text-green-600">✓ Suite generada</span>}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(story)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleValidateDor(story.id)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={validatingDor === story.id}
                  >
                    {validatingDor === story.id ? 'Validando...' : 'Validar DoR'}
                  </button>
                  {story.isReady && !story.testSuite && (
                    <button
                      onClick={() => handleGenerateTests(story.id)}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                      disabled={generatingTests}
                    >
                      Generar Pruebas
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}