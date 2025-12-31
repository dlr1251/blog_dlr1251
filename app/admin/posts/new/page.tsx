'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MarkdownEditor, type AIComment } from './components/MarkdownEditor';
import { AIAgentsPanel } from './components/AIAgentsPanel';
import { PublishOptions } from './components/PublishOptions';

const AUTOSAVE_KEY = 'blog_draft_new_post';

export default function NewPostPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    tags: '',
    published: false,
    scheduledPublishAt: '',
  });
  const autosaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [generatingExcerpt, setGeneratingExcerpt] = useState(false);
  const [aiComments, setAiComments] = useState<AIComment[]>([]);
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDraft = localStorage.getItem(AUTOSAVE_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setFormData(draft);
        } catch (e) {
          console.error('Error loading draft:', e);
        }
      }
    }
  }, []);

  // Autosave to localStorage every minute
  useEffect(() => {
    if (typeof window !== 'undefined') {
      autosaveIntervalRef.current = setInterval(() => {
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(formData));
      }, 60000); // 60 seconds

      return () => {
        if (autosaveIntervalRef.current) {
          clearInterval(autosaveIntervalRef.current);
        }
      };
    }
  }, [formData]);

  // Clear autosave on successful save
  const clearAutosave = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTOSAVE_KEY);
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

      // Determine published_at based on scheduled time or immediate publish
      let publishedAt = null;
      let shouldPublish = formData.published;
      
      if (formData.scheduledPublishAt) {
        publishedAt = new Date(formData.scheduledPublishAt).toISOString();
        shouldPublish = true; // Scheduled posts should be marked as published
      } else if (formData.published) {
        publishedAt = new Date().toISOString();
        shouldPublish = true;
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          excerpt: formData.excerpt,
          category: formData.category || null,
          tags: tagsArray,
          published: shouldPublish,
          published_at: publishedAt,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear el post');
      }

      const post = await response.json();
      clearAutosave();
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Error al crear el post');
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

  const [agentTabs, setAgentTabs] = useState<Array<{ agentId: string; agentName: string; agentType: string; result: string }>>([]);

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
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Nuevo Post</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Crea un nuevo post para tu blog</p>
        </div>
        <Link 
          href="/admin"
          className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors w-full sm:w-auto text-center"
        >
          Volver al Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-6 shadow-soft">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Información Básica</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Datos principales del post</p>
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
                className="w-full px-3 py-2 border border-gray-200 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
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
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
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
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
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
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 bg-white text-gray-900 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-6 shadow-soft">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Contenido</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Escribe el contenido del post en Markdown</p>
          </div>
          
          {/* AI Agents Panel */}
          <div className="mb-4 sm:mb-6">
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

        <div className="bg-white rounded-lg border p-4 sm:p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Publicación</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Elige cómo guardar el post</p>
          </div>
          <PublishOptions
            published={formData.published}
            scheduledPublishAt={formData.scheduledPublishAt}
            onPublishedChange={(published) => setFormData({ ...formData, published })}
            onScheduledChange={(scheduledPublishAt) => {
              // Only set published based on scheduledPublishAt if we're in schedule mode
              // Otherwise, let onPublishedChange handle it
              setFormData((prev) => ({
                ...prev,
                scheduledPublishAt,
                published: scheduledPublishAt ? true : prev.published
              }));
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-4">
          <Link 
            href="/admin"
            className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors text-center w-full sm:w-auto"
          >
            Cancelar
          </Link>
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {loading ? 'Guardando...' : 'Guardar Post'}
          </button>
        </div>
      </form>
    </div>
  );
}

