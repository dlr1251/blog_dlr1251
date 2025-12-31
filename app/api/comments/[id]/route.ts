import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/api-helpers';

// PUT - Admin: Update comment (approve/reject)
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
    const { approved, content } = body;

    const updateData: any = {};
    if (approved !== undefined) {
      updateData.approved = approved;
    }
    if (content !== undefined) {
      updateData.content = content;
    }

    const { data: updatedComment, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        post:posts(id, title, slug)
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(updatedComment);
  } catch (error: any) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

// DELETE - Admin: Delete comment
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
      .from('comments')
      .delete()
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
