import Link from 'next/link';
import { createPublicServerClient } from '@/lib/supabase';
import { format } from 'date-fns';

export default async function Home() {
  const supabase = createPublicServerClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(10);

  // Get author profiles separately since author_id references auth.users, not user_profiles
  const postsWithAuthors = await Promise.all(
    (posts || []).map(async (post: any) => {
      const { data: authorProfile } = await supabase
        .from('user_profiles')
        .select('id, name')
        .eq('id', post.author_id)
        .single();

      return {
        ...post,
        author: authorProfile || { id: post.author_id, name: 'Sin autor' },
      };
    })
  );

  // Get comment counts for each post
  const postsWithCounts = await Promise.all(
    postsWithAuthors.map(async (post: any) => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id)
        .eq('approved', true);

      return {
        ...post,
        _count: {
          comments: count || 0,
        },
      };
    })
  );

  return (
    <div style={{ backgroundColor: 'var(--theme-bg)', transition: 'background-color 500ms ease-in-out' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <div>
            <h1 
              className="text-3xl font-bold mb-4"
              style={{
                color: 'var(--theme-text)',
                fontFamily: 'var(--theme-font-heading)',
                fontWeight: 'var(--theme-heading-weight)',
                letterSpacing: 'var(--theme-heading-tracking)',
              }}
            >
              Últimos Posts
            </h1>
            <p style={{ color: 'var(--theme-text-muted)' }}>
              Pensamientos, ideas y reflexiones sobre tecnología, derecho y más.
            </p>
          </div>
        </div>

        {postsWithCounts.length === 0 ? (
          <div 
            className="p-6 card-hover"
            style={{
              backgroundColor: 'var(--theme-surface)',
              border: 'var(--theme-border-width) solid var(--theme-border)',
              borderRadius: 'var(--theme-radius)',
              boxShadow: 'var(--theme-shadow)',
            }}
          >
            <p className="text-center" style={{ color: 'var(--theme-text-muted)' }}>
              Aún no hay posts publicados. 
              <Link 
                href="/admin/posts/new" 
                className="ml-1 hover:opacity-80 underline"
                style={{ color: 'var(--theme-accent)' }}
              >
                Crea tu primer post
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {postsWithCounts.map((post: any) => (
              <Link key={post.id} href={`/posts/${post.slug}`}>
                <div 
                  className="p-6 h-full card-hover cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    border: 'var(--theme-border-width) solid var(--theme-border)',
                    borderRadius: 'var(--theme-radius)',
                    boxShadow: 'var(--theme-shadow)',
                    transition: 'all 300ms ease-in-out',
                  }}
                >
                  <div className="mb-4">
                    <h3 
                      className="text-lg font-semibold line-clamp-2 mb-2"
                      style={{
                        color: 'var(--theme-text)',
                        fontFamily: 'var(--theme-font-heading)',
                      }}
                    >
                      {post.title}
                    </h3>
                    <div className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
                      {post.published_at && (
                        <time dateTime={post.published_at}>
                          {format(new Date(post.published_at), "d MMM, yyyy")}
                        </time>
                      )}
                      {post.author?.name && (
                        <span className="ml-2">• {post.author.name}</span>
                      )}
                    </div>
                  </div>
                  {post.excerpt && (
                    <div>
                      <p 
                        className="text-sm line-clamp-3"
                        style={{ color: 'var(--theme-text-muted)' }}
                      >
                        {post.excerpt}
                      </p>
                      {post._count.comments > 0 && (
                        <p className="text-xs mt-2 opacity-70" style={{ color: 'var(--theme-text-muted)' }}>
                          {post._count.comments} comentario{post._count.comments !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
