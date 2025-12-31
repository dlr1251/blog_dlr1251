import OpenAI from 'openai';

if (!process.env.XAI_API_KEY) {
  throw new Error('XAI_API_KEY is not set');
}

// xAI Grok uses OpenAI-compatible API
const grokClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Generic function for AI agents to use Grok
export async function analyzeWithGrok(
  systemPrompt: string,
  userPrompt: string,
  model: string = 'grok-4-1-fast-reasoning',
  temperature: number = 0.7,
  maxTokens?: number
): Promise<string> {
  try {
    const response = await grokClient.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature,
      ...(maxTokens && { max_tokens: maxTokens }),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from Grok API');
    }

    return content;
  } catch (error) {
    console.error('Error calling Grok API:', error);
    throw error;
  }
}

