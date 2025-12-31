// Types for Grok API
export interface GrokDebugInfo {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  responseFormat?: string;
}
