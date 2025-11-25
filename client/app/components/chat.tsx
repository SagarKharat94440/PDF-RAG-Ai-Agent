'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as React from 'react';

interface Doc {
  pageContent?: string;
  metadata?: {
    pageNumber?: number;
    source?: string;
    score?: number;
    loc?: {
      pageNumber?: number;
      lines?: {
        from?: number;
        to?: number;
      };
    };
    pdf?: any;
  };
}

interface IMessage {
  role: 'assistant' | 'user';
  content?: string;
  documents?: Doc[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

const ChatComponent: React.FC = () => {
  const [message, setMessage] = React.useState('');
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendChatMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setMessage('');
    setIsSending(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      // Handle response with message and docs structure
      const assistantMessage: IMessage = {
        role: 'assistant',
        content: data.message || data.content || 'No response',
        documents: data.docs || data.documents || []
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-900">
        <h1 className="text-xl font-semibold text-white">Chat with PDF</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-gradient-to-b from-gray-900 to-gray-950">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex w-full ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[65%] p-4 rounded-2xl shadow-md text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-line">{msg.content}</p>

              {msg.role === 'assistant' && msg.documents && msg.documents.length > 0 && (
                <details className="mt-4 text-xs bg-gray-800 p-3 rounded-lg border border-gray-600">
                  <summary className="cursor-pointer font-medium text-blue-400 hover:text-blue-300">
                    📚 Referenced Documents ({msg.documents.length})
                  </summary>
                  <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
                    {msg.documents?.map((doc, i) => (
                      <div key={i} className="bg-gray-900 p-3 rounded border border-gray-700">
                        <div className="flex items-center gap-2 mb-2 text-gray-400">
                          {(doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber) && (
                            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                              Page {doc.metadata?.loc?.pageNumber || doc.metadata?.pageNumber}
                            </span>
                          )}
                          {doc.metadata?.score && (
                            <span className="text-xs bg-blue-900 px-2 py-1 rounded">
                              Score: {doc.metadata.score.toFixed(3)}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">
                          {doc.pageContent?.slice(0, 200)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-900">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 bg-gray-800 text-white border-gray-700 placeholder:text-gray-400 focus:border-blue-500"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSendChatMessage();
              }
            }}
          />
          <Button
            onClick={handleSendChatMessage}
            disabled={!message.trim() || isSending}
            className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {isSending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400 text-center p-2">Error: {error}</p>}
    </div>
  );
};

export default ChatComponent;
