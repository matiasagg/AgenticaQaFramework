/**
 * Main Layout Component
 * 
 * Este componente proporciona el layout principal de la aplicación.
 * Protege las rutas verificando que el usuario esté autenticado.
 * Si no está autenticado, redirige al login.
 */
import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import ChatAI from '../chat/ChatAI'
import { useAuth } from '../../contexts/AuthContext'

export default function Layout() {
  const { isAuthenticated, isLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Sidebar overlay para móvil */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar />
        </div>
        <main className="flex-1 p-6">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      {/* Chat IA global disponible en todas las páginas */}
      <ChatAI />
    </div>
  )
}
