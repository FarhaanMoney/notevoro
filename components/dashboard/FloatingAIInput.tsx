'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Mic, Sparkles } from 'lucide-react';

interface FloatingAIInputProps {
  onSubmit?: (message: string) => void;
}

export function FloatingAIInput({ onSubmit }: FloatingAIInputProps) {
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSubmit?.(message.trim());
    setMessage('');
    textareaRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-2xl px-2"
    >
      <div className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.86)] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[rgb(var(--text-primary))]">AI Assistant</p>
            <p className="text-xs text-[rgb(var(--text-tertiary))]">Use the command bar to ask for notes, quizzes, flashcards, or summaries.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.9)] text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]">
              <Paperclip className="h-4 w-4" />
            </button>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.9)] text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]">
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className={`mt-4 rounded-[28px] border ${focused ? 'border-[rgb(var(--accent-primary))]' : 'border-[rgb(var(--border-color))]'} bg-[rgba(var(--bg-primary),0.95)] p-3 transition-all`}>
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask something like, 'Summarize my notes on thermodynamics'"
              className="min-h-[48px] w-full resize-none border-0 bg-transparent p-0 text-sm leading-6 text-[rgb(var(--text-primary))] outline-none placeholder:text-[rgb(var(--text-tertiary))]"
            />
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[rgb(var(--text-tertiary))]">Shift + Enter for new line</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>AI-powered study prompts</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
