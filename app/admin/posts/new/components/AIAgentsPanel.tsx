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
  onResult: (agentId: string, result: string) => void;
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
        setResults((prev) => ({ ...prev, [agentId]: data.result }));
        onResult(agentId, data.result);
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
    spellcheck: 'Corrección Ortográfica',
    grammar: 'Gramática',
    clarity: 'Claridad',
    critique: 'Crítica',
    questions: 'Preguntas',
    intention: 'Intención',
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
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Agentes IA Disponibles</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="border border-gray-200 rounded-lg p-3 bg-white"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{agent.name}</h4>
                <p className="text-xs text-gray-500">
                  {agentTypes[agent.type] || agent.type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => executeAgent(agent.id)}
                disabled={loading[agent.id] || !content.trim()}
                className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading[agent.id] ? 'Analizando...' : 'Ejecutar'}
              </button>
            </div>
            {agent.description && (
              <p className="text-xs text-gray-600 mb-2">{agent.description}</p>
            )}
            {errors[agent.id] && (
              <p className="text-xs text-red-600 mt-1">{errors[agent.id]}</p>
            )}
            {results[agent.id] && (
              <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-1">Resultado:</p>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{results[agent.id]}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

