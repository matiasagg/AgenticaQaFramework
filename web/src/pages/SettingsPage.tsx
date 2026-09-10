/**
 * Settings Page
 *
 * Página de configuración donde el usuario puede:
 * - Ver su información de perfil
 * - Configurar su API key de Gemini (BYO key), que se guarda encriptada
 *   en el backend y se usa para el análisis DoR con IA (independiente
 *   de la key global del servidor).
 */
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { geminiKeyApi } from '../services/api'

export default function SettingsPage() {
  const { user } = useAuth()
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Al montar, consultar si el usuario ya tiene key configurada
  useEffect(() => {
    geminiKeyApi
      .getStatus()
      .then((r) => setConfigured(r.configured))
      .catch(() => setConfigured(false))
  }, [])

  const handleSave = async () => {
    if (!token.trim()) return
    setError(null)
    try {
      await geminiKeyApi.save(token.trim())
      setConfigured(true)
      setSaved(true)
      setToken('')
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo guardar la key. Intenta de nuevo.')
    }
  }

  const handleClear = async () => {
    setError(null)
    try {
      await geminiKeyApi.remove()
      setConfigured(false)
      setToken('')
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo eliminar la key.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configura tu API key de Gemini para habilitar el análisis DoR con IA
        </p>
      </div>

      {/* Usuario info */}
      <div className="card dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Información del Usuario
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Nombre:</span>
            <span className="text-gray-900 dark:text-white">{user?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Email:</span>
            <span className="text-gray-900 dark:text-white">{user?.email || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Rol:</span>
            <span className="text-gray-900 dark:text-white">{user?.role || '-'}</span>
          </div>
        </div>
      </div>

      {/* Gemini API Key (BYO) */}
      <div className="card dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          🤖 API Key de Gemini (análisis con IA)
        </h2>

        <div className="space-y-4">
          {/* Indicador de estado */}
          <div className={`p-3 rounded-lg ${configured ? 'bg-green-50 dark:bg-green-900' : 'bg-yellow-50 dark:bg-yellow-900'}`}>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${configured ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className={configured ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}>
                {configured
                  ? 'Key configurada: el análisis DoR usará TU key de Gemini'
                  : 'Key no configurada: el análisis DoR no tendrá IA (o usará la key global del servidor, si existe)'}
              </span>
            </div>
          </div>

          {/* Input de la key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key de Gemini
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input-field pr-10"
                  placeholder="AIza... o tu token de Google AI Studio"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showToken ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Tu key se envía una sola vez y se almacena <strong>encriptada (AES-256-GCM)</strong> en
              el servidor. Nunca se vuelve a mostrar. Úsala para todas las funciones de IA.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={!token.trim()}
              className="btn-primary"
            >
              Guardar Key
            </button>
            {configured && (
              <button
                onClick={handleClear}
                className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
              >
                Eliminar Key
              </button>
            )}
          </div>

          {/* Confirmación / error */}
          {saved && (
            <div className="p-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
              ✓ Key guardada correctamente. Ve a una HDU y pulsa "Refrescar análisis" para validar con IA.
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Instrucciones */}
      <div className="card dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          ¿Cómo obtener tu API Key de Gemini?
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>Ve a <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">aistudio.google.com/apikey</a></li>
          <li>Inicia sesión con tu cuenta de Google</li>
          <li>Haz clic en "Create API key" (formato <code>AIza...</code>)</li>
          <li>Copia la key y pégala aquí</li>
        </ol>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Nota:</strong> Cada usuario usa su propia key para el análisis DoR con IA.
            El modelo utilizado es <code>gemini-3.6-flash</code> (verificado disponible).
          </p>
        </div>
      </div>
    </div>
  )
}