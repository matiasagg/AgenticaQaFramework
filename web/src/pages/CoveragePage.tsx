/**
 * Coverage Dashboard Page.
 * 
 * Muestra la cobertura real de pruebas estáticas y dinámicas del proyecto.
 * Incluye 5 tipos de cobertura:
 * - Cobertura de requerimientos: HDUs con al menos un caso de prueba
 * - Cobertura de diseño: casos de prueba diseñados respecto de las HDUs
 * - Cobertura de ejecución: casos ejecutados respecto de los diseñados
 * - Cobertura de resultados: pruebas exitosas respecto de las ejecutadas
 * - Cobertura de automatización: pruebas automatizadas respecto del total
 * 
 * Además muestra desglose por épica/feature, HDUs sin cobertura,
 * tendencia histórica, riesgos y recomendaciones.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coverageApi, projectsApi } from '../services/api';
import { Project } from '../types';

/** Métrica de cobertura individual */
interface CoverageMetric {
  label: string;
  value: number;
  description: string;
  color: string;
  icon: string;
}

/** Datos del desglose por épica */
interface EpicBreakdown {
  id: string;
  name: string;
  status: string;
  totalHDUs: number;
  hduWithTests: number;
  coverage: number;
}

/** Datos del desglose por feature */
interface FeatureBreakdown {
  id: string;
  name: string;
  epicName: string;
  status: string;
  totalHDUs: number;
  hduWithTests: number;
  coverage: number;
}

/** HDU sin casos de prueba */
interface HduWithoutTests {
  id: string;
  displayId: string | null;
  title: string;
  status: string;
  epicName: string;
  featureName: string;
}

/** Punto de datos de tendencia */
interface TrendPoint {
  date: string;
  coverage: number;
}

/** Métricas completas de cobertura */
interface CoverageMetrics {
  projectId: string;
  projectName: string;
  summary: {
    requirementCoverage: number;
    designCoverage: number;
    executionCoverage: number;
    resultCoverage: number;
    automationCoverage: number;
  };
  counts: {
    totalHDUs: number;
    hduWithTests: number;
    hduWithoutTests: number;
    totalTestCases: number;
    automatedTests: number;
    totalSuites: number;
    executedSuites: number;
    passedSuites: number;
    nonExecutedCases: number;
    failedCases: number;
    blockedCases: number;
  };
  caseStatusBreakdown: {
    nonExecuted: number;
    failed: number;
    blocked: number;
    passed: number;
  };
  hduWithoutTests: HduWithoutTests[];
  epicBreakdown: EpicBreakdown[];
  featureBreakdown: FeatureBreakdown[];
  recommendations: string[];
  risks: string[];
  generatedAt: string;
}

