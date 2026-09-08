import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api, { projectsApi, testSuitesApi, testPlansApi } from '../services/api'
import type { TestSuite, TestPlan, Project } from '../types'

interface SuiteWithPlan extends TestSuite {
  planName?: string
  planStatus?: string
}

export default function TestSuitesPage() {
  const { token } = useAuth()
  const [suites, setSuites] = useState<SuiteWithPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', projectId: '', testPlanId: '' })
  const [projects, setProjects] = useState<Project[]>([])
  const [plans, setPlans] = useState<TestPlan[]>([])
  const [editingSuite, setEditingSuite] = useState<SuiteWithPlan | null>(null)

   useEffect(() => {
     if (!token) return

     const fetchSuites = async () => {
       try {
         // Obtener todas las suites (con y sin plan asociado)
         const [suitesResponse, plansResponse] = await Promise.all([
           testSuitesApi.getAll(),
           api.get('/test-plans').catch(() => ({ data: { testPlans: [] } })),
         ])

         const allSuites: TestSuite[] = suitesResponse.suites || []
         const plans: TestPlan[] = plansResponse.data.testPlans || []

         // Crear un mapa de suiteId -> plan info para asociación rápida
         const suitePlanMap = new Map<string, { name: string; status: string }>()
         for (const plan of plans) {
           for (const suite of plan.testSuites || []) {
             suitePlanMap.set(suite.id, { name: plan.name, status: plan.status })
           }
         }

         // Combinar suites con info del plan (si existe)
         const flattenedSuites: SuiteWithPlan[] = allSuites.map((suite) => {
           const planInfo = suitePlanMap.get(suite.id)
           return {
             ...suite,
             planName: planInfo?.name,
             planStatus: planInfo?.status,
           }
         })

         setSuites(flattenedSuites)
         // fetch projects for dropdown
         try {
           const res = await projectsApi.getAll()
           setProjects(res.projects || res)
         } catch (err) {
           console.error('Error fetching projects', err)
         }
       } catch (error) {
         console.error('Error fetching test suites:', error)
       } finally {
         setLoading(false)
       }
     }

     fetchSuites()
   }, [token])

  const handleCreate = async () => {
    try {
      setLoading(true)
      await testSuitesApi.create({
        title: form.title,
        description: form.description,
        projectId: form.projectId,
        testPlanId: form.testPlanId,
      })
      // Refrescar todas las suites
      const [suitesResponse, plansResponse] = await Promise.all([
        testSuitesApi.getAll(),
        api.get('/test-plans').catch(() => ({ data: { testPlans: [] } })),
      ])
      const allSuites: TestSuite[] = suitesResponse.suites || []
      const plans: TestPlan[] = plansResponse.data.testPlans || []
      const suitePlanMap = new Map<string, { name: string; status: string }>()
      for (const plan of plans) {
        for (const suite of plan.testSuites || []) {
          suitePlanMap.set(suite.id, { name: plan.name, status: plan.status })
        }
      }
      const flattenedSuites: SuiteWithPlan[] = allSuites.map((suite) => {
        const planInfo = suitePlanMap.get(suite.id)
        return { ...suite, planName: planInfo?.name, planStatus: planInfo?.status }
      })
      setSuites(flattenedSuites)
      setShowForm(false)
      setForm({ title: '', description: '', projectId: '', testPlanId: '' })
    } catch (err) {
      console.error('Error creating suite', err)
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (suite: SuiteWithPlan) => {
    setEditingSuite(suite)
    setShowForm(true)
    setForm({ title: suite.title, description: suite.description || '', projectId: suite.projectId, testPlanId: suite.testPlanId || '' })
  }

  const handleUpdate = async () => {
    if (!editingSuite) return
    try {
      setLoading(true)
      await testSuitesApi.update(editingSuite.id, {
        title: form.title,
        description: form.description,
        environment: editingSuite.environment,
        testPlanId: form.testPlanId,
      })
      // Refrescar todas las suites
      const [suitesResponse, plansResponse] = await Promise.all([
        testSuitesApi.getAll(),
        api.get('/test-plans').catch(() => ({ data: { testPlans: [] } })),
      ])
      const allSuites: TestSuite[] = suitesResponse.suites || []
      const plans: TestPlan[] = plansResponse.data.testPlans || []
      const suitePlanMap = new Map<string, { name: string; status: string }>()
      for (const plan of plans) {
        for (const suite of plan.testSuites || []) {
          suitePlanMap.set(suite.id, { name: plan.name, status: plan.status })
        }
      }
      const flattenedSuites: SuiteWithPlan[] = allSuites.map((suite) => {
        const planInfo = suitePlanMap.get(suite.id)
        return { ...suite, planName: planInfo?.name, planStatus: planInfo?.status }
      })
      setSuites(flattenedSuites)
      setEditingSuite(null)
      setShowForm(false)
    } catch (err) {
      console.error('Error updating suite', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectChange = async (projectId: string) => {
    setForm({ ...form, projectId, testPlanId: '' })
    try {
      const res = await testPlansApi.getAll(projectId)
      setPlans(res.testPlans || res)
    } catch (err) {
      console.error('Error fetching plans for project', err)
      setPlans([])
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar suite de pruebas?')) return
    try {
      await api.delete(`/test-suites/${id}`)
      setSuites((s) => s.filter((x) => x.id !== id))
    } catch (err) {
      console.error('Error deleting suite', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Suites</h1>
        <p className="text-gray-600 dark:text-gray-400">Suites agrupadas por plan y por proyecto</p>
        <div className="mt-3">
          <button onClick={() => setShowForm((s) => !s)} className="btn-primary">{showForm ? 'Cancelar' : '+ Nueva Suite'}</button>
        </div>
      </div>

      {showForm && (
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input className="input-field" placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <select className="input-field" value={form.projectId} onChange={(e) => handleProjectChange(e.target.value)}>
              <option value="">Selecciona proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select className="input-field" value={form.testPlanId} onChange={(e) => setForm({ ...form, testPlanId: e.target.value })}>
              <option value="">Selecciona Test Plan</option>
              {plans.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <textarea className="input-field" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="mt-3">
            {editingSuite ? (
              <div className="flex gap-2">
                <button onClick={handleUpdate} className="btn-primary">Guardar cambios</button>
                <button onClick={() => { setEditingSuite(null); setShowForm(false); }} className="btn-ghost">Cancelar</button>
              </div>
            ) : (
              <button onClick={handleCreate} className="btn-primary">Crear Suite</button>
            )}
          </div>
        </div>
      )}

      {suites.length === 0 ? (
        <div className="card dark:bg-gray-800 text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No hay suites creadas todavía.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {suites.map((suite) => (
            <div key={suite.id} className="card dark:bg-gray-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{suite.title}</h3>
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {suite.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{suite.description || 'Sin descripción'}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Plan: {suite.planName || 'Sin plan'}</span>
                    <span>Ambiente: {suite.environment || 'staging'}</span>
                    <span>Casos: {Array.isArray(suite.testCases) ? suite.testCases.length : 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(suite.id)}>Copiar ID</button>
                  <button className="btn-ghost" onClick={() => openEdit(suite)}>Editar</button>
                  <button className="btn-danger" onClick={() => handleDelete(suite.id)}>Eliminar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
