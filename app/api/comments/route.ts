import { NextResponse } from 'next/server';
import { createPublicServerClient, createServiceRoleClient } from '@/lib/supabase';
import { getCurrentUserFromRequest, requireAdmin } from '@/lib/api-helpers';
import {
  checkRateLimit,
  checkContentSpam,
  checkDuplicateContent,
  recordCommentSubmission,
  getClientIP,
} from '@/lib/spam-protection';

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
    
    const { postId, content, authorName, authorEmail, authorWebsite, parentId, isAnonymous, honeypot } = body;

    // Honeypot check - if this field is filled, it's likely a bot
    if (honeypot) {
      return NextResponse.json(
        { error: 'Spam detected' },
        { status: 400 }
      );
    }

    // Validate required fields
    const trimmedContent = content?.trim() || '';
    const trimmedName = authorName?.trim() || '';
    const trimmedEmail = authorEmail?.trim() || '';

    // For anonymous comments, name and email are optional
    const isAnon = isAnonymous === true;
    if (!postId || !trimmedContent) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    if (!isAnon && (!trimmedName || !trimmedEmail)) {
      return NextResponse.json(
        { error: 'Nombre y email son requeridos (o marca como anónimo)' },
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
      return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 });
    }

    // Spam protection checks
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';

    // Rate limiting check
    const rateLimitCheck = await checkRateLimit(
      ipAddress,
      isAnon ? null : trimmedEmail,
      postId
    );
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.reason },
        { status: 429 }
      );
    }

    // Content spam check
    const spamCheck = checkContentSpam(trimmedContent);
    if (spamCheck.isSpam) {
      return NextResponse.json(
        { error: `El comentario parece ser spam: ${spamCheck.reason}` },
        { status: 400 }
      );
    }

    // Duplicate content check
    const duplicateCheck = await checkDuplicateContent(
      trimmedContent,
      ipAddress,
      isAnon ? null : trimmedEmail
    );
    if (duplicateCheck.isDuplicate) {
      return NextResponse.json(
        { error: duplicateCheck.reason },
        { status: 400 }
      );
    }

    const user = await getCurrentUserFromRequest();
    const userId = user?.id || null;

    // Determine if comment should be auto-approved (for logged-in users with good history)
    let autoApprove = false;
    if (userId) {
      // Check user's comment history
      const { count: approvedCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('approved', true);

      // Auto-approve if user has 5+ approved comments
      if (approvedCount && approvedCount >= 5) {
        autoApprove = true;
      }
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        content: trimmedContent,
        author_name: isAnon ? 'Anónimo' : trimmedName,
        author_email: isAnon ? `anonymous-${Date.now()}@example.com` : trimmedEmail,
        author_website: authorWebsite,
        parent_id: parentId,
        user_id: userId,
        approved: autoApprove,
        is_anonymous: isAnon,
        ip_address: ipAddress,
        user_agent: userAgent,
        spam_score: spamCheck.score,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // Record submission for rate limiting
    await recordCommentSubmission(
      ipAddress,
      isAnon ? null : trimmedEmail,
      postId,
      trimmedContent
    );

    // Create notification for post author
    await supabase.from('notifications').insert({
      type: 'comment',
      title: 'Nuevo comentario',
      message: `${isAnon ? 'Anónimo' : trimmedName} comentó en "${post.title}"`,
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
      { error: 'Error al crear el comentario' },
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
