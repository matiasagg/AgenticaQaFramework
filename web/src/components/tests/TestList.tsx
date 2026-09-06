import { useState, useEffect } from 'react'
import { TestCase, Priority, TestType, TestStatus } from '../../types'
import { testsApi } from '../../services/api'

interface Filters {
  type: TestType | ''
  priority: Priority | ''
  status: TestStatus | ''
  search: string
}

export default function TestList() {
  const [tests, setTests] = useState<TestCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTest, setSelectedTest] = useState<TestCase | null>(null)
  const [filters, setFilters] = useState<Filters>({ type: '', priority: '', status: '', search: '' })

  useEffect(() => { fetchTests() }, [filters])

  const fetchTests = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (filters.type) params.type = filters.type
      if (filters.priority) params.priority = filters.priority
      if (filters.status) params.status = filters.status
      if (filters.search) params.search = filters.search
      const response = await testsApi.getAll(params)
      setTests(response.tests || [])
      setError(null)
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar los casos de prueba')
      setTests([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({ type: '', priority: '', status: '', search: '' })
  }

  const getPriorityColor = (priority: Priority): string => {
    const colors: Record<Priority, string> = {
      HIGH: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return colors[priority]
  }

  const getStatusColor = (status: TestStatus): string => {
    const colors: Record<TestStatus, string> = {
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      DEPRECATED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    }
    return colors[status]
  }

  const getTypeColor = (type: TestType): string => {
    const colors: Record<TestType, string> = {
      FUNCTIONAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      REGRESSION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      EXPLORATORY: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      E2E: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      INTEGRATION: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      PERFORMANCE: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    }
    return colors[type]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const exportToCSV = () => {
    const headers = ['Titulo', 'Tipo', 'Prioridad', 'Estado', 'Pasos', 'Creado']
    const rows = tests.map(test => [test.title, test.type, test.priority, test.status, test.steps.length, formatDate(test.createdAt)])
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'casos_de_prueba.csv'
    link.click()
  }

  if (selectedTest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={() => setSelectedTest(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedTest.title}</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTypeColor(selectedTest.type)}`}>{selectedTest.type}</span>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(selectedTest.priority)}`}>{selectedTest.priority}</span>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedTest.status)}`}>{selectedTest.status}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Descripcion</h2>
              <p className="text-gray-700 dark:text-gray-300">{selectedTest.description}</p>
            </div>
            {selectedTest.preconditions.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Precondiciones</h2>
                <ul className="list-disc list-inside space-y-1">
                  {selectedTest.preconditions.map((cond, idx) => (<li key={idx} className="text-gray-700 dark:text-gray-300">{cond}</li>))}
                </ul>
              </div>
            )}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pasos</h2>
              <ol className="space-y-4">
                {selectedTest.steps.map((step, idx) => (
                  <li key={idx} className="border-l-4 border-primary-500 pl-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">Paso {step.order}: {step.action}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Esperado: {step.expectedResult}</div>
                  </li>
                ))}
              </ol>
            </div>
            {selectedTest.expectedResults.length > 0 && (
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Resultados Esperados</h2>
                <ul className="list-disc list-inside space-y-1">
                  {selectedTest.expectedResults.map((result, idx) => (<li key={idx} className="text-gray-700 dark:text-gray-300">{result}</li>))}
                </ul>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Informacion</h2>
              <dl className="space-y-3">
                <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Proyecto</dt><dd className="text-sm text-gray-900 dark:text-gray-100">{selectedTest.projectId}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Creado</dt><dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedTest.createdAt)}</dd></div>
                <div><dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Ultima actualizacion</dt><dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(selectedTest.updatedAt)}</dd></div>
              </dl>
            </div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Acciones</h2>
              <div className="space-y-2">
                <button className="btn-primary w-full">Editar</button>
                <button className="btn-secondary w-full">Ejecutar Test</button>
                <button className="btn-secondary w-full">Duplicar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Casos de Prueba</h1>
        <div className="flex items-center space-x-2">
          <button onClick={exportToCSV} className="btn-secondary">Exportar CSV</button>
          <button className="btn-primary">+ Nuevo Test</button>
        </div>
      </div>
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar</label>
            <input type="text" placeholder="Buscar por titulo..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
            <select value={filters.type} onChange={(e) => handleFilterChange('type', e.target.value)} className="input-field">
              <option value="">Todos</option>
              <option value="FUNCTIONAL">Funcional</option>
              <option value="REGRESSION">Regresion</option>
              <option value="EXPLORATORY">Exploratorio</option>
              <option value="E2E">E2E</option>
              <option value="INTEGRATION">Integracion</option>
              <option value="PERFORMANCE">Performance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad</label>
            <select value={filters.priority} onChange={(e) => handleFilterChange('priority', e.target.value)} className="input-field">
              <option value="">Todas</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Media</option>
              <option value="LOW">Baja</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={clearFilters} className="btn-secondary w-full">Limpiar Filtros</button>
          </div>
        </div>
      </div>
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div><p className="mt-2 text-gray-500 dark:text-gray-400">Cargando casos de prueba...</p></div>
        ) : error ? (
          <div className="p-8 text-center"><p className="text-red-500">{error}</p><button onClick={fetchTests} className="btn-primary mt-4">Reintentar</button></div>
        ) : tests.length === 0 ? (
          <div className="p-8 text-center"><p className="text-gray-500 dark:text-gray-400">No se encontraron casos de prueba.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Titulo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Prioridad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pasos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Creado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {tests.map((test) => (
                  <tr key={test.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setSelectedTest(test)}>
                    <td className="px-6 py-4"><div className="text-sm font-medium text-gray-900 dark:text-gray-100">{test.title}</div><div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">{test.description}</div></td>
                    <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(test.type)}`}>{test.type}</span></td>
                    <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(test.priority)}`}>{test.priority}</span></td>
                    <td className="px-6 py-4"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(test.status)}`}>{test.status}</span></td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{test.steps.length}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(test.createdAt)}</td>
                    <td className="px-6 py-4"><button onClick={(e) => { e.stopPropagation(); setSelectedTest(test) }} className="text-primary-600 hover:text-primary-800 dark:text-primary-400">Ver Detalle</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && !error && tests.length > 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400">Mostrando {tests.length} caso{tests.length !== 1 ? 's' : ''} de prueba</div>
      )}
    </div>
  )
}
