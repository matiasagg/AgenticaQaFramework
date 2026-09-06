import axios, { AxiosInstance, AxiosError } from 'axios'
import { AuthResponse, ApiError } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    // Only redirect to login if the error is NOT from auth endpoints
    const url = error.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register')
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      // Token expired or invalid - only redirect for protected endpoints
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error.response?.data || error)
  }
)

// Auth services
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password })
    return response.data
  },

  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', { email, password, name })
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
    localStorage.removeItem('token')
  },

  getProfile: async () => {
    const response = await api.get('/users/me')
    return response.data
  },
}

// Bugs services
export const bugsApi = {
  getAll: async (params?: {
    severity?: string
    status?: string
    search?: string
    projectId?: string
    page?: number
    limit?: number
  }) => {
    const response = await api.get('/bugs', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/bugs/${id}`)
    return response.data
  },

  create: async (data: {
    title: string
    description: string
    severity: string
    stepsToReproduce: string[]
    expectedResult: string
    actualResult: string
    environment?: string
    projectId: string
  }) => {
    const response = await api.post('/bugs', data)
    return response.data
  },

  update: async (id: string, data: Partial<{
    title: string
    description: string
    severity: string
    status: string
    stepsToReproduce: string[]
    expectedResult: string
    actualResult: string
    environment: string
    assignee: string
  }>) => {
    const response = await api.put(`/bugs/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/bugs/${id}`)
    return response.data
  },
}

// Projects services
export const projectsApi = {
  getAll: async () => {
    const response = await api.get('/projects')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/projects/${id}`)
    return response.data
  },

  create: async (data: { name: string; description: string; repository?: string; website?: string }) => {
    const response = await api.post('/projects', data)
    return response.data
  },
}

// Agents services
export const agentsApi = {
  getAll: async () => {
    const response = await api.get('/agents')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/agents/${id}`)
    return response.data
  },

  create: async (data: {
    name: string
    role: string
    description: string
    capabilities: string[]
    systemPrompt: string
  }) => {
    const response = await api.post('/agents', data)
    return response.data
  },

  toggleActive: async (id: string, isActive: boolean) => {
    const response = await api.put(`/agents/${id}`, { isActive })
    return response.data
  },

  update: async (id: string, data: {
    name: string
    role: string
    description: string
    capabilities: string[]
    systemPrompt: string
  }) => {
    const response = await api.put(`/agents/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/agents/${id}`)
    return response.data
  },
}

// Tests services
export const testsApi = {
  getAll: async (params?: { type?: string; priority?: string; status?: string; projectId?: string }) => {
    const response = await api.get('/tests', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/tests/${id}`)
    return response.data
  },

  create: async (data: {
    title: string
    description: string
    preconditions: string[]
    steps: { order: number; action: string; expectedResult: string }[]
    expectedResults: string[]
    priority: string
    type: string
    projectId: string
  }) => {
    const response = await api.post('/tests', data)
    return response.data
  },

  update: async (id: string, data: Partial<{
    title: string
    description: string
    preconditions: string[]
    steps: { order: number; action: string; expectedResult: string }[]
    expectedResults: string[]
    priority: string
    type: string
    status: string
    automationStatus: string
  }>) => {
    const response = await api.put(`/tests/${id}`, data)
    return response.data
  },

  delete: async (id: string) => {
    const response = await api.delete(`/tests/${id}`)
    return response.data
  },
}

// Coverage services
export const coverageApi = {
  getAll: async (projectId?: string) => {
    const response = await api.get('/coverage', { params: { projectId } })
    return response.data
  },

  analyze: async (projectId: string) => {
    const response = await api.post('/coverage', { projectId })
    return response.data
  },
}

// Plans services
export const plansApi = {
  getAll: async () => {
    const response = await api.get('/plans')
    return response.data
  },

  getById: async (id: string) => {
    const response = await api.get(`/plans/${id}`)
    return response.data
  },

  generate: async () => {
    const response = await api.post('/plans/generate')
    return response.data
  },
}

export default api