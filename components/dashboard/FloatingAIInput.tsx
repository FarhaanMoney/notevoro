'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Paperclip,
  Mic,
  Plus,
  Sparkles,
} from 'lucide-react';

interface FloatingAIInputProps {
  onSubmit?: (message: string) => void;
}

export function FloatingAIInput({ onSubmit }: FloatingAIInputProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (message.trim()) {
      onSubmit?.(message);
      setMessage('');
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const quickPrompts = [
    'Generate flashcards from my notes',
    'Create a study quiz',
    'Summarize this topic',
    'Explain this concept',
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4"
    >
      <div className="space-y-3">
        {/* Quick Prompts */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2"
          >
            {quickPrompts.map((prompt) => (
              <motion.button
                key={prompt}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setMessage(prompt);
                  textareaRef.current?.focus();
                }}
                className="text-left px-3 py-2 rounded-lg text-xs font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] bg-[rgba(var(--bg-tertiary),0.3)] hover:bg-[rgba(var(--bg-tertiary),0.6)] border border-[rgb(var(--border-color))] transition-all"
              >
                {prompt}
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Main Input */}
        <motion.div
          layout
          className="relative rounded-2xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] backdrop-blur-md shadow-lg transition-all"
          animate={{
            borderColor: isFocused ? 'rgb(var(--accent-primary))' : 'rgb(var(--border-color))',
          }}
        >
          {/* Glow effect on focus */}
          {isFocused && (
            <motion.div
              layoutId="ai-input-glow"
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 via-blue-500/5 to-cyan-500/0 pointer-events-none"
            />
          )}

          <div className="relative flex items-end gap-2 p-4">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setIsExpanded(e.target.value.length > 0);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI anything... Ask for notes, quiz, flashcards..."
              rows={isExpanded ? 3 : 1}
              className="flex-1 bg-transparent text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] text-sm resize-none outline-none"
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isExpanded && (
                <>
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--text-primary))] hover:border-[rgb(var(--accent-primary))] transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </motion.button>

                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] text-[rgb(var(--text-tertiary))] hover:text-[rgb(var(--text-primary))] hover:border-[rgb(var(--accent-primary))] transition-colors"
                    title="Voice input"
                  >
                    <Mic className="h-4 w-4" />
                  </motion.button>
                </>
              )}

              {/* Send Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={!message.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                title="Send message"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </div>

          {/* Footer hint */}
          {!isExpanded && (
            <div className="px-4 pb-2 flex items-center gap-2 text-xs text-[rgb(var(--text-tertiary))]">
              <Sparkles className="h-3 w-3" />
              <span>Shift + Enter for new line</span>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
