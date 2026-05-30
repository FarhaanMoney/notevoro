'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Upload, Mic, FileText, Copy, RefreshCcw, Volume2 } from 'lucide-react';

const suggestedPrompts = [
  'Explain Photosynthesis',
  'Create Flashcards from my Biology Notes',
  'Generate a Physics Quiz',
  'Summarize Chapter 5',
];

export default function ChatPage({ user }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    // TODO: Implement chat functionality
    console.log('Send message:', inputValue);
    setInputValue('');
  };

  const handlePromptClick = (prompt) => {
    setInputValue(prompt);
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
            <Button onClick={handleSendMessage} className="h-10 w-10 rounded-xl">
              <Send className="h-5 w-5" />
            </Button>
          </div>
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
        {/* Chat messages will go here */}
        <div className="space-y-6">
          {/* User Message Example */}
          <div className="flex justify-end">
            <div className="max-w-2xl rounded-2xl px-6 py-4 text-white" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
              <p className="text-body">Explain photosynthesis</p>
            </div>
          </div>

          {/* AI Message Example */}
          <div className="flex justify-start">
            <div className="max-w-2xl">
              <div className="premium-card p-6 mb-3">
                <p className="text-body text-gray-700 mb-4">
                  Photosynthesis is the process by which plants convert light energy into chemical energy. During this process, plants use sunlight, water, and carbon dioxide to produce glucose and oxygen.
                </p>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8">
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8">
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
          <Button onClick={handleSendMessage} className="h-10 w-10 rounded-xl">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
