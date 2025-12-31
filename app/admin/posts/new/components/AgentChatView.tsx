'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'agent' | 'user';
  content: string;
  timestamp: Date;
}

interface AgentChatViewProps {
  agentId: string;
  agentName: string;
  agentType: string;
  initialResult: string;
  onImplementChanges: (content: string) => void;
}

export function AgentChatView({
  agentId,
  agentName,
  agentType,
  initialResult,
  onImplementChanges,
}: AgentChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'agent',
      content: initialResult,
      timestamp: new Date(),
    },
  ]);
  const [userMessage, setUserMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!userMessage.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setUserMessage('');
    setLoading(true);

    try {
      // For now, we'll send the entire conversation history as context
      // The API will need to be updated to handle this properly
      const conversationHistory = [...messages, userMsg]
        .map((msg) => `${msg.role === 'agent' ? 'Assistant' : 'User'}: ${msg.content}`)
        .join('\n\n');

      const response = await fetch(`/api/ai-agents/${agentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: conversationHistory,
          context: {
            conversationMode: true,
            originalAgentType: agentType,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Error al obtener respuesta del agente');
      }

      const data = await response.json();

      if (data.success && data.result) {
        const agentMsg: Message = {
          role: 'agent',
          content: data.result,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      // Show error message to user
      const errorMsg: Message = {
        role: 'agent',
        content: `Error: ${error.message || 'No se pudo obtener respuesta del agente'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleImplementChanges = () => {
    // Use the latest agent message as the content to implement
    const latestAgentMessage = [...messages].reverse().find((msg) => msg.role === 'agent');
    if (latestAgentMessage) {
      onImplementChanges(latestAgentMessage.content);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [userMessage]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - Grok style */}
      <div className="border-b border-gray-200/80 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 flex-shrink-0" />
              <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{agentName}</h3>
            </div>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md font-medium flex-shrink-0">
              {agentType}
            </span>
          </div>
          <Button
            onClick={handleImplementChanges}
            size="sm"
            variant="outline"
            className="text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 h-7 sm:h-8 flex-shrink-0 border-gray-300 hover:bg-gray-50"
            disabled={messages.length === 0}
          >
            <span className="hidden sm:inline">Implementar</span>
            <span className="sm:hidden">Aplicar</span>
          </Button>
        </div>
      </div>

      {/* Messages - Grok style chat */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}
            >
              <div className={`flex gap-3 max-w-[85%] sm:max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-gray-900 text-white order-2'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {message.role === 'user' ? (
                    <span className="text-xs font-medium">U</span>
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                </div>
                
                {/* Message bubble */}
                <div
                  className={`rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-50 text-gray-900 border border-gray-200/50'
                  }`}
                >
                  {message.role === 'agent' ? (
                    <div className="prose prose-sm max-w-none prose-headings:mt-0 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-gray-900 prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:border prose-pre:border-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="flex gap-3 max-w-[85%] sm:max-w-[80%]">
                <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="bg-gray-50 border border-gray-200/50 rounded-2xl px-4 py-2.5 sm:px-5 sm:py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input - Grok style */}
      <div className="border-t border-gray-200/80 bg-white px-3 sm:px-4 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 sm:gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={userMessage}
                onChange={(e) => {
                  setUserMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Escribe tu mensaje..."
                rows={1}
                className="w-full px-4 py-2.5 sm:px-5 sm:py-3 text-sm sm:text-base border border-gray-300 bg-white text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={loading || !userMessage.trim()}
              size="default"
              className="px-4 sm:px-5 py-2.5 sm:py-3 h-auto bg-gray-900 hover:bg-gray-800 text-white rounded-2xl flex-shrink-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              aria-label="Enviar mensaje"
            >
              <Send className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">Presiona Enter para enviar, Shift+Enter para nueva línea</p>
        </div>
      </div>
    </div>
  );
}

