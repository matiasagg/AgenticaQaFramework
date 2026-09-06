/**
 * Dashboard Page con métricas reales.
 * Muestra resumen de bugs, tests, cobertura y actividad reciente.
 */

import { useState, useEffect } from 'react';
import { bugsApi, testsApi, agentsApi, projectsApi } from '../services/api';
import { Bug, TestCase, Agent, Project } from '../types';

/** Métrica individual del dashboard */
interface MetricCard {
  label: string;
  value: string | number;
  color: string;
  subtext?: string;
}

export default function Dashboard() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  /** Obtiene todos los datos necesarios para el dashboard */
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [bugsRes, testsRes, agentsRes, projectsRes] = await Promise.all([
        bugsApi.getAll(),
        testsApi.getAll(),
        agentsApi.getAll(),
        projectsApi.getAll(),
      ]);
      setBugs(bugsRes.bugs || []);
      setTests(testsRes.tests || []);
      setAgents(agentsRes.agents || []);
      setProjects(projectsRes.projects || []);
      setError(null);
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  /** Calcula métricas derivadas de los bugs */
  const getBugMetrics = () => {
    const open = bugs.filter((b) => b.status === 'OPEN').length;
    const inProgress = bugs.filter((b) => b.status === 'IN_PROGRESS').length;
    const resolved = bugs.filter((b) => b.status === 'RESOLVED').length;
    const critical = bugs.filter((b) => b.severity === 'CRITICAL' || b.severity === 'HIGH').length;
    return { open, inProgress, resolved, critical, total: bugs.length };
  };

  /** Calcula métricas derivadas de los tests */
  const getTestMetrics = () => {
    const active = tests.filter((t) => t.status === 'ACTIVE').length;
    const automated = tests.filter((t) => t.automationStatus === 'AUTOMATED').length;
    const highPriority = tests.filter((t) => t.priority === 'HIGH').length;
    return { active, automated, highPriority, total: tests.length };
  };

  const bugMetrics = getBugMetrics();
  const testMetrics = getTestMetrics();
  const activeAgents = agents.filter((a) => a.isActive).length;

  /** Tarjetas de métricas principales */
  const metricCards: MetricCard[] = [
    {
      label: 'Bugs Abiertos',
      value: bugMetrics.open,
      color: bugMetrics.critical > 0 ? 'text-red-600' : 'text-orange-600',
      subtext: `${bugMetrics.critical} críticos`,
    },
    {
      label: 'Tests Activos',
      value: testMetrics.active,
      color: 'text-green-600',
      subtext: `${testMetrics.automated} automatizados`,
    },
    {
      label: 'Proyectos',
      value: projects.length,
      color: 'text-blue-600',
      subtext: `${agents.length} agentes (${activeAgents} activos)`,
    },
    {
      label: 'Bugs Resueltos',
      value: bugMetrics.resolved,
      color: 'text-emerald-600',
      subtext: `${bugMetrics.inProgress} en progreso`,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-500 dark:text-gray-400">Cargando métricas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Resumen de actividad de QA en tiempo real
          </p>
        </div>
        <button onClick={fetchDashboardData} className="btn-secondary">
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={fetchDashboardData} className="text-sm text-red-600 hover:text-red-800 mt-2">
            Reintentar
          </button>
        </div>
      )}

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric) => (
          <div key={metric.label} className="card">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {metric.label}
            </h3>
            <p className={`text-3xl font-bold mt-2 ${metric.color}`}>{metric.value}</p>
            {metric.subtext && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{metric.subtext}</p>
            )}
          </div>
        ))}
      </div>

      {/* Distribución de bugs por severidad */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Bugs por Severidad
          </h2>
          {bugs.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No hay bugs reportados.</p>
          ) : (
            <div className="space-y-3">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((severity) => {
                const count = bugs.filter((b) => b.severity === severity).length;
                const percentage = bugs.length > 0 ? Math.round((count / bugs.length) * 100) : 0;
                const colors = {
                  CRITICAL: 'bg-red-500',
                  HIGH: 'bg-orange-500',
                  MEDIUM: 'bg-yellow-500',
                  LOW: 'bg-green-500',
                };
                return (
                  <div key={severity} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300 w-20">{severity}</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${colors[severity]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Distribución de tests por tipo */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Tests por Tipo
          </h2>
          {tests.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No hay casos de prueba.</p>
          ) : (
            <div className="space-y-3">
              {(['FUNCTIONAL', 'REGRESSION', 'E2E', 'INTEGRATION', 'EXPLORATORY'] as const).map(
                (type) => {
                  const count = tests.filter((t) => t.type === type).length;
                  const percentage = tests.length > 0 ? Math.round((count / tests.length) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300 w-24 truncate">
                        {type}
                      </span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-blue-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bugs recientes */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Bugs Recientes
        </h2>
        {bugs.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No hay bugs reportados.</p>
        ) : (
          <div className="space-y-2">
            {bugs.slice(0, 5).map((bug) => (
              <div
                key={bug.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {bug.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {bug.projectName || 'Sin proyecto'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      bug.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : bug.severity === 'HIGH'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : bug.severity === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}
                  >
                    {bug.severity}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      bug.status === 'OPEN'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : bug.status === 'RESOLVED'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                    }`}
                  >
                    {bug.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
