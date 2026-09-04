/**
 * Settings Page
 * 
 * Página de configuración donde el usuario puede:
 * - Configurar su token de OpenAI
 * - Ver el estado de la configuración
 */
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function SettingsPage() {
  const { openAiToken, setOpenAiToken, clearOpenAiToken, user } = useAuth()
  const [token, setToken] = useState(openAiToken || '')
  const [showToken, setShowToken] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (token.trim()) {
      setOpenAiToken(token.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const handleClear = () => {
    setToken('')
    clearOpenAiToken()
    setSaved(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configura tu token de OpenAI para habilitar las funciones de IA
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

      {/* OpenAI Token */}
      <div className="card dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          🤖 Configuración de OpenAI
        </h2>
        
        <div className="space-y-4">
          {/* Status indicator */}
          <div className={`p-3 rounded-lg ${openAiToken ? 'bg-green-50 dark:bg-green-900' : 'bg-yellow-50 dark:bg-yellow-900'}`}>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${openAiToken ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className={openAiToken ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}>
                {openAiToken ? 'Token configurado correctamente' : 'Token no configurado'}
              </span>
            </div>
          </div>

          {/* Token input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              API Key de OpenAI
            </label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="input-field pr-10"
                  placeholder="sk-..."
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
              Tu token se almacena localmente en tu navegador y nunca se envía a nuestros servidores.
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              disabled={!token.trim()}
              className="btn-primary"
            >
              Guardar Token
            </button>
            {openAiToken && (
              <button
                onClick={handleClear}
                className="btn-secondary text-red-600 border-red-300 hover:bg-red-50"
              >
                Eliminar Token
              </button>
            )}
          </div>

          {/* Saved confirmation */}
          {saved && (
            <div className="p-3 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
              ✓ Token guardado correctamente
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card dark:bg-gray-800">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          ¿Cómo obtener tu API Key de OpenAI?
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>Ve a <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">platform.openai.com/api-keys</a></li>
          <li>Inicia sesión en tu cuenta de OpenAI</li>
          <li>Haz clic en "Create new secret key"</li>
          <li>Copia el token y pégalo aquí</li>
        </ol>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Nota:</strong> Cada usuario debe configurar su propio token. El token se usa para generar pruebas con IA y otras funciones inteligentes.
          </p>
        </div>
      </div>
    </div>
  )
}