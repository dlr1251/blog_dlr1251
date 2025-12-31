import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { analyzeWithGrok } from '@/lib/grok';

// POST - Admin: Generate excerpt using Grok
export async function POST(request: Request) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const body = await request.json();
    const { content, title } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const systemPrompt = `Eres un experto en crear resúmenes concisos y atractivos para posts de blog. 
Crea un resumen breve (2-3 oraciones máximo, 150-200 caracteres) que capture la esencia del contenido.
El resumen debe ser claro, interesante y hacer que el lector quiera leer el post completo.
No uses comillas ni signos de puntuación innecesarios.`;

    const userPrompt = title
      ? `Título: ${title}\n\nContenido:\n${content}\n\nCrea un resumen conciso:`
      : `Contenido:\n${content}\n\nCrea un resumen conciso:`;

    const excerpt = await analyzeWithGrok(
      systemPrompt,
      userPrompt,
      'grok-4-1-fast-reasoning',
      0.7,
      200
    );

    return NextResponse.json({ excerpt: excerpt.trim() });
  } catch (error: any) {
    console.error('Error generating excerpt:', error);
    return NextResponse.json(
      { error: 'Failed to generate excerpt', details: error.message },
      { status: 500 }
    );
  }
}

