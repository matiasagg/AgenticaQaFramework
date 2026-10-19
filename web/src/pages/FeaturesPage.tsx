import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { epicsApi, featuresApi, githubSyncApi } from '../services/api'
import PortfolioDorModal from '../components/dor/PortfolioDorModal'

interface FeatureItem {
  id: string
  name: string
  description?: string
  status?: string
  epicId: string
  epic?: { id: string; name: string; projectId?: string }
  createdAt: string
  updatedAt?: string
  dorScore?: number | null
  isReady?: boolean
  externalSystem?: string | null
  externalId?: string | null
  syncStatus?: string | null
}

export default function FeaturesPage() {
  const { token } = useAuth()
  const [features, setFeatures] = useState<FeatureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FeatureItem | null>(null)
  const [epics, setEpics] = useState<any[]>([])
  const [formData, setFormData] = useState({ name: '', description: '', epicId: '' })
  const [dorEntity, setDorEntity] = useState<FeatureItem | null>(null)
  const [dorValidation, setDorValidation] = useState<any>(null)
  const [dorPreview, setDorPreview] = useState<any>(null)
  const [selectedDorFixes, setSelectedDorFixes] = useState<string[]>([])
  const [validatingDor, setValidatingDor] = useState(false)
  const [previewingDor, setPreviewingDor] = useState(false)
  const [applyingDor, setApplyingDor] = useState(false)
  const [pushingFeatureId, setPushingFeatureId] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      fetchFeatures()
      fetchEpics()
    }
  }, [token])

  const fetchFeatures = async () => {
    try {
      const response = await featuresApi.getAll()
      setFeatures(response.features || [])
    } catch (error) {
      console.error('Error fetching features:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEpics = async () => {
    try {
      const response = await epicsApi.getAll()
      setEpics(response.epics || [])
      if (response.epics?.length > 0) setFormData((p) => ({ ...p, epicId: response.epics[0].id }))
    } catch (error) {
      console.error('Error fetching epics:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await featuresApi.update(editing.id, formData)
      } else {
        await featuresApi.create(formData)
      }
      setShowForm(false)
      setEditing(null)
      fetchFeatures()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al crear/actualizar feature')
    }
  }

  const handleEdit = (feature: FeatureItem) => {
    setEditing(feature)
    setFormData({ name: feature.name, description: feature.description || '', epicId: feature.epicId })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta feature?')) return
    try {
      await featuresApi.delete(id)
      fetchFeatures()
    } catch (err) {
      console.error('Error deleting feature', err)
      alert('Error al eliminar feature')
    }
  }

  const handlePushToGitHub = async (feature: FeatureItem) => {
    if (!feature.externalId || !feature.epic?.projectId) return
    try {
      setPushingFeatureId(feature.id)
      await githubSyncApi.pushWorkItem(feature.epic.projectId, { entityType: 'FEATURE', entityId: feature.id })
      alert('Feature sincronizada con GitHub correctamente.')
      await fetchFeatures()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || error?.error?.message || 'Error al sincronizar la feature con GitHub')
    } finally {
      setPushingFeatureId(null)
    }
  }

  const closeDor = () => {
    setDorEntity(null)
    setDorValidation(null)
    setDorPreview(null)
    setSelectedDorFixes([])
  }

  const validateFeatureDor = async (feature: FeatureItem) => {
    setDorEntity(feature)
    setValidatingDor(true)
    setDorPreview(null)
    setSelectedDorFixes([])
    try {
      const response = await featuresApi.validateDor(feature.id)
      setDorValidation(response.validation)
      if (response.feature) {
        setDorEntity(response.feature)
        setFeatures((current) => current.map((item) => item.id === feature.id ? response.feature : item))
      }
    } catch (error: any) {
      alert(error?.error?.message || error?.response?.data?.error?.message || 'Error al validar el DoR de la feature')
    } finally {
      setValidatingDor(false)
    }
  }

  const getDorRecommendations = () => (dorValidation?.checklist || [])
    .filter((item: any) => selectedDorFixes.includes(item.id) && item.suggestedFix)
    .map((item: any) => ({ checkId: item.id, checkName: item.name, message: item.suggestion || item.name, source: 'rules', suggestedFix: item.suggestedFix }))

  const previewFeatureDor = async () => {
    if (!dorEntity) return
    setPreviewingDor(true)
    try {
      const recommendations = getDorRecommendations()
      const response = await featuresApi.previewDorFixes(dorEntity.id, { fixes: recommendations.map((item: any) => item.suggestedFix), recommendations })
      setDorPreview(response.preview)
    } catch (error: any) {
      alert(error?.error?.message || error?.response?.data?.error?.message || 'Error al previsualizar las mejoras')
    } finally {
      setPreviewingDor(false)
    }
  }

  const applyFeatureDor = async () => {
    if (!dorEntity || !dorPreview) return
    setApplyingDor(true)
    try {
      const recommendations = getDorRecommendations()
      const response = await featuresApi.applyDorFixes(dorEntity.id, { fixes: recommendations.map((item: any) => item.suggestedFix), recommendations, baseUpdatedAt: dorPreview.baseUpdatedAt })
      setDorEntity(response.feature)
      setFeatures((current) => current.map((item) => item.id === dorEntity.id ? response.feature : item))
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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>

  return (
    <div className="space-y-6">
      {validatingDor && <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center text-white">Validando DoR...</div>}
      <PortfolioDorModal
        entity={dorEntity ? { name: dorEntity.name, description: dorEntity.description || '' } : { name: '', description: '' }}
        entityLabel="Feature"
        validation={dorValidation}
        preview={dorPreview}
        selectedFixes={selectedDorFixes}
        onToggleFix={(checkId, checked) => setSelectedDorFixes((current) => checked ? [...current, checkId] : current.filter((id) => id !== checkId))}
        onPreview={previewFeatureDor}
        onConfirm={applyFeatureDor}
        onCancelPreview={() => setDorPreview(null)}
        onRefresh={() => dorEntity && validateFeatureDor(dorEntity)}
        onClose={closeDor}
        isRefreshing={validatingDor}
        isPreviewing={previewingDor}
        isApplying={applyingDor}
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Features</h1>
          <p className="text-gray-600 dark:text-gray-400">Listado y administración de features</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nueva Feature</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Feature</h2>
                <button type="button" onClick={() => setShowForm(false)} className="p-2">✕</button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Epic *</label>
                <select value={formData.epicId} onChange={(e) => setFormData((p) => ({ ...p, epicId: e.target.value }))} className="input-field" required>
                  {epics.map((ep: any) => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                <input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} className="input-field" rows={3} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Crear Feature</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {features.length === 0 ? (
          <div className="card dark:bg-gray-800 text-center py-12"><p className="text-gray-500 dark:text-gray-400">No hay features.</p></div>
        ) : (
          features.map((f) => (
            <div key={f.id} className="card dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{f.name}</h3>
                    {f.dorScore !== null && f.dorScore !== undefined && (
                      <span className={`px-2 py-1 rounded-full text-xs ${f.dorScore >= 70 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        DoR: {f.dorScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{f.description}</p>
                  <div className="mt-2 text-sm text-gray-500">Epic: {f.epic?.name || 'Sin epic'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200" onClick={() => validateFeatureDor(f)}>Analizar DoR</button>
                  {f.externalSystem === 'GITHUB' && f.externalId && f.epic?.projectId && (
                    <button
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      onClick={() => handlePushToGitHub(f)}
                      disabled={pushingFeatureId === f.id}
                      title="Publicar cambios locales en GitHub"
                    >
                      {pushingFeatureId === f.id ? 'Sincronizando...' : 'Push a GitHub'}
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => handleEdit(f)}>Editar</button>
                  <button className="btn-danger" onClick={() => handleDelete(f.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
