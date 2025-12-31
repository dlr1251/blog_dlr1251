import { createServiceRoleClient } from './supabase';
import { analyzeWithGrok } from './grok';

export interface AIAgentConfig {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AIAgentResult {
  success: boolean;
  result?: string;
  error?: string;
  metadata?: any;
}

export async function executeAIAgent(
  agentId: string,
  content: string,
  additionalContext?: Record<string, any>
): Promise<AIAgentResult> {
  const executionId = `agent-${agentId}-${Date.now()}`;
  const startTime = Date.now();
  
  try {
    console.log(`[AI Agent ${executionId}] Starting execution`, {
      agentId,
      contentLength: content.length,
      hasContext: !!additionalContext,
    });

    const supabase = createServiceRoleClient();
    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error) {
      console.error(`[AI Agent ${executionId}] Database error`, {
        error: error.message,
        code: error.code,
      });
      return {
        success: false,
        error: `Error al buscar el agente: ${error.message}`,
      };
    }

    if (!agent) {
      console.error(`[AI Agent ${executionId}] Agent not found`, { agentId });
      return {
        success: false,
        error: 'Agente no encontrado',
      };
    }

    if (!agent.enabled) {
      console.error(`[AI Agent ${executionId}] Agent disabled`, { agentId, name: agent.name });
      return {
        success: false,
        error: 'El agente está deshabilitado',
      };
    }

    console.log(`[AI Agent ${executionId}] Agent found`, {
      name: agent.name,
      type: agent.type,
      enabled: agent.enabled,
      systemPromptPreview: agent.system_prompt?.substring(0, 100) || 'NO PROMPT',
      userPromptPreview: agent.user_prompt?.substring(0, 50) || 'NO PROMPT',
    });

    // Replace template variables in user prompt
    let userPrompt = agent.user_prompt || '{{content}}';
    // Replace all occurrences, not just the first one
    userPrompt = userPrompt.replace(/\{\{content\}\}/g, content);
    
    // Replace additional context variables
    if (additionalContext) {
      Object.entries(additionalContext).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        userPrompt = userPrompt.replace(regex, String(value));
      });
    }

    // Parse agent config
    const config: AIAgentConfig = agent.config || {};

    console.log(`[AI Agent ${executionId}] Calling Grok`, {
      agentId,
      agentName: agent.name,
      agentType: agent.type,
      model: config.model || 'grok-4-1-fast-reasoning',
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      userPromptLength: userPrompt.length,
      systemPromptLength: agent.system_prompt?.length || 0,
      systemPromptPreview: agent.system_prompt?.substring(0, 150) || 'NO PROMPT',
    });

    // Execute with Grok
    const grokStartTime = Date.now();
    const result = await analyzeWithGrok(
      agent.system_prompt,
      userPrompt,
      config.model || 'grok-4-1-fast-reasoning',
      config.temperature,
      config.maxTokens
    );
    const grokDuration = Date.now() - grokStartTime;

    console.log(`[AI Agent ${executionId}] Grok call successful`, {
      grokDuration: `${grokDuration}ms`,
      resultLength: result.length,
    });

    // Save execution record
    try {
      await supabase.from('ai_executions').insert({
        agent_id: agent.id,
        content: content.substring(0, 10000), // Limit stored content
        result: result.substring(0, 50000), // Limit stored result
        metadata: {
          model: config.model || 'grok-4-1-fast-reasoning',
          contentLength: content.length,
          resultLength: result.length,
          ...additionalContext,
        },
      });
      console.log(`[AI Agent ${executionId}] Execution record saved`);
    } catch (saveError: any) {
      console.error(`[AI Agent ${executionId}] Failed to save execution record`, {
        error: saveError.message,
      });
      // Don't fail the whole request if saving fails
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[AI Agent ${executionId}] Execution completed successfully`, {
      totalDuration: `${totalDuration}ms`,
    });

    return {
      success: true,
      result,
      metadata: {
        agentName: agent.name,
        agentType: agent.type,
      },
    };
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[AI Agent ${executionId}] Execution failed`, {
      totalDuration: `${totalDuration}ms`,
      error: error.message,
      errorType: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to execute AI agent',
    };
  }
}

export async function executeMultipleAgents(
  agentIds: string[],
  content: string,
  additionalContext?: Record<string, any>
): Promise<Record<string, AIAgentResult>> {
  const results: Record<string, AIAgentResult> = {};

  await Promise.all(
    agentIds.map(async (agentId) => {
      const result = await executeAIAgent(agentId, content, additionalContext);
      results[agentId] = result;
    })
  );

  return results;
}
