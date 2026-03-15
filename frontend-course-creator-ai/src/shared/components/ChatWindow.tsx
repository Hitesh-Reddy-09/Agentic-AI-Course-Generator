import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/shared/types';

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  quickPrompts?: string[];
  sourceContext?: string;
}

export function ChatWindow({ messages, onSend, isLoading, placeholder = 'Type a message...', quickPrompts, sourceContext }: ChatWindowProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput('');
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Start a conversation</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'flex animate-slide-up-fade',
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div className={cn(
              'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : 'bg-muted text-foreground rounded-bl-md'
            )}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        {sourceContext && (
          <div className="rounded-lg border border-border bg-muted/50 p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Source Context</p>
            <p className="text-xs text-muted-foreground">{sourceContext}</p>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      {quickPrompts && quickPrompts.length > 0 && messages.length === 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSend(prompt)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
