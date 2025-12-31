import { getCurrentUser } from '@/lib/supabase-auth';
import { createServiceRoleClient } from '@/lib/supabase-auth';
import Link from 'next/link';

export default async function PostsPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">No tienes acceso a esta página.</p>
      </div>
    );
  }

  const supabase = createServiceRoleClient();
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Posts</h1>
            <p className="text-gray-600 mt-2">Gestiona todos tus posts</p>
          </div>
          <Link 
            href="/admin/posts/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Nuevo Post
          </Link>
        </div>
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <p className="text-red-600">Error al cargar los posts: {String(error)}</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Posts</h1>
          <p className="text-gray-600 mt-2">Gestiona todos tus posts</p>
        </div>
        <Link 
          href="/admin/posts/new"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Nuevo Post
        </Link>
      </div>

      {postsWithAuthors.length === 0 ? (
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <p className="text-gray-600 text-center py-8">No hay posts aún. Crea tu primer post.</p>
          <div className="text-center">
            <Link 
              href="/admin/posts/new"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Crear Primer Post
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Posts</h2>
            <p className="text-sm text-gray-500 mt-1">Total: {postsWithAuthors.length} posts</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {postsWithAuthors.map((post: any) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Link
                        href={`/admin/posts/${post.slug}`}
                        className="font-semibold text-lg hover:text-blue-600 transition-colors"
                      >
                        {post.title}
                      </Link>
                      {post.published ? (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                          Publicado
                        </span>
                      ) : (
                        <span className="border border-gray-300 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                          Borrador
                        </span>
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                      <span>Por: {post.author?.name || 'Sin autor'}</span>
                      <span>
                        Creado: {new Date(post.created_at).toLocaleDateString('es-ES')}
                      </span>
                      {post.published_at && (
                        <span>
                          Publicado: {new Date(post.published_at).toLocaleDateString('es-ES')}
                        </span>
                      )}
                      {post.category && (
                        <span className="text-blue-600">Categoría: {post.category}</span>
                      )}
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {post.tags.map((tag: string, index: number) => (
                          <span 
                            key={index} 
                            className="border border-gray-300 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link 
                      href={`/admin/posts/${post.slug}`}
                      className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    >
                      Editar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

