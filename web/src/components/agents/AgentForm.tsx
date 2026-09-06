/**
 * Componente AgentForm.
 * Formulario para crear o editar agentes IA.
 * Incluye campos para nombre, rol, descripción, capacidades y prompt de sistema.
 */

import { useState, useEffect } from 'react';
import { Agent } from '../../types';

interface AgentFormProps {
  agent?: Agent | null;
  onSubmit: (data: {
    name: string;
    role: string;
    description: string;
    capabilities: string[];
    systemPrompt: string;
  }) => void;
  onCancel: () => void;
}

/** Roles disponibles para los agentes */
const AGENT_ROLES = [
  { value: 'QA_ENGINEER', label: 'QA Engineer' },
  { value: 'SDET', label: 'SDET' },
  { value: 'TECH_LEAD', label: 'Tech Lead' },
  { value: 'BUG_REPORTER', label: 'Bug Reporter' },
  { value: 'TEST_GENERATOR', label: 'Test Generator' },
  { value: 'COVERAGE_ANALYST', label: 'Coverage Analyst' },
  { value: 'IMPROVEMENT_PLANNER', label: 'Improvement Planner' },
];

/** Capacidades sugeridas para autocompletado */
const SUGGESTED_CAPABILITIES = [
  'bug-report-generation',
  'test-case-creation',
  'coverage-analysis',
  'code-review',
  'evidence-collection',
  'improvement-planning',
  'regression-testing',
  'api-testing',
];

export default function AgentForm({ agent, onSubmit, onCancel }: AgentFormProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('QA_ENGINEER');
  const [description, setDescription] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [capabilityInput, setCapabilityInput] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  // Cargar datos del agente si se está editando
  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setDescription(agent.description);
      setCapabilities(agent.capabilities);
      setSystemPrompt(agent.systemPrompt || '');
    }
  }, [agent]);

  /** Agrega una capacidad a la lista */
  const addCapability = (cap: string) => {
    const trimmed = cap.trim();
    if (trimmed && !capabilities.includes(trimmed)) {
      setCapabilities([...capabilities, trimmed]);
    }
    setCapabilityInput('');
  };

  /** Elimina una capacidad de la lista */
  const removeCapability = (cap: string) => {
    setCapabilities(capabilities.filter((c) => c !== cap));
  };

  /** Maneja el envío del formulario */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, role, description, capabilities, systemPrompt });
  };

  /** Maneja Enter en el input de capacidades */
  const handleCapabilityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCapability(capabilityInput);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Nombre del Agente *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ej: Senior QA Bot"
          className="input-field"
        />
      </div>

      {/* Rol */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Rol *
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input-field"
        >
          {AGENT_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descripción *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          placeholder="Describe la función principal de este agente..."
          className="input-field"
        />
      </div>

      {/* Capacidades */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Capacidades
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={capabilityInput}
            onChange={(e) => setCapabilityInput(e.target.value)}
            onKeyDown={handleCapabilityKeyDown}
            placeholder="Agregar capacidad y presionar Enter"
            className="input-field flex-1"
          />
          <button
            type="button"
            onClick={() => addCapability(capabilityInput)}
            className="btn-secondary"
          >
            Agregar
          </button>
        </div>
        {capabilities.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded"
              >
                {cap}
                <button
                  type="button"
                  onClick={() => removeCapability(cap)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Sugerencias */}
        <div className="mt-2 flex flex-wrap gap-1">
          {SUGGESTED_CAPABILITIES.filter((c) => !capabilities.includes(c)).slice(0, 5).map((cap) => (
            <button
              key={cap}
              type="button"
              onClick={() => addCapability(cap)}
              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              + {cap}
            </button>
          ))}
        </div>
      </div>

      {/* System Prompt */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          System Prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={4}
          placeholder="Instrucciones base para el agente (prompt de sistema)..."
          className="input-field font-mono text-sm"
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button type="submit" className="btn-primary">
          {agent ? 'Guardar Cambios' : 'Crear Agente'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
}