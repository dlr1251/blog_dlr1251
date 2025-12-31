'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MarkdownEditor, type AIComment } from '../../new/components/MarkdownEditor';
import { AIAgentsPanel } from '../../new/components/AIAgentsPanel';

export function EditPostForm({ post }: { post: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: post.title || '',
    content: post.content || '',
    excerpt: post.excerpt || '',
    category: post.category || '',
    tags: post.tags?.join(', ') || '',
    published: post.published || false,
    scheduledPublishAt: post.published_at ? new Date(post.published_at).toISOString().slice(0, 16) : '',
  });
  const [generatingExcerpt, setGeneratingExcerpt] = useState(false);
  const [aiComments, setAiComments] = useState<AIComment[]>([]);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [agentTabs, setAgentTabs] = useState<Array<{ agentId: string; agentName: string; agentType: string; result: string }>>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [];

      // Determine published_at based on scheduled time or immediate publish
      let publishedAt = null;
      if (formData.published) {
        if (formData.scheduledPublishAt) {
          publishedAt = new Date(formData.scheduledPublishAt).toISOString();
        } else if (!post.published_at) {
          // Only set to now if it wasn't already published
          publishedAt = new Date().toISOString();
        } else {
          // Keep existing published_at
          publishedAt = post.published_at;
        }
      }

      const response = await fetch(`/api/posts/${post.slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          category: formData.category || null,
          tags: tagsArray,
          published: formData.published,
          published_at: publishedAt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar el post');
      }

      const updatedPost = await response.json();
      router.push('/admin/posts');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el post');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este post? Esta acción no se puede deshacer.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.slug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el post');
      }

      router.push('/admin/posts');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el post');
      setLoading(false);
    }
  };

  const handleGenerateExcerpt = async () => {
    if (!formData.content.trim()) {
      setError('Escribe contenido primero para generar un resumen');
      return;
    }

    setGeneratingExcerpt(true);
    setError('');

    try {
      const response = await fetch('/api/posts/generate-excerpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: formData.content,
          title: formData.title,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al generar resumen');
      }

      const data = await response.json();
      setFormData({ ...formData, excerpt: data.excerpt });
    } catch (err: any) {
      setError(err.message || 'Error al generar resumen');
    } finally {
      setGeneratingExcerpt(false);
    }
  };

  const handleAgentResult = (agentId: string, agentName: string, agentType: string, result: string) => {
    // Agregar o actualizar el tab del agente
    setAgentTabs((prev) => {
      const existing = prev.findIndex(tab => tab.agentId === agentId);
      const newTab = { agentId, agentName, agentType, result };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newTab;
        return updated;
      }
      
      return [...prev, newTab];
    });

    // También mantener en aiComments para compatibilidad
    setAiComments((prev) => {
      const existing = prev.findIndex(c => c.agentId === agentId);
      const newComment = { agentId, agentName, agentType, result };
      
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newComment;
        return updated;
      }
      
      return [...prev, newComment];
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editar Post</h1>
          <p className="text-gray-600 mt-2">Edita el contenido de tu post</p>
        </div>
        <Link 
          href="/admin/posts"
          className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Volver a Posts
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Información Básica</h2>
            <p className="text-sm text-gray-500 mt-1">Datos principales del post</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Título *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={loading}
                placeholder="Título del post"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-900"
              />
            </div>

            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                {showOptionalFields ? '▼' : '▶'} Campos opcionales
              </button>
            </div>

            {showOptionalFields && (
              <div className="space-y-4 pt-2 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="excerpt" className="block text-xs font-medium text-gray-600">
                      Resumen
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateExcerpt}
                      disabled={loading || generatingExcerpt || !formData.content.trim()}
                      className="px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {generatingExcerpt ? 'Generando...' : '✨ Grok'}
                    </button>
                  </div>
                  <textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    disabled={loading}
                    placeholder="Breve descripción del post"
                    rows={2}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="category" className="block text-xs font-medium text-gray-600">
                      Categoría
                    </label>
                    <input
                      id="category"
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      disabled={loading}
                      placeholder="Ej: Tecnología, Derecho"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="tags" className="block text-xs font-medium text-gray-600">
                      Tags
                    </label>
                    <input
                      id="tags"
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      disabled={loading}
                      placeholder="tag1, tag2, tag3"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Contenido</h2>
            <p className="text-sm text-gray-500 mt-1">Escribe el contenido del post en Markdown</p>
          </div>
          
          {/* AI Agents Panel */}
          <div className="mb-6">
            <AIAgentsPanel content={formData.content} onResult={handleAgentResult} />
          </div>

          {/* Markdown Editor */}
          <div className="space-y-2">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              Contenido *
            </label>
            <MarkdownEditor
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value })}
              disabled={loading}
              placeholder="Escribe tu post aquí en Markdown..."
              aiComments={aiComments}
              agentTabs={agentTabs}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Publicación</h2>
            <p className="text-sm text-gray-500 mt-1">Configura el estado de publicación</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <label htmlFor="published" className="text-sm font-medium text-gray-700 cursor-pointer">
                Publicar
              </label>
            </div>
            {formData.published && (
              <div className="space-y-2 pl-6 border-l-2 border-gray-200">
                <label htmlFor="scheduledPublishAt" className="block text-sm font-medium text-gray-700">
                  Programar publicación (opcional)
                </label>
                <input
                  type="datetime-local"
                  id="scheduledPublishAt"
                  value={formData.scheduledPublishAt}
                  onChange={(e) => setFormData({ ...formData, scheduledPublishAt: e.target.value })}
                  disabled={loading}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed bg-white text-gray-900"
                />
                {formData.scheduledPublishAt ? (
                  <p className="text-sm text-gray-500">
                    El post se publicará el {new Date(formData.scheduledPublishAt).toLocaleString('es-ES')}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    {post.published_at 
                      ? `El post ya fue publicado el ${new Date(post.published_at).toLocaleString('es-ES')}`
                      : 'El post será publicado inmediatamente al guardar.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Eliminar Post
          </button>
          <div className="flex gap-4">
            <Link 
              href="/admin/posts"
              className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </Link>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
