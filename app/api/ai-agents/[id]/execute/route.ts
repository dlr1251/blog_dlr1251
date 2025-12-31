import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { executeAIAgent } from '@/lib/ai-agents';

// POST - Admin: Execute AI agent
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const requestId = `agent-exec-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  
  try {
    console.log(`[Agent Execute ${requestId}] Starting request`, {
      agentId: params.id,
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasXaiKey: !!process.env.XAI_API_KEY,
    });

    const { error: authError } = await requireAdmin();
    if (authError) {
      console.error(`[Agent Execute ${requestId}] Auth error`);
      return authError;
    }

    const body = await request.json();
    const { content, context } = body;

    if (!content) {
      console.error(`[Agent Execute ${requestId}] Missing content`);
      return NextResponse.json(
        { success: false, error: 'El contenido es requerido' },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      console.error(`[Agent Execute ${requestId}] Empty content`);
      return NextResponse.json(
        { success: false, error: 'El contenido no puede estar vacío' },
        { status: 400 }
      );
    }

    console.log(`[Agent Execute ${requestId}] Executing agent`, {
      agentId: params.id,
      contentLength: content.length,
      hasContext: !!context,
    });

    // Execute with timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error(`[Agent Execute ${requestId}] Timeout after 55s`);
        reject(new Error('La solicitud tardó demasiado. Por favor, intenta con menos contenido.'));
      }, 55000); // 55s timeout (Vercel limit is 60s)
    });

    const result = await Promise.race([
      executeAIAgent(params.id, content, context),
      timeoutPromise
    ]) as Awaited<ReturnType<typeof executeAIAgent>>;

    const duration = Date.now() - startTime;
    
    if (!result.success) {
      console.error(`[Agent Execute ${requestId}] Agent execution failed`, {
        duration: `${duration}ms`,
        error: result.error,
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Error desconocido al ejecutar el agente',
          details: process.env.NODE_ENV === 'development' ? result.error : undefined,
          requestId: process.env.NODE_ENV === 'development' ? requestId : undefined,
        },
        { status: 500 }
      );
    }

    console.log(`[Agent Execute ${requestId}] Agent execution successful`, {
      duration: `${duration}ms`,
      resultLength: result.result?.length || 0,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Agent Execute ${requestId}] Error executing AI agent`, {
      duration: `${duration}ms`,
      error: error.message,
      errorType: error.constructor.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    
    // Provide more specific error messages
    let errorMessage = 'Error al ejecutar el agente IA';
    let statusCode = 500;
    let debugInfo: any = {};
    
    if (error.message?.includes('timeout') || error.message?.includes('tardó demasiado')) {
      errorMessage = 'La solicitud tardó demasiado. Intenta con menos contenido o verifica tu conexión.';
      statusCode = 504;
      debugInfo.timeout = true;
    } else if (error.message?.includes('XAI_API_KEY')) {
      errorMessage = 'Error de configuración: XAI_API_KEY no está configurada correctamente en Vercel.';
      statusCode = 500;
      debugInfo.configError = true;
      debugInfo.hasXaiKey = !!process.env.XAI_API_KEY;
    } else if (error.message?.includes('conexión') || error.message?.includes('Connection') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Error de conexión con el servicio de IA. Verifica tu conexión a internet y la configuración de XAI_API_KEY.';
      statusCode = 503;
      debugInfo.connectionError = true;
    } else {
      errorMessage = error.message || 'Error desconocido al ejecutar el agente';
      debugInfo.unknownError = true;
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined,
        requestId: process.env.NODE_ENV === 'development' ? requestId : undefined,
      },
      { status: statusCode }
    );
  }
}

