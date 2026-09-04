/**
 * Projects Page
 * 
 * Página para gestionar proyectos de QA:
 * - Crear nuevos proyectos
 * - Ver lista de proyectos
 * - Ver detalles de cada proyecto
 */
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

interface Project {
  id: string
  name: string
  description: string
  repository: string | null
  website: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function ProjectsPage() {
  const { token } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    repository: '',
    website: '',
  })

  useEffect(() => {
    if (token) {
      fetchProjects()
    }
  }, [token])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      setProjects(response.data.projects || [])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/projects', {
        ...formData,
        repository: formData.repository || undefined,
        website: formData.website || undefined,
      })
      setShowForm(false)
      setFormData({ name: '', description: '', repository: '', website: '' })
      fetchProjects()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al crear el proyecto')
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este proyecto?')) {
      return
    }
    try {
      await api.delete(`/projects/${projectId}`)
      fetchProjects()
    } catch (error: any) {
      alert(error?.response?.data?.error?.message || 'Error al eliminar el proyecto')
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proyectos</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona tus proyectos de QA
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          + Nuevo Proyecto
        </button>
      </div>

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nuevo Proyecto
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

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  placeholder="Ej: E-commerce Platform"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  rows={3}
                  placeholder="Describe el proyecto..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Repositorio (opcional)
                </label>
                <input
                  type="url"
                  value={formData.repository}
                  onChange={(e) => setFormData(prev => ({ ...prev, repository: e.target.value }))}
                  className="input-field"
                  placeholder="https://github.com/usuario/repo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website (opcional)
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                  className="input-field"
                  placeholder="https://ejemplo.com"
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
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de proyectos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.length === 0 ? (
          <div className="card dark:bg-gray-800 text-center py-12 col-span-full">
            <p className="text-gray-500 dark:text-gray-400">
              No hay proyectos. Crea uno nuevo para comenzar.
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="card dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {project.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {project.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    {project.repository && (
                      <a
                        href={project.repository}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        📁 Repositorio
                      </a>
                    )}
                    {project.website && (
                      <a
                        href={project.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        🌐 Website
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Creado: {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedProject(project)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                  >
                    Ver
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
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

      {/* Modal de detalle del proyecto */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedProject.name}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">Descripción:</span>
                <p className="text-gray-900 dark:text-white">{selectedProject.description}</p>
              </div>
              {selectedProject.repository && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Repositorio:</span>
                  <a
                    href={selectedProject.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline block"
                  >
                    {selectedProject.repository}
                  </a>
                </div>
              )}
              {selectedProject.website && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Website:</span>
                  <a
                    href={selectedProject.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline block"
                  >
                    {selectedProject.website}
                  </a>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-500">Estado:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${selectedProject.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {selectedProject.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Creado:</span>
                <span className="ml-2 text-gray-900 dark:text-white">
                  {new Date(selectedProject.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedProject(null)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}