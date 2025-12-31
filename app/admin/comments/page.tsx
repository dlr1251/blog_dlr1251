import { getCurrentUser } from '@/lib/supabase-auth';
import { createServiceRoleClient } from '@/lib/supabase-auth';
import Link from 'next/link';
import { ApproveButton } from './components/ApproveButton';

export default async function CommentsPage() {
  const user = await getCurrentUser();
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="p-6">
        <p className="text-red-600 font-semibold">No tienes acceso a esta página.</p>
      </div>
    );
  }

  const supabase = createServiceRoleClient();
  const { data: comments, error } = await supabase
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  // Get posts separately
  const postIds = [...new Set((comments || []).map((c: any) => c.post_id))];
  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, slug')
    .in('id', postIds);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Comentarios</h1>
          <p className="text-gray-600 mt-2">Gestiona todos los comentarios del blog</p>
        </div>
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <p className="text-red-600">Error al cargar los comentarios: {String(error)}</p>
        </div>
      </div>
    );
  }

  const postsMap = new Map((posts || []).map((p: any) => [p.id, p]));
  const commentsWithPosts = (comments || []).map((comment: any) => ({
    ...comment,
    post: postsMap.get(comment.post_id),
  }));

  const pendingComments = commentsWithPosts.filter((c: any) => !c.approved);
  const approvedComments = commentsWithPosts.filter((c: any) => c.approved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Comentarios</h1>
        <p className="text-gray-600 mt-2">Gestiona todos los comentarios del blog</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Pendientes de Aprobación</h2>
              <p className="text-sm text-gray-500 mt-1">{pendingComments.length} comentarios</p>
            </div>
            <div className="p-6">
              {pendingComments.length === 0 ? (
                <p className="text-sm text-gray-500">No hay comentarios pendientes</p>
              ) : (
                <div className="space-y-4">
                  {pendingComments.map((comment: any) => (
                    <CommentCard key={comment.id} comment={comment} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Comentarios Aprobados</h2>
              <p className="text-sm text-gray-500 mt-1">{approvedComments.length} comentarios</p>
            </div>
            <div className="p-6">
              {approvedComments.length === 0 ? (
                <p className="text-sm text-gray-500">No hay comentarios aprobados</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {approvedComments.map((comment: any) => (
                    <CommentCard key={comment.id} comment={comment} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}

function CommentCard({ comment }: { comment: any }) {
  return (
    <div className="p-4 border rounded-lg space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm">{comment.author_name}</span>
            <span className="text-xs text-gray-500">{comment.author_email}</span>
            {comment.approved ? (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                Aprobado
              </span>
            ) : (
              <span className="border border-gray-300 text-gray-700 text-xs font-medium px-2 py-1 rounded">
                Pendiente
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
          {comment.post && (
            <Link
              href={`/posts/${comment.post.slug}`}
              className="text-xs text-blue-600 hover:underline"
            >
              En: {comment.post.title}
            </Link>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {new Date(comment.created_at).toLocaleString('es-ES')}
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          {!comment.approved && (
            <ApproveButton commentId={comment.id} />
          )}
        </div>
      </div>
    </div>
  );
}


