import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { executeAIAgent } from '@/lib/ai-agents';

// POST - Admin: Execute AI agent
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const body = await request.json();
    const { content, context } = body;

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'El contenido es requerido' },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json(
        { success: false, error: 'El contenido no puede estar vacío' },
        { status: 400 }
      );
    }

    // Execute with timeout handling
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('La solicitud tardó demasiado. Por favor, intenta con menos contenido.')), 55000); // 55s timeout (Vercel limit is 60s)
    });

    const result = await Promise.race([
      executeAIAgent(params.id, content, context),
      timeoutPromise
    ]) as Awaited<ReturnType<typeof executeAIAgent>>;

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Error desconocido al ejecutar el agente',
          details: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing AI agent:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Error al ejecutar el agente IA';
    let statusCode = 500;
    
    if (error.message?.includes('timeout') || error.message?.includes('tardó demasiado')) {
      errorMessage = 'La solicitud tardó demasiado. Intenta con menos contenido o verifica tu conexión.';
      statusCode = 504;
    } else if (error.message?.includes('XAI_API_KEY')) {
      errorMessage = 'Error de configuración: XAI_API_KEY no está configurada correctamente.';
      statusCode = 500;
    } else if (error.message?.includes('conexión') || error.message?.includes('Connection')) {
      errorMessage = 'Error de conexión con el servicio de IA. Verifica tu conexión a internet.';
      statusCode = 503;
    } else {
      errorMessage = error.message || 'Error desconocido al ejecutar el agente';
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}

