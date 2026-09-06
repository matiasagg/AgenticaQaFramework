/**
 * Improvement Plans Page.
 * Muestra planes de mejora personalizados con habilidades, acciones y recursos.
 */

import { useState, useEffect } from 'react';
import { plansApi } from '../services/api';
import { ImprovementPlan } from '../types';

export default function PlansPage() {
  const [plan, setPlan] = useState<ImprovementPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlan();
  }, []);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const res = await plansApi.getAll();
      if (res.plans?.length > 0) {
        setPlan(res.plans[0]);
      }
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar planes');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await plansApi.generate();
      await fetchPlan();
    } catch (err: any) {
      setError(err?.error?.message || 'Error al generar plan');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Planes de Mejora</h1>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Planes de Mejora</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Plan personalizado para mejorar tus habilidades de QA
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generating} className="btn-primary">
          {generating ? 'Generando...' : 'Generar Plan'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={fetchPlan} className="text-sm text-red-600 hover:text-red-800 mt-2">Reintentar</button>
        </div>
      )}

      {plan ? (
        <>
          {/* Barra de progreso */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Progreso General</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div className="h-4 rounded-full bg-primary-600" style={{ width: `${plan.progress}%` }}></div>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{plan.progress}%</span>
            </div>
          </div>

          {/* Habilidades */}
          {plan.currentSkills.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Habilidades</h2>
              <div className="space-y-3">
                {plan.currentSkills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-32">{skill.skill}</span>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div className="h-3 rounded-full bg-blue-500" style={{ width: `${(skill.level / 5) * 100}%` }}></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-16">{skill.level}/5 → {skill.targetLevel}/5</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones recomendadas */}
          {plan.actions.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Acciones Recomendadas</h2>
              <div className="space-y-3">
                {plan.actions.map((action, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.description}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        action.priority === 'HIGH' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        action.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      }`}>{action.priority}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Tipo: {action.type}</span>
                      <span>~{action.estimatedHours}h estimadas</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recursos */}
          {plan.resources.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recursos Sugeridos</h2>
              <div className="space-y-2">
                {plan.resources.map((resource, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">{resource.type}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{resource.title}</p>
                      {resource.duration && <p className="text-xs text-gray-500 dark:text-gray-400">{resource.duration}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {plan.timeline && (
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Timeline Estimado</h3>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-1">{plan.timeline}</p>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            No tienes un plan de mejora generado. Haz clic en "Generar Plan" para crear uno personalizado.
          </p>
        </div>
      )}
    </div>
  );
}
