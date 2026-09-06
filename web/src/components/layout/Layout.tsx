/**
 * Main Layout Component
 * 
 * Este componente proporciona el layout principal de la aplicación.
 * Protege las rutas verificando que el usuario esté autenticado.
 * Si no está autenticado, redirige al login.
 */
import { Outlet, Navigate } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import ChatAI from '../chat/ChatAI'
import { useAuth } from '../../contexts/AuthContext'

export default function Layout() {
  const { isAuthenticated, isLoading } = useAuth()

  // Mostrar loading mientras se verifica la autenticación
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 ml-64">
          <Outlet />
        </main>
      </div>
      {/* Chat IA global disponible en todas las páginas */}
      <ChatAI />
    </div>
  )
}
