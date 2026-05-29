'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, Download, Share2 } from 'lucide-react';

const toolbarActions = ['Summarize', 'Highlight', 'Generate Quiz', 'Create Flashcards'];

export default function NotesPage() {
  const [content, setContent] = useState('');
  const wordCount = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content]);

  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Smart Notes</p>
            <h1 className="text-3xl font-semibold text-[rgb(var(--text-primary))]">Write without the clutter.</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            {wordCount} words
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {toolbarActions.map((label) => (
            <button key={label} className="rounded-full border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] px-4 py-2 text-sm text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.95)]">
              {label}
            </button>
          ))}
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex items-center justify-between gap-4 pb-4">
          <div>
            <p className="text-sm font-medium text-[rgb(var(--text-primary))]">Biology study notes</p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Distraction-free writing with AI prompts.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[rgb(var(--text-secondary))]">
            <button className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] px-3 py-2 transition hover:border-[rgb(var(--accent-primary))]">
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] px-3 py-2 transition hover:border-[rgb(var(--accent-primary))]">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Start typing your notes here..."
          className="min-h-[56vh] w-full resize-none rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-primary),0.95)] p-6 text-sm leading-7 text-[rgb(var(--text-primary))] outline-none placeholder:text-[rgb(var(--text-tertiary))]"
        />
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.12 }} className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Automatic Summary', value: 'Turn notes into concise review paragraphs' },
          { label: 'Quick Insights', value: 'Highlight the most important facts instantly' },
          { label: 'Create Deck', value: 'Build smart flashcards from this note' },
        ].map((card) => (
          <div key={card.label} className="rounded-[28px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.75)] p-5 text-sm text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.95)]">
            <p className="font-semibold">{card.label}</p>
            <p className="mt-2 text-[rgb(var(--text-secondary))]">{card.value}</p>
          </div>
        ))}
      </motion.section>
    </div>
  );
}
