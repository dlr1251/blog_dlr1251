import { getCurrentUser } from '@/lib/supabase-auth';
import { createServiceRoleClient } from '@/lib/supabase-auth';
import Link from 'next/link';

export default async function AdminDashboard() {
  const user = await getCurrentUser();
  
  if (!user) {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">No tienes acceso a esta página.</p>
        <p className="text-gray-600 mt-2">Por favor, inicia sesión como administrador.</p>
        <a href="/admin/login" className="text-blue-600 hover:underline mt-4 inline-block">
          Ir a login
        </a>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">No tienes permisos de administrador.</p>
        <p className="text-gray-600 mt-2">Tu rol actual es: {user.role}</p>
      </div>
    );
  }

  const supabase = createServiceRoleClient();

  const [
    { count: postsCount },
    { count: publishedPostsCount },
    { count: commentsCount },
    { count: pendingCommentsCount },
    { count: agentsCount },
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('published', true),
    supabase.from('comments').select('*', { count: 'exact', head: true }),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('approved', false),
    supabase.from('ai_agents').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">Bienvenido al panel de administración</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Total Posts</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">{postsCount || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            {publishedPostsCount || 0} publicados
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Comentarios</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">{commentsCount || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            {pendingCommentsCount || 0} pendientes de aprobación
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Agentes IA</h3>
          </div>
          <div className="text-2xl font-bold text-gray-900">{agentsCount || 0}</div>
          <p className="text-xs text-gray-500 mt-1">
            Configurados y listos
          </p>
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Acciones Rápidas</h3>
          </div>
          <div className="space-y-2">
            <Link 
              href="/admin/posts/new"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-4 rounded-md text-sm font-medium transition-colors"
            >
              Nuevo Post
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Posts Recientes</h2>
            <p className="text-sm text-gray-500 mt-1">Últimos posts creados</p>
          </div>
          <RecentPosts />
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Comentarios Pendientes</h2>
            <p className="text-sm text-gray-500 mt-1">Comentarios que requieren aprobación</p>
          </div>
          <PendingComments />
        </div>
      </div>
    </div>
  );
}

async function RecentPosts() {
  const supabase = createServiceRoleClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!posts || posts.length === 0) {
    return <p className="text-sm text-gray-500">No hay posts aún</p>;
  }

  // Get author profiles separately since author_id references auth.users, not user_profiles
  const postsWithAuthors = await Promise.all(
    posts.map(async (post: any) => {
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
    <div className="space-y-2">
      {postsWithAuthors.map((post: any) => (
        <div
          key={post.id}
          className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <Link
                href={`/admin/posts/${post.slug}`}
                className="block"
              >
                <p className="font-medium text-sm text-gray-900 hover:text-blue-600 transition-colors">
                  {post.title}
                </p>
              </Link>
              <p className="text-xs text-gray-500 mt-1">
                {post.published ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Publicado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    Borrador
                  </span>
                )}
                {' • '}
                {post.author?.name || 'Sin autor'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {post.published && (
                <Link
                  href={`/posts/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  title="Ver en vivo"
                >
                  👁️ Ver
                </Link>
              )}
              <Link
                href={`/admin/posts/${post.slug}`}
                className="text-gray-600 hover:text-gray-700 text-xs font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                title="Editar"
              >
                Editar
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function PendingComments() {
  const supabase = createServiceRoleClient();
  const { data: comments } = await supabase
    .from('comments')
    .select(`
      *,
      post:posts(id, title, slug)
    `)
    .eq('approved', false)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!comments || comments.length === 0) {
    return <p className="text-sm text-gray-500">No hay comentarios pendientes</p>;
  }

  return (
    <div className="space-y-2">
      {comments.map((comment: any) => (
        <Link
          key={comment.id}
          href={`/admin/comments?postId=${comment.post_id}`}
          className="block p-2 rounded hover:bg-gray-50"
        >
          <p className="font-medium text-sm">{comment.author_name}</p>
          <p className="text-xs text-gray-500 truncate">{comment.content}</p>
          <p className="text-xs text-gray-400 mt-1">En: {comment.post?.title}</p>
        </Link>
      ))}
    </div>
  );
}
