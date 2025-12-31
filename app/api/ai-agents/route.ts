import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/api-helpers';

// GET - Admin: Get all AI agents
export async function GET() {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json(agents || []);
  } catch (error: any) {
    console.error('Error fetching AI agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI agents' },
      { status: 500 }
    );
  }
}

// POST - Admin: Create AI agent
export async function POST(request: Request) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { name, description, type, systemPrompt, userPrompt, enabled, config } = body;

    if (!name || !type || !systemPrompt) {
      return NextResponse.json(
        { error: 'Name, type, and systemPrompt are required' },
        { status: 400 }
      );
    }

    const { data: agent, error } = await supabase
      .from('ai_agents')
      .insert({
        name,
        description,
        type,
        system_prompt: systemPrompt,
        user_prompt: userPrompt || '{{content}}',
        enabled: enabled !== undefined ? enabled : true,
        config: config || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    console.error('Error creating AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to create AI agent' },
      { status: 500 }
    );
  }
}
