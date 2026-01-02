'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { AgentChatView } from './AgentChatView';
import { Maximize2, Minimize2, Link as LinkIcon } from 'lucide-react';

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

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

export function MarkdownEditor({
  value,
  onChange,
  disabled,
  placeholder,
  aiComments = [],
  agentTabs = [],
}: MarkdownEditorProps) {
  const [view, setView] = useState<'write' | string>('write');
  const [mounted, setMounted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [hasActiveLink, setHasActiveLink] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Fix for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fullscreen handling - using CSS modal instead of browser API
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Prevent body scroll when in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Create editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800 cursor-pointer',
        },
      }),
    ],
    editable: !disabled,
    content: mounted && value ? marked.parse(value) : '<p></p>',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (!isUpdating) {
        const html = editor.getHTML();
        const markdown = turndownService.turndown(html);
        onChange(markdown);
      }
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none px-4 py-3',
      },
    },
  });

  // Update editor when value prop changes externally
  useEffect(() => {
    if (editor && value !== undefined && !isUpdating) {
      const currentHtml = editor.getHTML();
      const currentMarkdown = turndownService.turndown(currentHtml);
      
      // Only update if the markdown is actually different
      if (currentMarkdown.trim() !== value.trim()) {
        setIsUpdating(true);
        try {
          const html = marked.parse(value);
          editor.commands.setContent(html);
        } catch (e) {
          console.error('Error parsing markdown:', e);
        }
        setIsUpdating(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  type Tab =
    | { id: string; label: string; type: 'write' }
    | { id: string; label: string; type: 'agent'; agent: { agentId: string; agentName: string; agentType: string; result: string } };

  const allTabs: Tab[] = [
    { id: 'write', label: 'Escribir', type: 'write' },
    ...agentTabs.map((agent) => ({
      id: agent.agentId,
      label: agent.agentName,
      type: 'agent' as const,
      agent,
    })),
  ];

  const currentTab = allTabs.find((tab) => tab.id === view) || allTabs[0];
  const isWriteView = view === 'write';
  const isAgentTab = currentTab.type === 'agent';

  // Handle implement changes from agent chat
  const handleImplementChanges = (agentContent: string) => {
    if (editor) {
      const currentMarkdown = turndownService.turndown(editor.getHTML());
      const newMarkdown = currentMarkdown + '\n\n' + agentContent;
      try {
        const html = marked.parse(newMarkdown);
        editor.commands.setContent(html);
        onChange(newMarkdown);
      } catch (e) {
        onChange(newMarkdown);
      }
    }
    setView('write');
  };

  // Handle link insertion/editing
  const handleLinkClick = useCallback(() => {
    if (!editor) return;
    
    const attrs = editor.getAttributes('link');
    const isActive = editor.isActive('link');
    
    setHasActiveLink(isActive);
    
    if (attrs.href) {
      // Editing existing link
      setLinkUrl(attrs.href);
    } else {
      // New link
      setLinkUrl('');
    }
    
    setShowLinkDialog(true);
  }, [editor]);

  const handleInsertLink = useCallback(() => {
    if (!editor || !linkUrl.trim()) return;

    const url = linkUrl.trim();
    // Add https:// if no protocol is present
    const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;

    editor.chain().focus().setLink({ href: finalUrl }).run();
    setShowLinkDialog(false);
    setLinkUrl('');
  }, [editor, linkUrl]);

  const handleRemoveLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
    setLinkUrl('');
  }, [editor]);

  const isLinkActive = editor?.isActive('link');

  if (!mounted) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="h-[600px] bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Cargando editor...</p>
        </div>
      </div>
    );
  }

  const editorContent = (
    <div 
      ref={editorContainerRef}
      className={`border border-gray-200 overflow-hidden bg-white shadow-sm flex flex-col ${isFullscreen ? 'rounded-none h-full' : 'rounded-lg'}`}
    >
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-2 sm:px-4 py-2 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
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
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {isWriteView && (
            <>
              <button
                type="button"
                onClick={handleLinkClick}
                className={`p-1.5 sm:p-2 rounded-md transition-colors flex-shrink-0 ${
                  isLinkActive
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
                aria-label="Insertar enlace"
                title="Insertar enlace"
              >
                <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="text-xs text-gray-500 hidden sm:inline">
                {value.length} caracteres
              </div>
            </>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors flex-shrink-0"
            aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className={`flex flex-col overflow-hidden ${isFullscreen ? 'flex-1 min-h-0' : 'h-[600px]'}`}>
        {isWriteView ? (
          // Write view - Tiptap WYSIWYG editor
          <div className="flex-1 overflow-y-auto">
            {mounted && editor && <EditorContent editor={editor} />}
          </div>
        ) : isAgentTab ? (
          // Agent chat view - Use key to force remount when switching agents
          <div className="h-full">
            <AgentChatView
              key={currentTab.agent.agentId}
              agentId={currentTab.agent.agentId}
              agentName={currentTab.agent.agentName}
              agentType={currentTab.agent.agentType}
              initialResult={currentTab.agent.result}
              onImplementChanges={handleImplementChanges}
            />
          </div>
        ) : null}
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLinkDialog(false);
              setLinkUrl('');
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {hasActiveLink ? 'Editar enlace' : 'Insertar enlace'}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="link-url" className="block text-sm font-medium text-gray-700 mb-2">
                  URL
                </label>
                <input
                  id="link-url"
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInsertLink();
                    } else if (e.key === 'Escape') {
                      setShowLinkDialog(false);
                      setLinkUrl('');
                    }
                  }}
                  placeholder="https://ejemplo.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                {hasActiveLink && (
                  <button
                    type="button"
                    onClick={handleRemoveLink}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                  >
                    Eliminar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkDialog(false);
                    setLinkUrl('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleInsertLink}
                  disabled={!linkUrl.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasActiveLink ? 'Actualizar' : 'Insertar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white">
        {editorContent}
      </div>
    );
  }

  return editorContent;
}
