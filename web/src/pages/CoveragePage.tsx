/**
 * Coverage Analysis Page.
 * Muestra análisis de cobertura de pruebas por proyecto con gráficos y recomendaciones.
 */

import { useState, useEffect } from 'react';
import { coverageApi, projectsApi } from '../services/api';
import { CoverageAnalysis, Project } from '../types';

export default function CoveragePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [coverage, setCoverage] = useState<CoverageAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchCoverage(selectedProjectId);
    }
  }, [selectedProjectId]);

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

  const fetchCoverage = async (projectId: string) => {
    try {
      const res = await coverageApi.getAll(projectId);
      if (res.coverage?.length > 0) {
        setCoverage(res.coverage[0]);
      } else {
        setCoverage(null);
      }
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar cobertura');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedProjectId) return;
    try {
      setAnalyzing(true);
      await coverageApi.analyze(selectedProjectId);
      await fetchCoverage(selectedProjectId);
    } catch (err: any) {
      setError(err?.error?.message || 'Error al analizar cobertura');
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Coverage Analysis</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-500 dark:text-gray-400">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cobertura de Pruebas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Análisis de cobertura por proyecto con áreas sin cobertura y recomendaciones
          </p>
        </div>
        <button onClick={handleAnalyze} disabled={analyzing || !selectedProjectId} className="btn-primary">
          {analyzing ? 'Analizando...' : 'Analizar Cobertura'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={fetchProjects} className="text-sm text-red-600 hover:text-red-800 mt-2">Reintentar</button>
        </div>
      )}

      {/* Selector de proyecto */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Proyecto</label>
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

      {coverage ? (
        <>
          {/* Métrica principal */}
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cobertura Total</h3>
                <p className={`text-4xl font-bold mt-2 ${
                  coverage.overallCoverage >= 80 ? 'text-green-600' :
                  coverage.overallCoverage >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {coverage.overallCoverage}%
                </p>
              </div>
              <div className="flex-1">
                <div className="w-24 h-24 rounded-full border-8 border-gray-200 dark:border-gray-700 flex items-center justify-center"
                  style={{
                    borderColor: coverage.overallCoverage >= 80 ? '#16a34a' :
                      coverage.overallCoverage >= 60 ? '#ca8a04' : '#dc2626',
                    borderTopColor: coverage.overallCoverage >= 80 ? '#16a34a' :
                      coverage.overallCoverage >= 60 ? '#ca8a04' : '#dc2626',
                  }}
                >
                  <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {coverage.overallCoverage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Áreas sin cobertura */}
          {coverage.uncoveredAreas.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Áreas sin Cobertura</h2>
              <div className="space-y-3">
                {coverage.uncoveredAreas.map((area, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{area.module}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        area.riskLevel === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        area.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>
                        {area.riskLevel}
                      </span>
                    </div>
                    {area.suggestedTests.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tests sugeridos:</p>
                        <div className="flex flex-wrap gap-1">
                          {area.suggestedTests.map((test, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                              {test}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recomendaciones */}
          {coverage.recommendations.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recomendaciones</h2>
              <ul className="space-y-2">
                {coverage.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No hay datos de cobertura para este proyecto. Ejecuta el análisis para obtener resultados.
          </p>
        </div>
      )}
    </div>
  );
}
