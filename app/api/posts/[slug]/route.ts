import { NextResponse } from 'next/server';
import { createPublicServerClient, createServiceRoleClient } from '@/lib/supabase';
import { getCurrentUserFromRequest, requireAdmin } from '@/lib/api-helpers';
import { ensureUniqueSlug, generateSlug } from '@/lib/utils/slug';

// GET - Public: Get single post by slug
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = createPublicServerClient();
    const user = await getCurrentUserFromRequest();
    const isAdmin = user?.role === 'admin';

    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:user_profiles!posts_author_id_fkey(id, name)
      `)
      .eq('slug', params.slug)
      .single();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Only admins can see unpublished posts
    if (!post.published && !isAdmin) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Get approved comments with replies
    const { data: comments } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .eq('approved', true)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    // Get replies for each comment
    if (comments) {
      for (const comment of comments) {
        const { data: replies } = await supabase
          .from('comments')
          .select('*')
          .eq('parent_id', comment.id)
          .eq('approved', true)
          .order('created_at', { ascending: true });
        
        comment.replies = replies || [];
      }
    }

    // Increment view count
    await supabase
      .from('posts')
      .update({ views: (post.views || 0) + 1 })
      .eq('id', post.id);

    return NextResponse.json({
      ...post,
      comments: comments || [],
    });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// PUT - Admin: Update post
export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { title, content, excerpt, published, tags, category, published_at } = body;

    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (fetchError || !existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if title changed, need to update slug
    let slug = existingPost.slug;
    if (title && title !== existingPost.title) {
      const baseSlug = generateSlug(title);
      slug = await ensureUniqueSlug(baseSlug, existingPost.slug);
    }

    const updateData: any = {
      title,
      slug,
      content,
      excerpt,
      published,
      tags: tags || [],
      category,
    };

    // Handle published_at: use scheduled time if provided, otherwise set to now if publishing for first time
    if (published) {
      if (published_at) {
        updateData.published_at = published_at;
      } else if (!existingPost.published_at) {
        // Only set to now if it wasn't already published
        updateData.published_at = new Date().toISOString();
      }
      // If already published, keep existing published_at unless explicitly changed
    } else {
      // If unpublishing, we might want to clear published_at, but let's keep it for history
      // updateData.published_at = null;
    }

    const { data: post, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', existingPost.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Get author profile separately
    const { data: authorProfile } = await supabase
      .from('user_profiles')
      .select('id, name')
      .eq('id', user!.id)
      .single();

    const postWithAuthor = {
      ...post,
      author: authorProfile || { id: user!.id, name: user!.email || user!.name },
    };

    return NextResponse.json(postWithAuthor);
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    );
  }
}

// DELETE - Admin: Delete post
export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('slug', params.slug);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
