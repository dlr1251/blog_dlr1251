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
              <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                Admin
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Últimos Posts</h1>
          <p className="text-gray-600">
            Pensamientos, ideas y reflexiones sobre tecnología, derecho y más.
          </p>
        </div>

        {postsWithCounts.length === 0 ? (
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <p className="text-center text-gray-500">
              Aún no hay posts publicados. 
              <Link href="/admin/posts/new" className="text-blue-600 hover:underline ml-1">
                Crea tu primer post
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {postsWithCounts.map((post: any) => (
              <Link key={post.id} href={`/posts/${post.slug}`}>
                <div className="bg-white rounded-lg border p-6 shadow-sm h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">
                      {post.title}
                    </h3>
                    <div className="text-sm text-gray-500">
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
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {post.excerpt}
                      </p>
                      {post._count.comments > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
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
      </main>
    </div>
  );
}
