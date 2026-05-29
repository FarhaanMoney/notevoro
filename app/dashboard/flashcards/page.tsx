'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

const deck: Flashcard[] = [
  { id: '1', front: 'What is spaced repetition?', back: 'A review method that spaces learning over time for better retention.' },
  { id: '2', front: 'Active recall is...', back: 'Actively retrieving information from memory instead of passively reviewing it.' },
  { id: '3', front: 'What does Feynman technique do?', back: 'It simplifies concepts by teaching them aloud in plain language.' },
];

export default function FlashcardsPage() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = useMemo(() => deck[index], [index]);
  const progress = useMemo(() => Math.round(((index + 1) / deck.length) * 100), [index]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(deck.length - 1, value + 1));
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1));
      if (event.key === ' ') {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Flashcards</p>
            <h1 className="text-3xl font-semibold text-[rgb(var(--text-primary))]">Train your recall in a calm space.</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
            {progress}% done
          </div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[rgb(var(--text-secondary))]">Current card</p>
                <p className="text-sm text-[rgb(var(--text-tertiary))]">Press space to flip / arrow keys to move</p>
              </div>
              <div className="rounded-full bg-[rgba(var(--bg-tertiary),0.95)] px-4 py-2 text-xs font-semibold text-[rgb(var(--text-primary))]">
                {index + 1}/{deck.length}
              </div>
            </div>
            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              whileTap={{ scale: 0.97 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -120) setIndex((value) => Math.min(deck.length - 1, value + 1));
                if (info.offset.x > 120) setIndex((value) => Math.max(0, value - 1));
              }}
              className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-primary),0.95)] p-10 shadow-[0_40px_80px_rgba(15,23,42,0.12)]"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">{flipped ? 'Answer' : 'Question'}</p>
              <p className="mt-4 text-3xl font-semibold leading-tight text-[rgb(var(--text-primary))]">{flipped ? current.back : current.front}</p>
            </motion.div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <button onClick={() => setFlipped((value) => !value)} className="rounded-3xl bg-[rgba(var(--accent-primary),0.15)] px-5 py-4 text-sm font-semibold text-[rgb(var(--accent-primary))] transition hover:bg-[rgba(var(--accent-primary),0.25)]">
            Flip card
          </button>
          <button onClick={() => setIndex((value) => Math.max(0, value - 1))} className="rounded-3xl border border-[rgb(var(--border-color))] px-5 py-4 text-sm text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))]">
            Previous
          </button>
          <button onClick={() => setIndex((value) => Math.min(deck.length - 1, value + 1))} className="rounded-3xl border border-[rgb(var(--border-color))] px-5 py-4 text-sm text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))]">
            Next
          </button>
        </div>
      </motion.section>
    </div>
  );
}
