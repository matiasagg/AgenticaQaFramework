/**
 * Página de gestión de Agentes IA.
 * Permite crear, editar, activar/desactivar y eliminar agentes.
 * Los agentes se pueden asignar a proyectos, bugs y tests.
 */

import { useState, useEffect } from 'react';
import { Agent } from '../types';
import { agentsApi } from '../services/api';
import AgentCard from '../components/agents/AgentCard';
import AgentForm from '../components/agents/AgentForm';

/** Estados de la vista de agentes */
type ViewMode = 'list' | 'create' | 'edit';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Cargar agentes al montar el componente
  useEffect(() => {
    fetchAgents();
  }, []);

  /** Obtiene todos los agentes desde la API */
  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await agentsApi.getAll();
      setAgents(response.agents || []);
      setError(null);
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cargar los agentes');
    } finally {
      setLoading(false);
    }
  };

  /** Crea un nuevo agente */
  const handleCreate = async (data: {
    name: string;
    role: string;
    description: string;
    capabilities: string[];
    systemPrompt: string;
  }) => {
    try {
      await agentsApi.create(data);
      setViewMode('list');
      await fetchAgents();
    } catch (err: any) {
      setError(err?.error?.message || 'Error al crear el agente');
    }
  };

  /** Actualiza un agente existente */
  const handleUpdate = async (data: {
    name: string;
    role: string;
    description: string;
    capabilities: string[];
    systemPrompt: string;
  }) => {
    if (!editingAgent) return;
    try {
      await agentsApi.update(editingAgent.id, data);
      setViewMode('list');
      setEditingAgent(null);
      await fetchAgents();
    } catch (err: any) {
      setError(err?.error?.message || 'Error al actualizar el agente');
    }
  };

  /** Alterna el estado activo/inactivo de un agente */
  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await agentsApi.toggleActive(id, isActive);
      setAgents(agents.map((a) => (a.id === id ? { ...a, isActive } : a)));
    } catch (err: any) {
      setError(err?.error?.message || 'Error al cambiar estado del agente');
    }
  };

  /** Elimina un agente */
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este agente?')) return;
    try {
      await agentsApi.delete(id);
      setAgents(agents.filter((a) => a.id !== id));
    } catch (err: any) {
      setError(err?.error?.message || 'Error al eliminar el agente');
    }
  };

  /** Abre el formulario de edición */
  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setViewMode('edit');
  };

  // Vista de formulario (crear/editar)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setViewMode('list');
              setEditingAgent(null);
            }}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {viewMode === 'create' ? 'Nuevo Agente IA' : 'Editar Agente'}
          </h1>
        </div>
        <div className="card max-w-2xl">
          <AgentForm
            agent={editingAgent}
            onSubmit={viewMode === 'create' ? handleCreate : handleUpdate}
            onCancel={() => {
              setViewMode('list');
              setEditingAgent(null);
            }}
          />
        </div>
      </div>
    );
  }

  // Vista de lista
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Agentes IA
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona agentes inteligentes para automatizar tareas de QA
          </p>
        </div>
        <button onClick={() => setViewMode('create')} className="btn-primary">
          + Nuevo Agente
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={fetchAgents} className="text-sm text-red-600 hover:text-red-800 mt-2">
            Reintentar
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-500 dark:text-gray-400">Cargando agentes...</span>
        </div>
      ) : agents.length === 0 ? (
        /* Empty state */
        <div className="card text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No tienes agentes creados aún. Crea tu primer agente IA para comenzar.
          </p>
          <button onClick={() => setViewMode('create')} className="btn-primary">
            Crear Primer Agente
          </button>
        </div>
      ) : (
        /* Grid de agentes */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onToggleActive={handleToggleActive}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && agents.length > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {agents.length} agente{agents.length !== 1 ? 's' : ''} en total
          ({agents.filter((a) => a.isActive).length} activo{agents.filter((a) => a.isActive).length !== 1 ? 's' : ''})
        </p>
      )}
    </div>
  );
}