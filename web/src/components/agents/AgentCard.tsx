/**
 * Componente AgentCard.
 * Muestra la información de un agente IA en formato tarjeta.
 * Incluye nombre, rol, descripción, capacidades y estado activo/inactivo.
 */

import { Agent } from '../../types';

interface AgentCardProps {
  agent: Agent;
  onToggleActive: (id: string, isActive: boolean) => void;
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

/**
 * Mapea roles de agente a etiquetas legibles en español.
 */
const roleLabels: Record<string, string> = {
  QA_ENGINEER: 'QA Engineer',
  SDET: 'SDET',
  TECH_LEAD: 'Tech Lead',
  BUG_REPORTER: 'Bug Reporter',
  TEST_GENERATOR: 'Test Generator',
  COVERAGE_ANALYST: 'Coverage Analyst',
  IMPROVEMENT_PLANNER: 'Improvement Planner',
};

export default function AgentCard({ agent, onToggleActive, onEdit, onDelete }: AgentCardProps) {
  return (
    <div className="card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {agent.name}
            </h3>
            <span
              className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                agent.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {agent.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            {roleLabels[agent.role] || agent.role}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-2">
        {agent.description}
      </p>

      {agent.capabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {agent.capabilities.slice(0, 4).map((cap) => (
            <span
              key={cap}
              className="inline-flex px-2 py-0.5 text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 4 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              +{agent.capabilities.length - 4} más
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => onToggleActive(agent.id, !agent.isActive)}
          className={`text-xs px-3 py-1.5 rounded font-medium ${
            agent.isActive
              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300'
              : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300'
          }`}
        >
          {agent.isActive ? 'Desactivar' : 'Activar'}
        </button>
        <button
          onClick={() => onEdit(agent)}
          className="text-xs px-3 py-1.5 rounded font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(agent.id)}
          className="text-xs px-3 py-1.5 rounded font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}