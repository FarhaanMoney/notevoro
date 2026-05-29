'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader, Copy, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hey! I'm your AI study companion. I can help you with:
      
• Explain complex concepts
• Generate study materials
• Answer homework questions
• Create summaries and flashcards
• Discuss topics in depth

What would you like to learn about today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `That's a great question! Here are some key points about "${input}":

**Main Concepts:**
- First key concept with explanation
- Second key concept with context
- Practical application examples

**Why This Matters:**
Understanding this will help you grasp more advanced topics. Feel free to ask for:
- Clarification on any point
- More examples
- A summary to review later

What else would you like to know?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="h-full flex flex-col bg-[rgb(var(--bg-primary))]">
      {/* Messages Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 p-6 md:p-8"
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xl lg:max-w-2xl ${message.role === 'user' ? 'flex-end' : 'flex-start'}`}>
                {/* Message Bubble */}
                <motion.div
                  className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-br-none'
                      : 'bg-[rgba(var(--bg-secondary),0.5)] border border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))] rounded-bl-none backdrop-blur-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </motion.div>

                {/* Message Actions (for assistant only) */}
                {message.role === 'assistant' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex gap-1.5 mt-2 text-[rgb(var(--text-tertiary))]"
                  >
                    <button
                      className="p-1.5 hover:bg-[rgba(var(--bg-secondary),0.5)] rounded transition-colors"
                      title="Copy message"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-green-500/10 rounded transition-colors text-green-600 dark:text-green-400"
                      title="Helpful"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-red-500/10 rounded transition-colors text-red-600 dark:text-red-400"
                      title="Not helpful"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="rounded-lg rounded-bl-none bg-[rgba(var(--bg-secondary),0.5)] border border-[rgb(var(--border-color))] px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Loader className="h-4 w-4 animate-spin text-[rgb(var(--accent-primary))]" />
                <span className="text-sm text-[rgb(var(--text-secondary))]">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Prompts */}
      {messages.length === 1 && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 md:px-8 pb-4 space-y-2"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-tertiary))]">
            Try asking
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              'Explain photosynthesis in simple terms',
              'Help me with calculus limits',
              'Create a study plan for Biology',
              'Summarize the American Revolution',
            ].map((prompt) => (
              <motion.button
                key={prompt}
                whileHover={{ scale: 1.02 }}
                onClick={() => setInput(prompt)}
                className="text-left px-3 py-2 rounded-lg text-xs text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] bg-[rgba(var(--bg-secondary),0.5)] hover:bg-[rgba(var(--bg-secondary),0.8)] border border-[rgb(var(--border-color))] transition-all"
              >
                {prompt}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 md:px-8 py-6 border-t border-[rgb(var(--border-color))]"
      >
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask me anything... (Shift + Enter for new line)"
            className="flex-1 rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] px-4 py-2.5 text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] outline-none transition-all backdrop-blur-sm hover:border-[rgb(var(--accent-primary))] focus:border-[rgb(var(--accent-primary))]"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
          >
            <Send className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
