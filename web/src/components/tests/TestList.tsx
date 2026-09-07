/**
 * Componente TestList.
 * Muestra una tabla con todos los casos de prueba del usuario.
 * Incluye filtros por tipo, prioridad y estado.
 */

import { useState, useEffect } from 'react';
import { TestCase, TestType, Priority, TestStatus } from '../../types';
import { testsApi, projectsApi } from '../../services/api';

interface TestListProps {
  onSelectTest?: (test: TestCase) => void;
}

/** Mapea tipos de test a etiquetas en español */
const typeLabels: Record<TestType, string> = {
  FUNCTIONAL: 'Funcional',
  REGRESSION: 'Regresión',
  EXPLORATORY: 'Exploratorio',
  E2E: 'E2E',
  INTEGRATION: 'Integración',
  PERFORMANCE: 'Performance',
};

/** Mapea estados a colores */
const statusColors: Record<TestStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DEPRECATED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function TestList({ onSelectTest }: TestListProps) {
  const [tests, setTests] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newData, setNewData] = useState<any>({ title: '', description: '', type: 'FUNCTIONAL', priority: 'MEDIUM' });
  const [filterType, setFilterType] = useState<TestType | ''>('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterStatus, setFilterStatus] = useState<TestStatus | ''>('');
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchTests();
    fetchProjects();
  }, [filterType, filterPriority, filterStatus]);

  /** Obtiene los casos de prueba desde la API con filtros aplicados */
  const fetchTests = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (filterPriority) params.priority = filterPriority;
      if (filterStatus) params.status = filterStatus;

      const response = await testsApi.getAll(params);
      setTests(response.tests || []);
      setError(null);
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar los casos de prueba');
    } finally {
      setLoading(false);
    }
  };

  const createTest = async () => {
    try {
      setLoading(true)
      await testsApi.create({
        title: newData.title,
        description: newData.description,
        preconditions: [],
        steps: [],
        expectedResults: [],
        priority: newData.priority,
        type: newData.type,
        projectId: newData.projectId || projects[0]?.id || '',
      })
      setShowCreate(false)
      setNewData({ title: '', description: '', type: 'FUNCTIONAL', priority: 'MEDIUM' })
      await fetchTests()
    } catch (err) {
      console.error('Error creating test', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const res = await projectsApi.getAll()
      setProjects(res.projects || [])
      if (!newData.projectId && res.projects?.length > 0) setNewData((d: any) => ({ ...d, projectId: res.projects[0].id }))
    } catch (err) {
      console.error('Error loading projects', err)
    }
  }

  const deleteTest = async (id: string) => {
    if (!confirm('Eliminar caso de prueba?')) return
    try {
      await testsApi.delete(id)
      await fetchTests()
    } catch (err) {
      console.error('Error deleting test', err)
    }
  }
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);

  const openEditTest = (test: TestCase) => {
    setEditingTest(test);
    setShowCreate(true);
    setNewData({ title: test.title, description: test.description, type: test.type, priority: test.priority, projectId: test.projectId });
  }

  const saveEditTest = async () => {
    if (!editingTest) return;
    try {
      setLoading(true);
      await testsApi.update(editingTest.id, {
        title: newData.title,
        description: newData.description,
        type: newData.type,
        priority: newData.priority,
      });
      setEditingTest(null);
      setShowCreate(false);
      await fetchTests();
    } catch (err) {
      console.error('Error updating test', err);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority: Priority): string => {
    const colors: Record<Priority, string> = {
      HIGH: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };
    return colors[priority];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Casos de Prueba</h1>
        <div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Nuevo Caso</button>
        </div>
      </div>

      {showCreate && (
        <div className="card p-4">
          <h3 className="font-medium">{editingTest ? 'Editar Caso de Prueba' : 'Nuevo Caso de Prueba'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <select className="input-field" value={newData.projectId || ''} onChange={(e) => setNewData({ ...newData, projectId: e.target.value })}>
              {projects.length === 0 ? <option value="">Sin proyecto</option> : projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Título" className="input-field" value={newData.title} onChange={(e) => setNewData({ ...newData, title: e.target.value })} />
            <select className="input-field" value={newData.type} onChange={(e) => setNewData({ ...newData, type: e.target.value as any })}>
              <option value="FUNCTIONAL">Funcional</option>
              <option value="REGRESSION">Regresión</option>
              <option value="EXPLORATORY">Exploratorio</option>
            </select>
            <textarea placeholder="Descripción" className="input-field col-span-2" value={newData.description} onChange={(e) => setNewData({ ...newData, description: e.target.value })} />
          </div>
          <div className="mt-3">
            {editingTest ? (
              <>
                <button className="btn-primary" onClick={saveEditTest}>Guardar</button>
                <button className="btn-ghost ml-2" onClick={() => { setShowCreate(false); setEditingTest(null); }}>Cancelar</button>
              </>
            ) : (
              <>
                <button className="btn-primary" onClick={createTest}>Crear</button>
                <button className="btn-ghost ml-2" onClick={() => setShowCreate(false)}>Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as TestType | '')}
              className="input-field"
            >
              <option value="">Todos</option>
              <option value="FUNCTIONAL">Funcional</option>
              <option value="REGRESSION">Regresión</option>
              <option value="EXPLORATORY">Exploratorio</option>
              <option value="E2E">E2E</option>
              <option value="INTEGRATION">Integración</option>
              <option value="PERFORMANCE">Performance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prioridad
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as Priority | '')}
              className="input-field"
            >
              <option value="">Todas</option>
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Media</option>
              <option value="LOW">Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TestStatus | '')}
              className="input-field"
            >
              <option value="">Todos</option>
              <option value="DRAFT">Borrador</option>
              <option value="ACTIVE">Activo</option>
              <option value="DEPRECATED">Deprecado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando casos de prueba...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <button onClick={fetchTests} className="btn-primary mt-4">
              Reintentar
            </button>
          </div>
        ) : tests.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No se encontraron casos de prueba con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Pasos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {tests.map((test) => (
                  <tr
                    key={test.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 cursor-pointer" onClick={() => onSelectTest?.(test)}>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {test.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {test.description}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {typeLabels[test.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(test.priority)}`}>
                        {test.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[test.status]}`}>
                        {test.status === 'DRAFT' ? 'Borrador' : test.status === 'ACTIVE' ? 'Activo' : 'Deprecado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{test.steps.length} pasos</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(test.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => onSelectTest?.(test)} className="btn-ghost">Ver</button>
                        <button onClick={() => openEditTest(test)} className="btn-ghost">Editar</button>
                        <button onClick={() => deleteTest(test.id)} className="btn-danger">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && !error && tests.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Mostrando {tests.length} caso{tests.length !== 1 ? 's' : ''} de prueba
        </p>
      )}
    </div>
  );
}