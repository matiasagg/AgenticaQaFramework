/**
 * Test Plans Page
 * Gestiona planes de prueba que agrupan suites de tests.
 * Muestra jerarquía: Plan → Suites → Tests.
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { TestSuite } from '../types'

interface TestPlanItem {
  id: string
  name: string
  description: string
  status: string
  projectId: string
  testSuites: TestSuite[]
  userStories: any[]
  createdAt: string
}

export default function TestPlansPage() {
  const { token } = useAuth()
  const [testPlans, setTestPlans] = useState<TestPlanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
  })

  useEffect(() => {
    if (token) {
      fetchTestPlans()
      fetchProjects()
    }
  }, [token])

  const fetchTestPlans = async () => {
    try {
      const response = await api.get('/test-plans')
      setTestPlans(response.data.testPlans || [])
    } catch (error) {
      console.error('Error fetching test plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data.projects || [])
      if (response.data.projects?.length > 0) {
        setFormData(prev => ({ ...prev, projectId: response.data.projects[0].id }))
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/test-plans', formData)
      setShowForm(false)
      setFormData({ name: '', description: '', projectId: projects[0]?.id || '' })
      fetchTestPlans()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al crear el plan de prueba')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan de prueba?')) return
    try {
      await api.delete(`/test-plans/${id}`)
      fetchTestPlans()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al eliminar el plan')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case 'ACTIVE': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'COMPLETED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'ARCHIVED': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Plans</h1>
          <p className="text-gray-600 dark:text-gray-400">Planes de prueba que agrupan suites de tests</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nuevo Plan</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Plan de Prueba</h2>
                <button type="button" onClick={() => setShowForm(false)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">✕</button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proyecto *</label>
                {projects.length === 0 ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">No tienes proyectos. Crea uno primero.</p>
                  </div>
                ) : (
                  <select
                    value={formData.projectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                    className="input-field"
                    required
                  >
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Ej: Plan de Release 1.0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Describe el alcance del plan..."
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Crear Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {testPlans.length === 0 ? (
          <div className="card dark:bg-gray-800 text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No hay planes de prueba. Crea uno nuevo para comenzar.</p>
          </div>
        ) : (
          testPlans.map((plan) => (
            <div key={plan.id} className="card dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{plan.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(plan.status)}`}>{plan.status}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{plan.description}</p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Suites: {plan.testSuites?.length || 0}</span>
                    <span>HDUs: {plan.userStories?.length || 0}</span>
                    <span>Creado: {new Date(plan.createdAt).toLocaleDateString()}</span>
                  </div>
                  {plan.testSuites && plan.testSuites.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {plan.testSuites.map((suite) => (
                        <div key={suite.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{suite.title}</span>
                          <div className="flex gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>Tests: {suite.testCases ? (Array.isArray(suite.testCases) ? suite.testCases.length : 0) : 0}</span>
                            <span>Ambiente: {suite.environment || 'staging'}</span>
                            <span>Status: {suite.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(plan.id)} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}