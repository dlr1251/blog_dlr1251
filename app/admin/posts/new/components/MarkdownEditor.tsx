'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MarkdownEditor({ value, onChange, disabled, placeholder }: MarkdownEditorProps) {
  const [view, setView] = useState<'edit' | 'preview' | 'split'>('split');

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView('edit')}
            className={`px-3 py-1 text-sm font-medium rounded ${
              view === 'edit'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setView('preview')}
            className={`px-3 py-1 text-sm font-medium rounded ${
              view === 'preview'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Vista Previa
          </button>
          <button
            type="button"
            onClick={() => setView('split')}
            className={`px-3 py-1 text-sm font-medium rounded ${
              view === 'split'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Dividido
          </button>
        </div>
        <div className="text-xs text-gray-500">
          {value.length} caracteres
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex h-[600px]">
        {(view === 'edit' || view === 'split') && (
          <div className={view === 'split' ? 'w-1/2 border-r border-gray-200' : 'w-full'}>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              placeholder={placeholder || 'Escribe tu post aquí en Markdown...'}
              className="w-full h-full px-4 py-3 border-0 focus:outline-none focus:ring-0 font-mono text-sm bg-white text-gray-900 resize-none"
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace' }}
            />
          </div>
        )}
        {(view === 'preview' || view === 'split') && (
          <div className={`${view === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto bg-white p-4`}>
            {value ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-gray-400 italic">La vista previa aparecerá aquí...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

