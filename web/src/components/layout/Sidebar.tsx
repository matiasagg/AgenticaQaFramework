import { NavLink } from 'react-router-dom'

const navSections = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    title: 'Product',
    items: [
      { to: '/projects', label: 'Projects', icon: '📁' },
      { to: '/epics', label: 'Epics', icon: '🔥' },
      { to: '/features', label: 'Features', icon: '✨' },
      { to: '/user-stories', label: 'User Stories (HDU)', icon: '📝' },
      { to: '/plans', label: 'Improvement Plans', icon: '🎯' },
    ],
  },
  {
    title: 'Quality',
    items: [
      { to: '/agents', label: 'AI Agents', icon: '🤖' },
      { to: '/bugs', label: 'Bug Reports', icon: '🐛' },
      { to: '/test-plans', label: 'Test Plans', icon: '📋' },
      { to: '/test-suites', label: 'Test Suites', icon: '🧪' },
      { to: '/tests', label: 'Test Cases', icon: '✅' },
      { to: '/coverage', label: 'Coverage', icon: '📈' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/github-sync', label: 'GitHub Sync', icon: '🔗' },
      { to: '/settings', label: 'Configuración', icon: '⚙️' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="relative w-72 bg-white border-r border-gray-200 overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
      <nav className="p-4">
        <div className="space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                {section.title}
              </p>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-primary-50 text-primary-700 font-medium dark:bg-primary-900 dark:text-primary-300'
                            : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`
                      }
                    >
                      <span className="text-lg leading-none">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}