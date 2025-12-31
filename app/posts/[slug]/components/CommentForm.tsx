'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function CommentForm({ postId, parentId }: { postId: string; parentId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [formData, setFormData] = useState({
    authorName: '',
    authorEmail: '',
    content: '',
    honeypot: '',
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: String(postId),
          parentId: parentId || null,
          authorName: formData.authorName.trim(),
          authorEmail: formData.authorEmail.trim(),
          content: formData.content.trim(),
          isAnonymous,
          honeypot: formData.honeypot,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al enviar el comentario');
      }

      setSuccess(true);
      setFormData({ authorName: '', authorEmail: '', content: '', honeypot: '' });
      setIsAnonymous(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al enviar el comentario');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-3">
        <p className="text-sm text-green-700">
          Comentario enviado. Pendiente de aprobación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Honeypot */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            type="text"
            id="website"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={formData.honeypot}
            onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="anonymous"
            checked={isAnonymous}
            onCheckedChange={(checked) => setIsAnonymous(checked === true)}
            disabled={loading}
          />
          <Label
            htmlFor="anonymous"
            className="text-xs text-gray-600 cursor-pointer"
          >
            Anónimo
          </Label>
        </div>

        {!isAnonymous && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nombre *"
              value={formData.authorName}
              onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
              required={!isAnonymous}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
            />
            <input
              type="email"
              placeholder="Email *"
              value={formData.authorEmail}
              onChange={(e) => setFormData({ ...formData, authorEmail: e.target.value })}
              required={!isAnonymous}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
        )}

        <textarea
          placeholder="Escribe tu comentario..."
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          required
          disabled={loading}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500 resize-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando...' : parentId ? 'Responder' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
