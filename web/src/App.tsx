import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import AgentsPage from './pages/AgentsPage'
import ProjectsPage from './pages/ProjectsPage'
import BugsPage from './pages/BugsPage'
import TestsPage from './pages/TestsPage'
import CoveragePage from './pages/CoveragePage'
import PlansPage from './pages/PlansPage'
import UserStoriesPage from './pages/UserStoriesPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

/**
 * Main Application Component
 * 
 * This is the root component for the QA SaaS Platform frontend.
 * It sets up the routing structure and renders the main layout.
 */
function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected routes with layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="user-stories" element={<UserStoriesPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="bugs" element={<BugsPage />} />
        <Route path="tests" element={<TestsPage />} />
        <Route path="coverage" element={<CoveragePage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      
      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App