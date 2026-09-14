import { Bug } from '../../types'

interface BugDorModalProps {
  bug: Bug | null
  dorResult: any
  aiAnalysis: any
  onClose: () => void
  onRefresh: () => void
  isRefreshing: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  isEditing: boolean
  editFormData: any
  onEditFormChange: (data: any) => void
  onSaveBug: () => void
  onApplyFix: (fix: { field: string; value: string | string[] | number }) => void
  applyingFix: string | null
}

export default function BugDorModal({
  bug,
  dorResult,
  aiAnalysis,
  onClose,
  onRefresh,
  isRefreshing,
  onStartEdit,
  onCancelEdit,
  isEditing,
  editFormData,
  onEditFormChange,
  onSaveBug,
  onApplyFix,
  applyingFix,
}: BugDorModalProps) {
  if (!bug || !dorResult) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header fijo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Validación DoR del Bug
          </h2>
          <div className="flex items-center gap-2">
            {dorResult.validation.cached && (
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs">
                📌 Caché
              </span>
            )}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Refrescar análisis con IA"
            >
              🔄
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido: 2 columnas */}
        <div className="flex-1 overflow-y-auto flex">
          {/* Columna izquierda: Bug (editable) */}
          <div className="w-2/5 border-r border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            {!isEditing ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mt-1">
                      {bug.title}
                    </h3>
                  </div>
                  <button
                    onClick={onStartEdit}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded hover:bg-blue-200 shrink-0"
                  >
                    ✏️ Editar
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {bug.description}
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Severidad:</span>
                    <span className="font-medium">{bug.severity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entorno:</span>
                    <span className="font-medium">{bug.environment || 'No especificado'}</span>
                  </div>
                </div>
                {bug.stepsToReproduce && bug.stepsToReproduce.length > 0 && (
                  <div className="text-xs">
                    <p className="text-xs font-medium text-gray-500 mb-1">Pasos para reproducir:</p>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {bug.stepsToReproduce.map((step: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-gray-400">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {bug.expectedResult && (
                  <div className="text-xs">
                    <span className="text-gray-500">Resultado esperado:</span>
                    <p className="text-gray-600 dark:text-gray-400">{bug.expectedResult}</p>
                  </div>
                )}
                {bug.actualResult && (
                  <div className="text-xs">
                    <span className="text-gray-500">Resultado actual:</span>
                    <p className="text-gray-600 dark:text-gray-400">{bug.actualResult}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">Editar Bug</span>
                  <div className="flex gap-1">
                    <button
                      onClick={onSaveBug}
                      className="px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded hover:bg-green-200"
                    >
                      💾 Guardar
                    </button>
                    <button
                      onClick={onCancelEdit}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-200"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Título</label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => onEditFormChange({ ...editFormData, title: e.target.value })}
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Descripción</label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => onEditFormChange({ ...editFormData, description: e.target.value })}
                    rows={3}
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Severidad</label>
                  <select
                    value={editFormData.severity}
                    onChange={(e) => onEditFormChange({ ...editFormData, severity: e.target.value })}
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="CRITICAL">Crítica</option>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Entorno</label>
                  <input
                    type="text"
                    value={editFormData.environment}
                    onChange={(e) => onEditFormChange({ ...editFormData, environment: e.target.value })}
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Resultado esperado</label>
                  <input
                    type="text"
                    value={editFormData.expectedResult}
                    onChange={(e) => onEditFormChange({ ...editFormData, expectedResult: e.target.value })}
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Resultado actual</label>
                  <input
                    type="text"
                    value={editFormData.actualResult}
                    onChange={(e) => onEditFormChange({ ...editFormData, actualResult: e.target.value })}
                    className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Pasos para reproducir</label>
                  {editFormData.stepsToReproduce?.map((step: string, i: number) => (
                    <div key={i} className="flex gap-1 mt-1">
                      <input
                        type="text"
                        value={step}
                        onChange={(e) => {
                          const newSteps = [...editFormData.stepsToReproduce]
                          newSteps[i] = e.target.value
                          onEditFormChange({ ...editFormData, stepsToReproduce: newSteps })
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => {
                          const newSteps = editFormData.stepsToReproduce.filter((_: string, idx: number) => idx !== i)
                          onEditFormChange({ ...editFormData, stepsToReproduce: newSteps })
                        }}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => onEditFormChange({ ...editFormData, stepsToReproduce: [...editFormData.stepsToReproduce, ''] })}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    + Agregar paso
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Columna derecha: Análisis */}
          <div className="w-3/5 p-4 space-y-4 overflow-y-auto">
            {/* Score */}
            <div className={`p-3 rounded-lg text-center ${dorResult.validation.isReady ? 'bg-green-50 dark:bg-green-900' : 'bg-yellow-50 dark:bg-yellow-900'}`}>
              <div className="text-2xl font-bold">
                {dorResult.validation.score}%
              </div>
              <div className={`text-xs font-medium ${dorResult.validation.isReady ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                {dorResult.validation.isReady ? '✓ Listo para atención' : '✗ Necesita mejoras'}
              </div>
            </div>

            {/* Criterios fallidos */}
            {(() => {
              const failedChecks = dorResult.validation.checklist.filter((item: any) => !item.passed)
              if (failedChecks.length === 0) return (
                <p className="text-xs text-green-600 dark:text-green-400 text-center">✓ Todos los criterios pasaron</p>
              )
              return (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    ⚠️ Por mejorar ({failedChecks.length})
                  </h3>
                  {failedChecks.map((item: any) => (
                    <div key={item.id} className="p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{item.name}</span>
                        {item.suggestedFix && (
                          <button
                            onClick={() => onApplyFix(item.suggestedFix)}
                            disabled={applyingFix === bug.id}
                            className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 rounded hover:bg-orange-200 disabled:opacity-50"
                          >
                            ✨ Aplicar
                          </button>
                        )}
                      </div>
                      {item.suggestion && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          💡 {item.suggestion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* Criterios pasados */}
            {(() => {
              const passedChecks = dorResult.validation.checklist.filter((item: any) => item.passed)
              if (passedChecks.length === 0) return null
              return (
                <div className="flex flex-wrap gap-1">
                  {passedChecks.map((item: any) => (
                    <span key={item.id} className="px-2 py-0.5 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                      ✓ {item.name}
                    </span>
                  ))}
                </div>
              )
            })()}

            {/* Análisis IA */}
            {aiAnalysis && (
              <details className="group" open={false}>
                <summary className="cursor-pointer text-xs font-medium text-purple-700 dark:text-purple-300 hover:text-purple-800 flex items-center gap-1">
                  🤖 Análisis IA ({aiAnalysis.score}%)
                  <span className="text-xs text-gray-400 group-open:hidden">click para expandir</span>
                </summary>
                <div className="mt-2 space-y-3 pl-3 border-l-2 border-purple-200 dark:border-purple-800 text-xs">
                  {aiAnalysis.missingElements?.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Elementos faltantes:</p>
                      <ul className="text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                        {aiAnalysis.missingElements.map((elem: string, i: number) => (
                          <li key={i}>{elem}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiAnalysis.suggestions?.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Sugerencias:</p>
                      <ul className="text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                        {aiAnalysis.suggestions.map((sug: string, i: number) => (
                          <li key={i}>{sug}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiAnalysis.riskAreas?.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Riesgos:</p>
                      <ul className="text-gray-500 dark:text-gray-400 list-disc list-inside space-y-1">
                        {aiAnalysis.riskAreas.map((risk: string, i: number) => (
                          <li key={i}>{risk}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Botones fijos */}
        <div className="p-4 pt-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}