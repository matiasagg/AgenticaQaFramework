/**
 * Authentication Context
 * 
 * Maneja el estado de autenticación del usuario:
 * - Login/Register/Logout
 * - Almacenamiento del token JWT
 * - Estado de autenticación
 * - Configuración del token OpenAI
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../services/api'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  openAiToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  setOpenAiToken: (token: string) => void
  clearOpenAiToken: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [openAiToken, setOpenAiTokenState] = useState<string | null>(localStorage.getItem('openai_token'))
  const [isLoading, setIsLoading] = useState(true)

  // Verificar token al cargar la aplicación
  useEffect(() => {
    const verifyToken = async () => {
      if (token) {
        try {
          const response = await authApi.getProfile()
          setUser(response.user)
        } catch (error) {
          // Token inválido, expirado o la sesión ya no existe en BD
          localStorage.removeItem('token')
          setToken(null)
          setUser(null)
        }
      }
      setIsLoading(false)
    }
    verifyToken()
  }, [token])

  const login = async (email: string, password: string) => {
    const response = await authApi.login(email, password)
    localStorage.setItem('token', response.token)
    setToken(response.token)
    setUser(response.user)
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await authApi.register(email, password, name)
    localStorage.setItem('token', response.token)
    setToken(response.token)
    setUser(response.user)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const setOpenAiToken = (newToken: string) => {
    localStorage.setItem('openai_token', newToken)
    setOpenAiTokenState(newToken)
  }

  const clearOpenAiToken = () => {
    localStorage.removeItem('openai_token')
    setOpenAiTokenState(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        openAiToken,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        setOpenAiToken,
        clearOpenAiToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

