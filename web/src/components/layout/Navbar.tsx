/**
 * Top Navigation Bar Component
 * 
 * Barra de navegación superior con:
 * - Logo y branding
 * - Información del usuario
 * - Botón de configuración OpenAI
 * - Botón de logout
 * - Toggle de tema oscuro
 */
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const { user, openAiToken, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 fixed w-full top-0 z-50 dark:bg-gray-800 dark:border-gray-700">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="text-xl font-bold text-primary-600">
            QA SaaS Platform
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Indicador de token OpenAI */}
          <Link
            to="/settings"
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
              openAiToken
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
            }`}
            title={openAiToken ? 'OpenAI configurado' : 'Configurar OpenAI'}
          >
            <span>🤖</span>
            <span>{openAiToken ? 'IA ✓' : 'IA'}</span>
          </Link>

          {/* Toggle tema */}
          <button 
            onClick={toggleTheme}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
            aria-label="Toggle dark mode"
          >
            <span className="sr-only">Toggle dark mode</span>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          {/* Notificaciones */}
          <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300">
            <span className="sr-only">Notifications</span>
            🔔
          </button>
          
          {/* Usuario y logout */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {user?.name || 'Usuario'}
              </span>
            </div>
            
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg dark:text-red-400 dark:hover:bg-red-900"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}