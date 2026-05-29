'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Copy, Loader, MessageCircle, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const pinnedChats = [
  { title: 'Physics Concept Review', subtitle: 'Last used 18m ago' },
  { title: 'Exam prep plan', subtitle: 'Last used yesterday' },
  { title: 'Biology summary', subtitle: 'Last used 2 days ago' },
];

const suggestedPrompts = [
  'Explain photosynthesis in one paragraph',
  'Make 5 flashcards for equations',
  'Summarize my study plan for tomorrow',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ready to study? Ask me anything and I’ll turn it into notes, flashcards, or a review plan.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMessages((current) => [...current, { id: `${Date.now()}-user`, role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: `I’ve got that. Here’s a quick breakdown for: ${text}

- Key idea 1
- Key idea 2
- Quick action you can take next`,
        },
      ]);
      setLoading(false);
    }, 1400);
  };

  const history = useMemo(
    () => 
      messages.filter((message) => message.role === 'user').slice(-3).map((message) => message.content),
    [messages]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-4 lg:block">
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Chats</p>
            <h2 className="mt-2 text-lg font-semibold text-[rgb(var(--text-primary))]">Pinned conversations</h2>
          </div>
          <div className="space-y-3">
            {pinnedChats.map((chat) => (
              <button key={chat.title} className="w-full rounded-3xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] p-4 text-left transition hover:border-[rgb(var(--accent-primary))]">
                <p className="font-semibold text-[rgb(var(--text-primary))]">{chat.title}</p>
                <p className="text-sm text-[rgb(var(--text-secondary))]">{chat.subtitle}</p>
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <div className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">AI Chat</p>
              <h1 className="text-2xl font-semibold text-[rgb(var(--text-primary))]">Ask your study coach</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
              <MessageCircle className="h-4 w-4 text-cyan-400" />
              Quick responses
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => setInput(prompt)}
                className="rounded-full border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.75)] px-4 py-2 text-xs text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.95)]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollRef} className="space-y-4 overflow-y-auto rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.75)] p-5 max-h-[calc(100vh-360px)]">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className={`max-w-3xl ${message.role === 'user' ? 'ml-auto' : ''}`}>
                <div className={`rounded-3xl p-5 shadow-sm ${message.role === 'user' ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white' : 'bg-[rgba(var(--bg-primary),0.95)] border border-[rgb(var(--border-color))] text-[rgb(var(--text-primary))]'}`}>
                  <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                </div>
                {message.role === 'assistant' && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
                    <button className="rounded-full border border-[rgb(var(--border-color))] px-3 py-2 transition hover:border-[rgb(var(--accent-primary))]">Copy</button>
                    <button className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border-color))] px-3 py-2 transition hover:border-emerald-400"><ThumbsUp className="h-3.5 w-3.5" /> Helpful</button>
                    <button className="inline-flex items-center gap-1 rounded-full border border-[rgb(var(--border-color))] px-3 py-2 transition hover:border-rose-400"><ThumbsDown className="h-3.5 w-3.5" /> Not helpful</button>
                  </div>
                )}
              </motion.div>
            ))}
            {loading && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
                <div className="inline-flex items-center gap-3 rounded-3xl bg-[rgba(var(--bg-primary),0.95)] border border-[rgb(var(--border-color))] p-4 text-[rgb(var(--text-secondary))]">
                  <Loader className="h-4 w-4 animate-spin text-[rgb(var(--accent-primary))]" />
                  Thinking...
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
              placeholder="Type your question here..."
              className="min-h-[56px] w-full resize-none rounded-3xl border border-[rgb(var(--border-color))] bg-transparent px-4 py-3 text-sm text-[rgb(var(--text-primary))] outline-none placeholder:text-[rgb(var(--text-tertiary))]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="inline-flex h-12 items-center justify-center rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
