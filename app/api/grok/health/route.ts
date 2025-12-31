import { NextResponse } from 'next/server';

// GET - Health check for Grok configuration
export async function GET() {
  const health = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    hasXaiKey: !!process.env.XAI_API_KEY,
    xaiKeyLength: process.env.XAI_API_KEY?.length || 0,
    xaiKeyPrefix: process.env.XAI_API_KEY?.substring(0, 7) || 'missing',
    status: 'ok' as const,
  };

  // Don't expose full key, but show if it's configured
  if (!health.hasXaiKey) {
    return NextResponse.json(
      {
        ...health,
        status: 'error',
        error: 'XAI_API_KEY no está configurada',
        message: 'Por favor, configura XAI_API_KEY en las variables de entorno de Vercel',
      },
      { status: 500 }
    );
  }

  return NextResponse.json(health);
}

