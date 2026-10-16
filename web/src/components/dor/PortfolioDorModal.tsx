interface DorFix {
  field: string
  value: string | string[] | number
}

interface DorRecommendation {
  checkId: string
  checkName: string
  message: string
  source: 'rules' | 'ai'
  suggestedFix?: DorFix
}

interface DorValidation {
  score: number
  isReady: boolean
  checklist: Array<{
    id: string
    name: string
    passed: boolean
    suggestion?: string
    suggestedFix?: DorFix
  }>
  recommendationsDetailed?: DorRecommendation[]
}

interface DorPreview {
  baseUpdatedAt: string
  changes: Array<{ field: string; previousValue: unknown; proposedValue: unknown }>
  conflicts: Array<{ field: string; message: string }>
  manualRecommendations: DorRecommendation[]
}

interface PortfolioDorModalProps {
  entity: { name: string; description: string }
  entityLabel: 'Épica' | 'Feature'
  validation: DorValidation | null
  preview: DorPreview | null
  selectedFixes: string[]
  onToggleFix: (checkId: string, checked: boolean) => void
  onPreview: () => void
  onConfirm: () => void
  onCancelPreview: () => void
  onRefresh: () => void
  onClose: () => void
  isRefreshing: boolean
  isPreviewing: boolean
  isApplying: boolean
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(' · ')
  if (value === null || value === undefined || value === '') return 'Sin definir'
  return String(value)
}

export default function PortfolioDorModal({
  entity,
  entityLabel,
  validation,
  preview,
  selectedFixes,
  onToggleFix,
  onPreview,
  onConfirm,
  onCancelPreview,
  onRefresh,
  onClose,
  isRefreshing,
  isPreviewing,
  isApplying,
}: PortfolioDorModalProps) {
  if (!validation) return null

  const failedChecks = validation.checklist.filter((item) => !item.passed)
  const manualRecommendations = (validation.recommendationsDetailed || []).filter((recommendation) => !recommendation.suggestedFix)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Validación DoR de {entityLabel}</h2>
            <p className="text-xs text-gray-500 mt-1">{entity.name}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefresh} disabled={isRefreshing} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Revalidar DoR">🔄</button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">✕</button>
          </div>
        </header>

        <div className="p-4 overflow-y-auto space-y-4">
          <div className={`p-3 rounded-lg text-center ${validation.isReady ? 'bg-green-50 dark:bg-green-900' : 'bg-yellow-50 dark:bg-yellow-900'}`}>
            <div className="text-2xl font-bold">{validation.score}%</div>
            <div className="text-xs font-medium">{validation.isReady ? '✓ Lista para continuar' : '✗ Necesita mejoras'}</div>
          </div>

          {failedChecks.length === 0 ? (
            <p className="text-xs text-green-600 text-center">✓ Todos los criterios pasaron</p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200">⚠️ Por mejorar ({failedChecks.length})</h3>
              {failedChecks.map((item) => (
                <div key={item.id} className="p-2 bg-red-50 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{item.name}</span>
                    {item.suggestedFix ? (
                      <label className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-300">
                        <input type="checkbox" checked={selectedFixes.includes(item.id)} onChange={(event) => onToggleFix(item.id, event.target.checked)} disabled={isPreviewing || isApplying} />
                        Aplicar
                      </label>
                    ) : <span className="text-xs text-gray-500">Revisión manual</span>}
                  </div>
                  {item.suggestion && <p className="text-xs text-red-600 dark:text-red-300 mt-1">💡 {item.suggestion}</p>}
                </div>
              ))}
            </div>
          )}

          {manualRecommendations.length > 0 && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-300">
              <p className="font-semibold mb-1">Recomendaciones manuales</p>
              {manualRecommendations.map((recommendation) => <p key={`${recommendation.checkId}:${recommendation.message}`}>• {recommendation.message}</p>)}
            </div>
          )}

          {preview && (
            <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-semibold text-blue-800 dark:text-blue-200">Previsualización</h3>
                <button onClick={onCancelPreview} className="text-xs text-gray-500">Cancelar</button>
              </div>
              {preview.conflicts.map((conflict) => <p key={conflict.field} className="text-xs text-red-700">⚠️ {conflict.message}</p>)}
              {preview.changes.length === 0 && !preview.conflicts.length && <p className="text-xs text-gray-600">No hay cambios diferentes al valor actual.</p>}
              {preview.changes.map((change) => (
                <div key={change.field} className="text-xs border-t border-blue-100 pt-2">
                  <p className="font-medium">{change.field}</p>
                  <p className="text-red-700">Antes: {displayValue(change.previousValue)}</p>
                  <p className="text-green-700">Después: {displayValue(change.proposedValue)}</p>
                </div>
              ))}
              <button onClick={onConfirm} disabled={Boolean(preview.conflicts.length || !preview.changes.length || isApplying)} className="w-full px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
                {isApplying ? '⏳ Aplicando...' : 'Confirmar cambios'}
              </button>
            </div>
          )}
        </div>

        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          {!preview && selectedFixes.length > 0 && <button onClick={onPreview} disabled={isPreviewing || isApplying} className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50">{isPreviewing ? '⏳ Preparando...' : `👁️ Previsualizar (${selectedFixes.length})`}</button>}
          <button onClick={onClose} className="btn-secondary text-sm">Cerrar</button>
        </footer>
      </div>
    </div>
  )
}