'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send } from 'lucide-react';
import EmptyState from '@/components/layout/EmptyState';

export default function ChatPage({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    // TODO: Implement chat functionality
    console.log('Send message:', inputValue);
    setInputValue('');
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-semibold text-foreground">AI Chat</h1>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={MessageSquare}
            title="Start a conversation"
            subtitle="Ask anything about your studies and get instant AI-powered answers."
            buttonText=""
            onButtonClick={() => {}}
          />
        </div>

        {/* Input */}
        <div className="border-t border-border px-8 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ask anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-semibold text-foreground">AI Chat</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Chat messages will go here */}
      </div>

      {/* Input */}
      <div className="border-t border-border px-8 py-4">
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button onClick={handleSendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
