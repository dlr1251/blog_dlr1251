import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/api-helpers';

// GET - Admin: Get single AI agent
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const { data: agent, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('Error fetching AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI agent' },
      { status: 500 }
    );
  }
}

// PUT - Admin: Update AI agent
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { name, description, type, systemPrompt, userPrompt, enabled, config } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (systemPrompt !== undefined) updateData.system_prompt = systemPrompt;
    if (userPrompt !== undefined) updateData.user_prompt = userPrompt;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (config !== undefined) updateData.config = config;

    const { data: updatedAgent, error } = await supabase
      .from('ai_agents')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedAgent);
  } catch (error: any) {
    console.error('Error updating AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to update AI agent' },
      { status: 500 }
    );
  }
}

// DELETE - Admin: Delete AI agent
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting AI agent:', error);
    return NextResponse.json(
      { error: 'Failed to delete AI agent' },
      { status: 500 }
    );
  }
}
