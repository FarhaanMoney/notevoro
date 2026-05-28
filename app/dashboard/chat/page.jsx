'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Paperclip, Mic, Loader } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

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
      content: 'Hey there! I\'m your AI study companion. Ask me anything about your subjects, and I\'ll help you understand complex concepts, solve problems, or explain topics in detail.',
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
        content: `That's a great question about "${input}". Let me break this down for you...

**Key Points:**
1. First concept explanation
2. Second concept explanation
3. Practical example

Feel free to ask follow-up questions or request clarification on any part!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 md:mx-12 mt-8 mb-6 space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">AI Chat</h1>
          <p className="text-zinc-400">Ask me anything. I'm here to help you learn.</p>
        </motion.div>

        {/* Chat Container */}
        <div className="flex-1 flex flex-col mx-6 md:mx-12 gap-6 overflow-hidden">
          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto space-y-6 pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl px-6 py-4 ${
                      message.role === 'user'
                        ? 'rounded-br-none bg-gradient-to-r from-violet-500/30 to-cyan-500/30 border border-cyan-400/30 text-white'
                        : 'rounded-bl-none bg-white/5 border border-white/10 text-zinc-100'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="rounded-2xl rounded-bl-none bg-white/5 border border-white/10 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Loader className="h-4 w-4 animate-spin text-cyan-300" />
                    <span className="text-sm text-zinc-400">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-8 space-y-4"
          >
            <div className="flex gap-3">
              <button className="rounded-lg border border-white/10 bg-white/5 p-3 text-zinc-400 transition hover:bg-white/10">
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask me anything..."
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-cyan-400/50 focus:bg-white/10"
              />
              <button className="rounded-lg border border-white/10 bg-white/5 p-3 text-zinc-400 transition hover:bg-white/10">
                <Mic className="h-5 w-5" />
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-3 text-white font-semibold shadow-[0_20px_80px_rgba(59,130,246,0.25)] transition hover:brightness-110 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </motion.button>
            </div>
            <p className="text-xs text-zinc-500 text-center">
              Shift + Enter for new line • AI responses are always generated fresh
            </p>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
