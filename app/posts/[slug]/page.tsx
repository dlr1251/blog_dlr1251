import { notFound } from 'next/navigation';
import { createPublicServerClient } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase-auth';
import { format } from 'date-fns';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CommentForm } from './components/CommentForm';
import { ShareButtons } from './components/ShareButtons';
import { StyleSelector } from './components/StyleSelector';
import { CommentItem } from './components/CommentItem';

export default async function PostPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createPublicServerClient();
  const user = await getCurrentUser();
  const isAdmin = user?.role === 'admin';

  // Get post
  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', params.slug)
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold">
              Blog de Daniel Luque
            </Link>
            <nav className="space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Inicio
              </Link>
              {isAdmin && (
                <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                  Admin
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-lg border shadow-sm p-8 md:p-12">
          {/* Header */}
          <header className="mb-8">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-4 inline-block"
            >
              ← Volver al inicio
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-xl text-gray-600 mb-6">{post.excerpt}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap mb-4">
              {post.published_at && (
                <time dateTime={post.published_at}>
                  {format(new Date(post.published_at), "d 'de' MMMM, yyyy")}
                </time>
              )}
              {authorProfile?.name && (
                <span>Por {authorProfile.name}</span>
              )}
              {post.category && (
                <span className="text-blue-600">#{post.category}</span>
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
            
            {/* Share and Style Selector */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6 pt-4 border-t">
              <ShareButtons title={post.title} slug={post.slug} />
              <StyleSelector />
            </div>
            {post.tags && post.tags.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {post.tags.map((tag: string, index: number) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div className="mb-12 markdown-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-xl font-bold mt-4 mb-2 text-gray-900" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="mb-4 text-gray-700 leading-7" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="ml-4" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote
                    className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600"
                    {...props}
                  />
                ),
                code: ({ node, inline, ...props }: any) =>
                  inline ? (
                    <code
                      className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono"
                      {...props}
                    />
                  ) : (
                    <code
                      className="block bg-gray-100 text-gray-800 p-4 rounded-lg text-sm font-mono overflow-x-auto mb-4"
                      {...props}
                    />
                  ),
                a: ({ node, ...props }) => (
                  <a
                    className="text-blue-600 hover:text-blue-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-gray-900" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em className="italic" {...props} />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="my-8 border-gray-300" {...props} />
                ),
                table: ({ node, ...props }) => (
                  <div className="overflow-x-auto mb-4">
                    <table className="min-w-full border border-gray-300" {...props} />
                  </div>
                ),
                th: ({ node, ...props }) => (
                  <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-bold text-left" {...props} />
                ),
                td: ({ node, ...props }) => (
                  <td className="border border-gray-300 px-4 py-2" {...props} />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Comments Section */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Comentarios ({sortedComments.length})
            </h2>

            {sortedComments.length === 0 ? (
              <p className="text-gray-500 mb-6">
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
      </main>
    </div>
  );
}

