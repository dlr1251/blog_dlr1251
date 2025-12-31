import { notFound } from 'next/navigation';
import { createPublicServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase-auth';
import { format } from 'date-fns';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CommentForm } from './components/CommentForm';
import { ShareButtons } from './components/ShareButtons';
import { CommentItem } from './components/CommentItem';

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicServerClient();
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';

  // Get post
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !post) {
    notFound();
  }

  // Only admins can see unpublished posts
  if (!post.published && !isAdmin) {
    notFound();
  }

  // Get author profile separately since author_id references auth.users, not user_profiles
  const { data: authorProfile } = await supabase
    .from('user_profiles')
    .select('id, name')
    .eq('id', post.author_id)
    .single();

  // Get approved comments with vote counts, ordered by score (upvotes - downvotes)
  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', post.id)
    .eq('approved', true)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  // Get replies for each comment
  const commentsWithReplies = await Promise.all(
    (comments || []).map(async (comment: any) => {
      const { data: replies } = await supabase
        .from('comments')
        .select('*')
        .eq('parent_id', comment.id)
        .eq('approved', true)
        .order('created_at', { ascending: true });

      return {
        ...comment,
        replies: replies || [],
      };
    })
  );

  // Sort comments by score (upvotes - downvotes), then by date
  const sortedComments = [...commentsWithReplies].sort((a: any, b: any) => {
    const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
    const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
    if (scoreB !== scoreA) {
      return scoreB - scoreA; // Higher score first
    }
    // If scores are equal, sort by date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Increment view count (fire and forget)
  supabase
    .from('posts')
    .update({ views: (post.views || 0) + 1 })
    .eq('id', post.id)
    .then(() => {}); // Fire and forget

  return (
    <div style={{ backgroundColor: 'var(--theme-bg)', transition: 'background-color 500ms ease-in-out' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article 
          className="p-8 md:p-12"
          style={{
            backgroundColor: 'var(--theme-surface)',
            border: 'var(--theme-border-width) solid var(--theme-border)',
            borderRadius: 'var(--theme-radius)',
            boxShadow: 'var(--theme-shadow)',
            transition: 'all 500ms ease-in-out',
          }}
        >
          {/* Header */}
          <header className="mb-8">
            <Link
              href="/"
              className="text-sm font-medium mb-4 inline-block hover:opacity-80 transition-opacity"
              style={{ color: 'var(--theme-accent)' }}
            >
              ← Volver al inicio
            </Link>
            <h1 
              className="text-4xl md:text-5xl mb-4"
              style={{
                color: 'var(--theme-text)',
                fontFamily: 'var(--theme-font-heading)',
                fontWeight: 'var(--theme-heading-weight)',
                letterSpacing: 'var(--theme-heading-tracking)',
              }}
            >
              {post.title}
            </h1>
            {post.excerpt && (
              <p 
                className="text-xl mb-6"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {post.excerpt}
              </p>
            )}
            <div 
              className="flex items-center gap-4 text-sm flex-wrap mb-4"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {post.published_at && (
                <time dateTime={post.published_at}>
                  {format(new Date(post.published_at), "d 'de' MMMM, yyyy")}
                </time>
              )}
              {authorProfile?.name && (
                <span>Por {authorProfile.name}</span>
              )}
              {post.category && (
                <span style={{ color: 'var(--theme-accent)' }}>#{post.category}</span>
              )}
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {post.views || 0} visualizaciones
              </span>
            </div>
            
            {/* Share Buttons */}
            <div 
              className="mb-6 pt-4"
              style={{ 
                borderTop: 'var(--theme-border-width) solid var(--theme-border)',
              }}
            >
              <ShareButtons title={post.title} slug={post.slug} />
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {post.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="text-xs font-medium px-2 py-1"
                    style={{
                      backgroundColor: 'var(--theme-surface)',
                      color: 'var(--theme-text)',
                      borderRadius: 'var(--theme-radius)',
                      border: 'var(--theme-border-width) solid var(--theme-border)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="mb-12 prose markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Comments Section */}
          <section 
            className="pt-8"
            style={{ 
              borderTop: 'var(--theme-border-width) solid var(--theme-border)',
            }}
          >
            <h2 
              className="text-2xl font-bold mb-6"
              style={{
                color: 'var(--theme-text)',
                fontFamily: 'var(--theme-font-heading)',
              }}
            >
              Comentarios ({sortedComments.length})
            </h2>

            {sortedComments.length === 0 ? (
              <p className="mb-6" style={{ color: 'var(--theme-text-muted)' }}>
                Aún no hay comentarios. ¡Sé el primero en comentar!
              </p>
            ) : (
              <div className="space-y-4 mb-8">
                {sortedComments.map((comment: any) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    postId={post.id}
                    userEmail={user?.email || null}
                  />
                ))}
              </div>
            )}

            {/* Comment Form */}
            <CommentForm postId={post.id} />
          </section>
        </article>
      </div>
    </div>
  );
}

