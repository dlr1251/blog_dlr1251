'use client';

import { useState, useEffect } from 'react';

interface AIAgent {
  id: string;
  name: string;
  type: string;
  description?: string;
  enabled: boolean;
}

interface AIAgentsPanelProps {
  content: string;
  onResult: (agentId: string, agentName: string, agentType: string, result: string) => void;
}

export function AIAgentsPanel({ content, onResult }: AIAgentsPanelProps) {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/ai-agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data.filter((a: AIAgent) => a.enabled));
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const executeAgent = async (agentId: string) => {
    if (!content.trim()) {
      setErrors((prev) => ({ ...prev, [agentId]: 'Escribe contenido primero' }));
      return;
    }

    setLoading((prev) => ({ ...prev, [agentId]: true }));
    setErrors((prev) => ({ ...prev, [agentId]: '' }));

    try {
      const response = await fetch(`/api/ai-agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        const agent = agents.find(a => a.id === agentId);
        setResults((prev) => ({ ...prev, [agentId]: data.result }));
        onResult(agentId, agent?.name || 'Agente', agent?.type || 'unknown', data.result);
      } else {
        setErrors((prev) => ({ ...prev, [agentId]: data.error || 'Error al ejecutar agente' }));
      }
    } catch (error: any) {
      setErrors((prev) => ({ ...prev, [agentId]: error.message || 'Error al ejecutar agente' }));
    } finally {
      setLoading((prev) => ({ ...prev, [agentId]: false }));
    }
  };

  const agentTypes: Record<string, string> = {
    grammar: 'Gramática y Estilo',
    critique: 'Crítica',
    questions: 'Lluvia de Ideas',
    intention: 'Línea Editorial',
  };

  if (agents.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <p className="text-sm text-gray-500">
          No hay agentes IA configurados. Ve a <a href="/admin/ai-agents" className="text-blue-600 hover:underline">Agentes IA</a> para crear uno.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Agentes IA</h3>
        <span className="text-xs text-gray-500">{agents.length} disponible{agents.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white"
          >
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-medium text-gray-900 truncate">{agent.name}</h4>
              <p className="text-xs text-gray-500">
                {agentTypes[agent.type] || agent.type}
              </p>
            </div>
            <button
              type="button"
              onClick={() => executeAgent(agent.id)}
              disabled={loading[agent.id] || !content.trim()}
              className="px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title={agent.description}
            >
              {loading[agent.id] ? '...' : '▶'}
            </button>
            {errors[agent.id] && (
              <span className="text-xs text-red-600" title={errors[agent.id]}>⚠</span>
            )}
            {results[agent.id] && (
              <span className="text-xs text-green-600" title="Análisis completado">✓</span>
            )}
          </div>
        ))}
      </div>
      {Object.keys(errors).length > 0 && (
        <div className="text-xs text-red-600">
          {Object.values(errors).filter(Boolean).join(', ')}
        </div>
      )}
    </div>
  );
}

