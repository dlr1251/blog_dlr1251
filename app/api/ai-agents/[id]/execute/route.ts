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
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const result = await executeAIAgent(params.id, content, context);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to execute AI agent', details: error.message },
      { status: 500 }
    );
  }
}

