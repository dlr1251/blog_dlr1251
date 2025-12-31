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
  try {
    const supabase = createServiceRoleClient();
    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (error || !agent || !agent.enabled) {
      return {
        success: false,
        error: 'Agent not found or disabled',
      };
    }

    // Replace template variables in user prompt
    let userPrompt = agent.user_prompt || '{{content}}';
    userPrompt = userPrompt.replace('{{content}}', content);
    
    // Replace additional context variables
    if (additionalContext) {
      Object.entries(additionalContext).forEach(([key, value]) => {
        userPrompt = userPrompt.replace(`{{${key}}}`, String(value));
      });
    }

    // Parse agent config
    const config: AIAgentConfig = agent.config || {};

    // Execute with Grok
    const result = await analyzeWithGrok(
      agent.system_prompt,
      userPrompt,
      config.model || 'grok-4-1-fast-reasoning',
      config.temperature,
      config.maxTokens
    );

    // Save execution record
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

    return {
      success: true,
      result,
      metadata: {
        agentName: agent.name,
        agentType: agent.type,
      },
    };
  } catch (error: any) {
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
