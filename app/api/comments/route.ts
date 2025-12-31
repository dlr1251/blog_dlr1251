import { NextResponse } from 'next/server';
import { createPublicServerClient, createServiceRoleClient } from '@/lib/supabase';
import { getCurrentUserFromRequest, requireAdmin } from '@/lib/api-helpers';

// POST - Public: Create comment
export async function POST(request: Request) {
  try {
    // Parse body with error handling
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { postId, content, authorName, authorEmail, authorWebsite, parentId } = body;

    if (!postId || !content || !authorName || !authorEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS for inserting comments
    // This is safe because we validate all data before inserting
    const supabase = createServiceRoleClient();

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, title, slug, author_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const user = await getCurrentUserFromRequest();
    const userId = user?.id || null;

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        content,
        author_name: authorName,
        author_email: authorEmail,
        author_website: authorWebsite,
        parent_id: parentId,
        user_id: userId,
        approved: false, // Comments need approval by default
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Create notification for post author
    await supabase.from('notifications').insert({
      type: 'comment',
      title: 'Nuevo comentario',
      message: `${authorName} comentó en "${post.title}"`,
      user_id: post.author_id,
      link: `/posts/${post.slug}`,
      metadata: {
        commentId: comment.id,
        postId: post.id,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// GET - Admin: Get all comments (with filters)
export async function GET(request: Request) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const approved = searchParams.get('approved');
    const postId = searchParams.get('postId');

    let query = supabase
      .from('comments')
      .select(`
        *,
        post:posts(id, title, slug)
      `)
      .order('created_at', { ascending: false });

    if (approved !== null) {
      query = query.eq('approved', approved === 'true');
    }
    if (postId) {
      query = query.eq('post_id', postId);
    }

    const { data: comments, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(comments || []);
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
