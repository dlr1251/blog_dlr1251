'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TurndownService from 'turndown';
import { marked } from 'marked';
import { AgentChatView } from './AgentChatView';
import { Maximize2, Minimize2 } from 'lucide-react';

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
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Fix for hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fullscreen handling
  const toggleFullscreen = useCallback(() => {
    if (!editorContainerRef.current) return;

    if (!isFullscreen) {
      // Enter fullscreen
      if (editorContainerRef.current.requestFullscreen) {
        editorContainerRef.current.requestFullscreen();
      } else if ((editorContainerRef.current as any).webkitRequestFullscreen) {
        (editorContainerRef.current as any).webkitRequestFullscreen();
      } else if ((editorContainerRef.current as any).mozRequestFullScreen) {
        (editorContainerRef.current as any).mozRequestFullScreen();
      } else if ((editorContainerRef.current as any).msRequestFullscreen) {
        (editorContainerRef.current as any).msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  }, [isFullscreen]);

  // Listen to fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!document.fullscreenElement ||
        !!(document as any).webkitFullscreenElement ||
        !!(document as any).mozFullScreenElement ||
        !!(document as any).msFullscreenElement
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Create editor instance
  const editor = useEditor({
    extensions: [StarterKit],
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

  if (!mounted) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="h-[600px] bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Cargando editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={editorContainerRef}
      className={`border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm ${isFullscreen ? 'fixed inset-0 z-[9999] rounded-none' : ''}`}
    >
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
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {isWriteView && (
            <div className="text-xs text-gray-500 hidden sm:inline">
              {value.length} caracteres
            </div>
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
      <div className={`flex flex-col overflow-hidden ${isFullscreen ? 'h-[calc(100vh-57px)]' : 'h-[600px]'}`}>
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
    </div>
  );
}
