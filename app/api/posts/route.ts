import { NextResponse } from 'next/server';
import { createPublicServerClient, createServiceRoleClient } from '@/lib/supabase';
import { requireAdmin } from '@/lib/api-helpers';
import { ensureUniqueSlug, generateSlug } from '@/lib/utils/slug';

// GET - Public: Get all published posts
export async function GET(request: Request) {
  try {
    const supabase = createPublicServerClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:user_profiles!posts_author_id_fkey(id, name)
      `)
      .eq('published', true)
      .order('published_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    const { data: posts, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get comment counts for each post
    const postsWithCounts = await Promise.all(
      (posts || []).map(async (post) => {
        const { count: commentCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('approved', true);

        return {
          ...post,
          _count: {
            comments: commentCount || 0,
          },
        };
      })
    );

    // Get total count
    let countQuery = supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('published', true);

    if (category) {
      countQuery = countQuery.eq('category', category);
    }

    if (tag) {
      countQuery = countQuery.contains('tags', [tag]);
    }

    if (search) {
      countQuery = countQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`);
    }

    const { count: total } = await countQuery;

    return NextResponse.json({
      posts: postsWithCounts,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST - Admin: Create new post
export async function POST(request: Request) {
  try {
    const { user, error: authError } = await requireAdmin();
    if (authError) {
      return authError;
    }

    const body = await request.json();
    const { title, content, excerpt, published, tags, category, published_at } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const baseSlug = generateSlug(title);
    const slug = await ensureUniqueSlug(baseSlug);

    // Determine published_at: use provided date, or current date if publishing now, or null if draft
    let publishedAt = null;
    if (published) {
      if (published_at) {
        publishedAt = new Date(published_at).toISOString();
      } else {
        publishedAt = new Date().toISOString();
      }
    }

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title,
        slug,
        content,
        excerpt,
        published: published || false,
        published_at: publishedAt,
        tags: tags || [],
        category,
        author_id: user!.id,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Get author profile separately since author_id references auth.users, not user_profiles
    const { data: authorProfile } = await supabase
      .from('user_profiles')
      .select('id, name')
      .eq('id', user!.id)
      .single();

    const postWithAuthor = {
      ...post,
      author: authorProfile || { id: user!.id, name: user!.email || user!.name },
    };

    return NextResponse.json(postWithAuthor, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}
