/**
 * Dashboard Page
 * 
 * Main dashboard showing overview of QA activities,
 * recent bugs, test coverage, and AI agent status.
 */
export default function Dashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Active Bugs</h3>
          <p className="text-3xl font-bold text-qa-error mt-2">12</p>
        </div>
        
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Test Cases</h3>
          <p className="text-3xl font-bold text-qa-success mt-2">48</p>
        </div>
        
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Coverage</h3>
          <p className="text-3xl font-bold text-qa-info mt-2">87%</p>
        </div>
        
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">AI Agents</h3>
          <p className="text-3xl font-bold text-primary-600 mt-2">5</p>
        </div>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-gray-500">No recent activity to display.</p>
      </div>
    </div>
  )
}