export default function CoveragePage() {
  // Habilita la navegación entre páginas (ej: desde una métrica ir a la lista de HDUs)
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [metrics, setMetrics] = useState<CoverageMetrics | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown' | 'trend'>('overview');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchMetrics(selectedProjectId);
      fetchTrend(selectedProjectId);
    }
  }, [selectedProjectId]);

  /** Carga la lista de proyectos del usuario */
  const fetchProjects = async () => {
    try {
      const res = await projectsApi.getAll();
      setProjects(res.projects || []);
      if (res.projects?.length > 0) {
        setSelectedProjectId(res.projects[0].id);
      }
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  };

  /** Obtiene las métricas de cobertura en tiempo real */
  const fetchMetrics = async (projectId: string) => {
    try {
      setRefreshing(true);
      const data = await coverageApi.getMetrics(projectId);
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar métricas de cobertura');
    } finally {
      setRefreshing(false);
    }
  };

  /** Obtiene la tendencia histórica de cobertura */
  const fetchTrend = async (projectId: string) => {
    try {
      const data = await coverageApi.getTrend(projectId);
      setTrend(data.trend || []);
    } catch {
      // La tendencia es opcional, no mostrar error si falla
      setTrend([]);
    }
  };

  /** Recarga todas las métricas */
  const handleRefresh = async () => {
    if (!selectedProjectId) return;
    await fetchMetrics(selectedProjectId);
    await fetchTrend(selectedProjectId);
  };

  /** Navega a la lista de HDUs del proyecto, opcionalmente filtrada */
  const goToUserStories = () => {
    if (!selectedProjectId) return;
    navigate(`/user-stories?projectId=${selectedProjectId}`);
  };

  /** Navega a la lista de épicas del proyecto */
  const goToEpics = () => {
    navigate('/epics');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cobertura de Pruebas</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-500 dark:text-gray-400">Cargando métricas...</span>
        </div>
      </div>
    );
  }

  /** Determina el color basado en el porcentaje de cobertura */
  const getCoverageColor = (value: number): string => {
    if (value >= 80) return 'text-green-600';
    if (value >= 60) return 'text-yellow-600';
    if (value >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  /** Determina el color de fondo de la barra de progreso */
  const getBarColor = (value: number): string => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-yellow-500';
    if (value >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  /** Construye las tarjetas de métricas principales */
  const getMetricCards = (): CoverageMetric[] => {
    if (!metrics) return [];
    const { summary, counts } = metrics;
    return [
      {
        label: 'Requerimientos',
        value: summary.requirementCoverage,
        description: `${counts.hduWithTests} de ${counts.totalHDUs} HDUs con casos de prueba`,
        color: getCoverageColor(summary.requirementCoverage),
        icon: '📋',
      },
      {
        label: 'Diseño',
        value: summary.designCoverage,
        description: `${counts.totalTestCases} casos diseñados para ${counts.totalHDUs} HDUs`,
        color: getCoverageColor(summary.designCoverage),
        icon: '✏️',
      },
      {
        label: 'Ejecución',
        value: summary.executionCoverage,
        description: `${counts.executedSuites} de ${counts.totalSuites} suites ejecutadas`,
        color: getCoverageColor(summary.executionCoverage),
        icon: '▶️',
      },
      {
        label: 'Resultados',
        value: summary.resultCoverage,
        description: `${counts.passedSuites} de ${counts.executedSuites} suites aprobadas`,
        color: getCoverageColor(summary.resultCoverage),
        icon: '✅',
      },
      {
        label: 'Automatización',
        value: summary.automationCoverage,
        description: `${counts.automatedTests} de ${counts.totalTestCases} casos automatizados`,
        color: getCoverageColor(summary.automationCoverage),
        icon: '🤖',
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cobertura de Pruebas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Cobertura real de pruebas estáticas y dinámicas • Métricas funcionales (no confundir con cobertura de código)
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || !selectedProjectId}
          className="btn-primary"
        >
          {refreshing ? 'Actualizando...' : 'Actualizar Métricas'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={handleRefresh} className="text-sm text-red-600 hover:text-red-800 mt-2">
            Reintentar
          </button>
        </div>
      )}

      {/* Selector de proyecto */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Proyecto
        </label>
        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="input-field max-w-md"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {metrics ? (
        <>
          {/* Pestañas de navegación */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {(['overview', 'breakdown', 'trend'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 border border-b-0 border-gray-200 dark:border-gray-700'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab === 'overview' && '📊 Resumen'}
                {tab === 'breakdown' && '📂 Desglose'}
                {tab === 'trend' && '📈 Tendencia'}
              </button>
            ))}
          </div>

          {/* ── Tab: Resumen ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Tarjetas de métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {getMetricCards().map((metric) => (
                  <div key={metric.label} className="card text-center">
                    <span className="text-2xl">{metric.icon}</span>
                    <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-2">
                      {metric.label}
                    </h3>
                    <p className={`text-3xl font-bold mt-1 ${metric.color}`}>
                      {metric.value}%
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {metric.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Barras de progreso */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Comparativa de Cobertura
                </h2>
                <div className="space-y-4">
                  {getMetricCards().map((metric) => (
                    <div key={metric.label} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 dark:text-gray-300 w-28">
                        {metric.label}
                      </span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full transition-all duration-500 ${getBarColor(metric.value)}`}
                          style={{ width: `${metric.value}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-bold w-14 text-right ${metric.color}`}>
                        {metric.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose por estado de casos de prueba */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  🧪 Estado de Casos de Prueba
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                      {metrics.counts.totalTestCases - metrics.counts.nonExecutedCases - metrics.counts.failedCases - metrics.counts.blockedCases}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">✅ Aprobados</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {metrics.counts.nonExecutedCases}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">⏳ No ejecutados</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {metrics.counts.failedCases}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">❌ Fallidos</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-500 dark:text-gray-400">
                      {metrics.counts.blockedCases}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">⛔ Bloqueados</p>
                  </div>
                </div>
              </div>

              {/* Riesgos y Recomendaciones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Riesgos */}
                {metrics.risks.length > 0 && (
                  <div className="card border-l-4 border-red-500">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                      ⚠️ Riesgos Identificados
                    </h2>
                    <ul className="space-y-2">
                      {metrics.risks.map((risk, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
                          <span className="mt-0.5">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recomendaciones */}
                <div className="card border-l-4 border-blue-500">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    💡 Recomendaciones
                  </h2>
                  <ul className="space-y-2">
                    {metrics.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-blue-700 dark:text-blue-300">
                        <span className="mt-0.5">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* HDUs sin cobertura */}
              {metrics.hduWithoutTests.length > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      🚫 HDUs sin Casos de Prueba ({metrics.hduWithoutTests.length})
                    </h2>
                    <button
                      onClick={goToUserStories}
                      className="text-sm text-primary-600 hover:text-primary-800 dark:text-primary-400"
                    >
                      Ver todas las HDUs →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">ID</th>
                          <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Título</th>
                          <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Épica</th>
                          <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Feature</th>
                          <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.hduWithoutTests.map((hdu) => (
                          <tr key={hdu.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-2 px-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                              {hdu.displayId || hdu.id.slice(0, 8)}
                            </td>
                            <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{hdu.title}</td>
                            <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{hdu.epicName}</td>
                            <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{hdu.featureName}</td>
                            <td className="py-2 px-3">
                              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                {hdu.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Desglose ── */}
          {activeTab === 'breakdown' && (
            <div className="space-y-6">
              {/* Desglose por épica */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  📂 Desglose por Épica
                </h2>
                {metrics.epicBreakdown.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No hay épicas registradas en este proyecto.</p>
                ) : (
                  <div className="space-y-4">
                    {metrics.epicBreakdown.map((epic) => (
                      <div
                        key={epic.id}
                        onClick={goToEpics}
                        title="Ver detalle de épicas"
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {epic.name}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({epic.totalHDUs} HDUs, {epic.hduWithTests} con cobertura)
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${getCoverageColor(epic.coverage)}`}>
                            {epic.coverage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${getBarColor(epic.coverage)}`}
                            style={{ width: `${epic.coverage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desglose por feature */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  📁 Desglose por Feature
                </h2>
                {metrics.featureBreakdown.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">No hay features registradas en este proyecto.</p>
                ) : (
                  <div className="space-y-3">
                    {metrics.featureBreakdown.map((feature) => (
                      <div key={feature.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm text-gray-900 dark:text-gray-100">
                              {feature.name}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {feature.epicName}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${getCoverageColor(feature.coverage)}`}>
                            {feature.coverage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${getBarColor(feature.coverage)}`}
                            style={{ width: `${feature.coverage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {feature.hduWithTests} de {feature.totalHDUs} HDUs con cobertura
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Tendencia ── */}
          {activeTab === 'trend' && (
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  📈 Tendencia Histórica de Cobertura
                </h2>
                {trend.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      No hay datos históricos suficientes para mostrar tendencia.
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      La tendencia se construye automáticamente conforme se registren análisis de cobertura.
                    </p>
                  </div>
                ) : trend.length === 1 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      Punto actual de cobertura: <span className="font-bold text-primary-600">{trend[0].coverage}%</span>
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Fecha: {trend[0].date}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Gráfico de tendencia simplificado con barras */}
                    <div className="flex items-end gap-2 h-48 px-4">
                      {trend.map((point, idx) => {
                        const maxCoverage = Math.max(...trend.map((p) => p.coverage), 100);
                        const height = (point.coverage / maxCoverage) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {point.coverage}%
                            </span>
                            <div
                              className="w-full bg-primary-500 rounded-t transition-all duration-300 hover:bg-primary-600"
                              style={{ height: `${height}%` }}
                              title={`${point.date}: ${point.coverage}%`}
                            ></div>
                            <span className="text-xs text-gray-400 dark:text-gray-500 rotate-[-45deg] origin-top-left whitespace-nowrap">
                              {point.date.slice(5)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Tabla de datos */}
                    <div className="mt-6 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Fecha</th>
                            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Cobertura</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trend.map((point, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{point.date}</td>
                              <td className="py-2 px-3">
                                <span className={`font-bold ${getCoverageColor(point.coverage)}`}>
                                  {point.coverage}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nota al pie */}
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
            Métricas de cobertura funcional • No confundir con cobertura de código (líneas/branches) •
            Actualizado: {new Date(metrics.generatedAt).toLocaleString('es-CL')}
          </p>
        </>
      ) : (
        !error && (
          <div className="card text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              Seleccione un proyecto para ver las métricas de cobertura.
            </p>
          </div>
        )
      )}
    </div>
  );
}