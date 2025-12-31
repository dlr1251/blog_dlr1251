import { getCurrentUser } from '@/lib/supabase-auth';
import { createServiceRoleClient } from '@/lib/supabase-auth';
import Link from 'next/link';

export default async function AIAgentsPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">No tienes acceso a esta página.</p>
      </div>
    );
  }

  const supabase = createServiceRoleClient();
  const { data: agents, error } = await supabase
    .from('ai_agents')
    .select('*')
    .order('created_at', { ascending: false });

  const agentTypes = {
    spellcheck: 'Corrección Ortográfica',
    grammar: 'Gramática',
    clarity: 'Claridad',
    critique: 'Crítica',
    questions: 'Preguntas',
    intention: 'Intención',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agentes IA</h1>
          <p className="text-gray-600 mt-2">Gestiona los agentes de IA para análisis de contenido</p>
        </div>
        <Link 
          href="/admin/ai-agents/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Nuevo Agente
        </Link>
      </div>

      {error ? (
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <p className="text-red-600">Error al cargar los agentes: {String(error)}</p>
        </div>
      ) : (agents || []).length === 0 ? (
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <p className="text-gray-600 text-center py-8">No hay agentes IA configurados aún.</p>
          <div className="text-center">
            <Link 
              href="/admin/ai-agents/new"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Crear Primer Agente
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(agents || []).map((agent: any) => (
            <div key={agent.id} className="bg-white rounded-lg border shadow-sm">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                  {agent.enabled ? (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                      Activo
                    </span>
                  ) : (
                    <span className="border border-gray-300 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                      Inactivo
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {agentTypes[agent.type as keyof typeof agentTypes] || agent.type}
                </p>
              </div>
              <div className="p-6">
                {agent.description && (
                  <p className="text-sm text-gray-600 mb-4">{agent.description}</p>
                )}
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    <strong>Prompt del sistema:</strong>
                    <p className="mt-1 line-clamp-2">{agent.system_prompt}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link 
                    href={`/admin/ai-agents/${agent.id}`}
                    className="flex-1 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors text-center"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

