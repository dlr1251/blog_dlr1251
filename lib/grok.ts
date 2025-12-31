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
  const startTime = Date.now();
  const requestId = `grok-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  // Verify API key is set
  const apiKeyExists = !!process.env.XAI_API_KEY;
  const apiKeyLength = process.env.XAI_API_KEY?.length || 0;
  const apiKeyPrefix = process.env.XAI_API_KEY?.substring(0, 7) || 'missing';
  
  console.log(`[Grok ${requestId}] Starting request`, {
    model,
    hasApiKey: apiKeyExists,
    apiKeyLength,
    apiKeyPrefix: `${apiKeyPrefix}...`,
    userPromptLength: userPrompt.length,
    systemPromptLength: systemPrompt.length,
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });

  if (!apiKeyExists) {
    const error = new Error('XAI_API_KEY no está configurada. Por favor, configura esta variable de entorno en Vercel.');
    console.error(`[Grok ${requestId}] Configuration error:`, {
      error: error.message,
      envVars: Object.keys(process.env).filter(k => k.includes('XAI') || k.includes('API')),
    });
    throw error;
  }

  try {
    const client = getGrokClient();
    
    const response = await retryWithBackoff(async () => {
      const attemptStart = Date.now();
      console.log(`[Grok ${requestId}] Attempting API call`, {
        model,
        baseURL: 'https://api.x.ai/v1',
        timeout: 60000,
      });
      
      try {
        const result = await client.chat.completions.create({
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
        
        const attemptDuration = Date.now() - attemptStart;
        console.log(`[Grok ${requestId}] API call successful`, {
          duration: `${attemptDuration}ms`,
          choices: result.choices?.length || 0,
          finishReason: result.choices?.[0]?.finish_reason,
          usage: result.usage,
        });
        
        return result;
      } catch (apiError: any) {
        const attemptDuration = Date.now() - attemptStart;
        console.error(`[Grok ${requestId}] API call failed`, {
          duration: `${attemptDuration}ms`,
          error: apiError.message,
          status: apiError.status,
          code: apiError.code,
          type: apiError.type,
          response: apiError.response ? {
            status: apiError.response.status,
            statusText: apiError.response.statusText,
          } : undefined,
        });
        throw apiError;
      }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      const error = new Error('No se recibió respuesta de la API de Grok');
      console.error(`[Grok ${requestId}] No content in response`, {
        choices: response.choices?.length || 0,
        response: JSON.stringify(response).substring(0, 200),
      });
      throw error;
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[Grok ${requestId}] Request completed successfully`, {
      totalDuration: `${totalDuration}ms`,
      contentLength: content.length,
      model,
    });

    return content;
  } catch (error: any) {
    const totalDuration = Date.now() - startTime;
    console.error(`[Grok ${requestId}] Request failed`, {
      totalDuration: `${totalDuration}ms`,
      error: error.message,
      errorType: error.constructor.name,
      status: error.status,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    
    // Provide more descriptive error messages
    if (error?.message?.includes('timeout') || error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
      throw new Error('La conexión con Grok expiró. Por favor, intenta de nuevo.');
    }
    
    if (error?.status === 401 || error?.status === 403) {
      throw new Error('Error de autenticación con Grok. Verifica que XAI_API_KEY sea correcta y tenga los permisos necesarios.');
    }
    
    if (error?.status === 429) {
      throw new Error('Límite de solicitudes excedido. Por favor, espera un momento e intenta de nuevo.');
    }
    
    if (error?.status === 500 || error?.status === 502 || error?.status === 503) {
      throw new Error('El servicio de Grok está temporalmente no disponible. Por favor, intenta más tarde.');
    }
    
    if (error?.message?.includes('XAI_API_KEY')) {
      throw error;
    }
    
    // Generic error message with more context
    const errorMessage = error?.message || 'Error desconocido al conectar con Grok';
    const debugInfo = process.env.NODE_ENV === 'development' 
      ? ` (Status: ${error?.status}, Code: ${error?.code})`
      : '';
    throw new Error(`Error de conexión: ${errorMessage}${debugInfo}. Verifica tu conexión a internet y la configuración de XAI_API_KEY en Vercel.`);
  }
}

