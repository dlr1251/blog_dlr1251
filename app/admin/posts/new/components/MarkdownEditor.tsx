'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { uploadImage } from '@/lib/supabase-storage';
import '@uiw/react-md-editor/markdown-editor.css';

// Dynamically import MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

export interface AIComment {
  agentId: string;
  agentName: string;
  result: string;
  agentType: string;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  aiComments?: AIComment[];
  agentTabs?: Array<{ agentId: string; agentName: string; agentType: string; result: string }>;
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  disabled, 
  placeholder, 
  aiComments = [],
  agentTabs = []
}: MarkdownEditorProps) {
  const [view, setView] = useState<'write' | string>('write');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fix for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  type Tab = 
    | { id: string; label: string; type: 'write' }
    | { id: string; label: string; type: 'agent'; agent: { agentId: string; agentName: string; agentType: string; result: string } };

  const allTabs: Tab[] = [
    { id: 'write', label: 'Escribir', type: 'write' },
    ...agentTabs.map(agent => ({
      id: agent.agentId,
      label: agent.agentName,
      type: 'agent' as const,
      agent
    }))
  ];

  const currentTab = allTabs.find(tab => tab.id === view) || allTabs[0];
  const isWriteView = view === 'write';
  const isAgentTab = currentTab.type === 'agent';

  // Custom image upload handler for MDEditor
  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      const imageUrl = await uploadImage(file);
      return imageUrl;
    } catch (error: any) {
      throw new Error(`Error al subir imagen: ${error.message}`);
    }
  };

  if (!mounted) {
    return (
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <div className="h-[600px] bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Cargando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-2 sm:px-4 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
          {/* Tabs - scrollable on mobile */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {allTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors whitespace-nowrap flex-shrink-0 ${
                  view === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Fullscreen button */}
          {isWriteView && (
            <>
              <div className="h-6 w-px bg-gray-300 mx-1 sm:mx-2" />
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                disabled={disabled}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 flex-shrink-0"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? '⤓' : '⤢'}
              </button>
            </>
          )}
        </div>
        <div className="text-xs text-gray-500 ml-2 sm:ml-4 flex-shrink-0">
          {value.length} caracteres
        </div>
      </div>

      {/* Editor/Preview */}
      <div className={`${isFullscreen ? 'h-[calc(100vh-60px)]' : 'h-[600px]'} flex flex-col sm:flex-row`}>
        {isWriteView ? (
          // Write view - WYSIWYG editor
          <div className="flex-1 w-full overflow-hidden relative">
            {MDEditor && (
              <div className="h-full w-full">
                <MDEditor
                  value={value}
                  onChange={(val) => onChange(val || '')}
                  preview="edit"
                  hideToolbar={false}
                  visibleDragbar={false}
                  data-color-mode="light"
                  height={isFullscreen ? (typeof window !== 'undefined' ? window.innerHeight - 60 : 600) : 600}
                  textareaProps={{
                    placeholder: placeholder || 'Escribe tu post aquí en Markdown...\n\nPuedes crear tablas, insertar imágenes, usar formato, etc.',
                    disabled: disabled,
                  }}
                  onDrop={async (event) => {
                    event.preventDefault();
                    const files = Array.from(event.dataTransfer.files);
                    const imageFiles = files.filter(file => file.type.startsWith('image/'));
                    
                    for (const file of imageFiles) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert(`La imagen ${file.name} debe ser menor a 5MB`);
                        continue;
                      }
                      try {
                        const imageUrl = await handleImageUpload(file);
                        const imageMarkdown = `![${file.name}](${imageUrl})`;
                        onChange(value + '\n' + imageMarkdown + '\n');
                      } catch (error: any) {
                        alert(error.message);
                      }
                    }
                  }}
                  onPaste={async (event) => {
                    const items = event.clipboardData.items;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.startsWith('image/')) {
                        event.preventDefault();
                        const file = items[i].getAsFile();
                        if (file && file.size <= 5 * 1024 * 1024) {
                          try {
                            const imageUrl = await handleImageUpload(file);
                            const imageMarkdown = `![${file.name || 'imagen'}](${imageUrl})`;
                            onChange(value + '\n' + imageMarkdown + '\n');
                          } catch (error: any) {
                            alert(error.message);
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          // Agent output view (split view) - ALL agent tabs show split view
          // Vertical stack on mobile, horizontal on desktop
          <div className="flex flex-col sm:flex-row w-full h-full">
            <div className="flex-1 border-b sm:border-b-0 sm:border-r border-gray-200 overflow-y-auto bg-white min-w-0 h-1/2 sm:h-full">
              <div className="p-3 sm:p-4">
                {value ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {value}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-sm">El contenido aparecerá aquí...</p>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 min-w-0 h-1/2 sm:h-full">
              <div className="p-3 sm:p-4">
                {isAgentTab && currentTab.agent.result ? (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {currentTab.agent.agentName}
                          </h3>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {currentTab.agent.agentType}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {currentTab.agent.result}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-center py-8 text-sm">
                    {isAgentTab ? 'Ejecuta el agente para ver su análisis' : 'Selecciona un agente para ver su análisis'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
