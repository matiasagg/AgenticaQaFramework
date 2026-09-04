import { Bug } from '../../types'

interface BugDetailProps {
  bug: Bug
  onBack: () => void
}

export default function BugDetail({ bug, onBack }: BugDetailProps) {
  const getSeverityColor = (severity: string): string => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return colors[severity] || ''
  }

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    }
    return colors[status] || ''
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="sr-only">Volver</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {bug.title}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getSeverityColor(bug.severity)}`}>
            {bug.severity}
          </span>
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(bug.status)}`}>
            {bug.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Descripcion
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {bug.description}
            </p>
          </div>

          {/* Steps to Reproduce */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Pasos para Reproducir
            </h2>
            {bug.stepsToReproduce.length > 0 ? (
              <ol className="list-decimal list-inside space-y-2">
                {bug.stepsToReproduce.map((step, index) => (
                  <li key={index} className="text-gray-700 dark:text-gray-300">
                    {step}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 italic">
                No se han documentado pasos para reproducir.
              </p>
            )}
          </div>

          {/* Expected vs Actual */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Resultado Esperado
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                {bug.expectedResult || 'No especificado'}
              </p>
            </div>
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Resultado Actual
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                {bug.actualResult || 'No especificado'}
              </p>
            </div>
          </div>

          {/* Evidence Gallery */}
          {bug.evidence.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Evidencias ({bug.evidence.length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {bug.evidence.map((ev) => (
                  <div key={ev.id} className="relative group">
                    {ev.type === 'SCREENSHOT' ? (
                      <img
                        src={ev.thumbnailUrl || ev.url}
                        alt={ev.filename}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                      />
                    ) : (
                      <div className="w-full h-32 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                        <span className="text-3xl">📄</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white text-sm font-medium"
                      >
                        Ver
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Informacion
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Proyecto
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {bug.projectName || 'Sin proyecto'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Asignado a
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {bug.assignee || 'Sin asignar'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Ambiente
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {bug.environment || 'No especificado'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Creado
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(bug.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Ultima actualizacion
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(bug.updatedAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Acciones
            </h2>
            <div className="space-y-2">
              <button className="btn-primary w-full">
                Editar Bug
              </button>
              <button className="btn-secondary w-full">
                Cambiar Estado
              </button>
              <button className="btn-secondary w-full">
                Asignar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}