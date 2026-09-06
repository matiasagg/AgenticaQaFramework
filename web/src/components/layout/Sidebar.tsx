import { NavLink } from 'react-router-dom'

/**
 * Sidebar Navigation Component
 * 
 * Displays the main navigation menu with links to:
 * - Dashboard
 * - AI Agents
 * - Projects
 * - Bug Reports
 * - Test Cases
 * - Coverage Analysis
 * - Improvement Plans
 */
export default function Sidebar() {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/user-stories', label: 'User Stories (HDU)', icon: '📝' },
    { to: '/agents', label: 'AI Agents', icon: '🤖' },
    { to: '/projects', label: 'Projects', icon: '📁' },
    { to: '/bugs', label: 'Bug Reports', icon: '🐛' },
    { to: '/tests', label: 'Test Cases', icon: '✅' },
    { to: '/coverage', label: 'Coverage', icon: '📈' },
    { to: '/plans', label: 'Improvement Plans', icon: '🎯' },
    { to: '/settings', label: 'Configuración', icon: '⚙️' },
  ]

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium dark:bg-primary-900 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  }`
                }
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
