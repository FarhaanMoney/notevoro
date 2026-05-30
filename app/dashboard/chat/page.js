'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Upload, Mic, FileText, Copy, RefreshCcw, Volume2, Loader2 } from 'lucide-react';
import UpgradeModal from '@/components/UpgradeModal';
import { supabaseBrowser } from '@/lib/supabase/browser';

const suggestedPrompts = [
  'Explain Photosynthesis',
  'Create Flashcards from my Biology Notes',
  'Generate a Physics Quiz',
  'Summarize Chapter 5',
];

export default function ChatPage({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      console.log('Chat page: Loading chat history...');
      const response = await fetch('/api/chat', {
        credentials: 'include',
      });
      console.log('Chat page: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        if (data.messages && data.messages.length > 0) {
          setConversationId(data.messages[0].conversation_id);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setError(null);

    // Add user message to UI immediately
    const newUserMessage = { role: 'user', content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          conversationId 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          setShowUpgradeModal(true);
          setMessages((prev) => prev.slice(0, -1));
          setIsLoading(false);
          return;
        }
        throw new Error(errorData.error || 'Failed to send message');
      }

      const convId = response.headers.get('X-Conversation-ID');
      if (convId) {
        setConversationId(convId);
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      // Add empty AI message that will be filled with streaming content
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        aiResponse += chunk;

        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'assistant', content: aiResponse };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError(error.message);
      // Remove the empty AI message if error occurred
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (prompt) => {
    setInputValue(prompt);
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
  };

  const handleRegenerate = async () => {
    if (messages.length < 2 || isLoading) return;
    
    const lastUserMessage = messages[messages.length - 2];
    if (lastUserMessage.role === 'user') {
      setInputValue(lastUserMessage.content);
      setMessages((prev) => prev.slice(0, -1));
    }
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <h1 className="text-page-title text-gray-900">AI Chat</h1>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-2xl">
            <div className="h-24 w-24 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-purple-100 animate-pulse" />
              <MessageSquare className="h-12 w-12 text-purple-500 relative z-10" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Your Personal AI Tutor</h2>
            <p className="text-body text-gray-500 mb-8">
              Ask questions, generate notes, create quizzes, solve problems, and learn faster.
            </p>
            
            {/* Suggested Prompts */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 px-8 py-4 bg-white">
          <div className="flex gap-2 items-center bg-gray-50 rounded-2xl p-2 shadow-sm">
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Upload className="h-5 w-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Mic className="h-5 w-5 text-gray-500" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <FileText className="h-5 w-5 text-gray-500" />
            </Button>
            <Input
              placeholder="Ask anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0"
            />
            <Button onClick={handleSendMessage} disabled={isLoading} className="h-10 w-10 rounded-xl">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <h1 className="text-page-title text-gray-900">AI Chat</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        <div className="space-y-6 max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {message.role === 'user' ? (
                <div className="max-w-2xl rounded-2xl px-6 py-4 text-white" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                  <p className="text-body">{message.content}</p>
                </div>
              ) : (
                <div className="max-w-2xl">
                  <div className="premium-card p-6 mb-3">
                    <p className="text-body text-gray-700 mb-4 whitespace-pre-wrap">{message.content}</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="h-8" onClick={() => handleCopy(message.content)}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8" onClick={handleRegenerate}>
                        <RefreshCcw className="h-4 w-4 mr-1" />
                        Regenerate
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8">
                        <Volume2 className="h-4 w-4 mr-1" />
                        Listen
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="premium-card p-6">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                  <p className="text-sm text-gray-500">Thinking...</p>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-8 py-4 bg-white">
        <div className="flex gap-2 items-center bg-gray-50 rounded-2xl p-2 shadow-sm max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Upload className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <Mic className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <FileText className="h-5 w-5 text-gray-500" />
          </Button>
          <Input
            placeholder="Ask anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0"
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading} className="h-10 w-10 rounded-xl">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
        )}
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        feature="AI Chat"
      />
    </div>
  );
}
