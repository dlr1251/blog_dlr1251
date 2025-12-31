import OpenAI from 'openai';

// xAI Grok uses OpenAI-compatible API
// Initialize client lazily to avoid build-time errors if key is not set
let grokClient: OpenAI | null = null;

function getGrokClient(): OpenAI {
  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY no está configurada. Por favor, configura esta variable de entorno en Vercel.');
  }
  
  if (!grokClient) {
    grokClient = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
      timeout: 60000, // 60 seconds timeout
      maxRetries: 2,
    });
  }
  
  return grokClient;
}

// Retry logic helper
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error?.status === 401 || error?.status === 403 || error?.status === 400) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Unknown error occurred');
}

// Generic function for AI agents to use Grok
export async function analyzeWithGrok(
  systemPrompt: string,
  userPrompt: string,
  model: string = 'grok-4-1-fast-reasoning',
  temperature: number = 0.7,
  maxTokens?: number
): Promise<string> {
  // Verify API key is set
  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY no está configurada. Por favor, configura esta variable de entorno en Vercel.');
  }

  try {
    const client = getGrokClient();
    
    const response = await retryWithBackoff(async () => {
      return await client.chat.completions.create({
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
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de la API de Grok');
    }

    return content;
  } catch (error: any) {
    console.error('Error calling Grok API:', error);
    
    // Provide more descriptive error messages
    if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED') {
      throw new Error('La conexión con Grok expiró. Por favor, intenta de nuevo.');
    }
    
    if (error?.status === 401 || error?.status === 403) {
      throw new Error('Error de autenticación con Grok. Verifica que XAI_API_KEY sea correcta.');
    }
    
    if (error?.status === 429) {
      throw new Error('Límite de solicitudes excedido. Por favor, espera un momento e intenta de nuevo.');
    }
    
    if (error?.message?.includes('XAI_API_KEY')) {
      throw error;
    }
    
    // Generic error message
    const errorMessage = error?.message || 'Error desconocido al conectar con Grok';
    throw new Error(`Error de conexión: ${errorMessage}. Verifica tu conexión a internet y la configuración de XAI_API_KEY.`);
  }
}

