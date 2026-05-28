'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, RotateCw, Plus, Loader } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  mastered: boolean;
}

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([
    { id: '1', front: 'What is photosynthesis?', back: 'The process by which plants convert sunlight into chemical energy to fuel their growth.', difficulty: 'medium', mastered: false },
    { id: '2', front: 'Define mitochondria', back: 'The powerhouse of the cell, responsible for producing ATP through cellular respiration.', difficulty: 'easy', mastered: false },
    { id: '3', front: 'What is DNA?', back: 'Deoxyribonucleic acid - the molecule that carries genetic instructions for life.', difficulty: 'easy', mastered: false },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [confidence, setConfidence] = useState<'easy' | 'medium' | 'hard' | null>(null);

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setConfidence(null);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
      setConfidence(null);
    }
  };

  const handleMastered = (level: 'easy' | 'medium' | 'hard') => {
    setConfidence(level);
    setCards((prev) =>
      prev.map((card, idx) =>
        idx === currentIndex ? { ...card, mastered: true, difficulty: level } : card
      )
    );
    setTimeout(handleNext, 600);
  };

  const masteredCount = cards.filter((card) => card.mastered).length;

  return (
    <div className="min-h-screen w-full px-6 md:px-12 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">Flashcards</h1>
          <p className="text-zinc-400">Master your vocabulary with spaced repetition</p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Progress</p>
            <p className="text-sm text-zinc-400">{masteredCount} / {cards.length}</p>
          </div>
          <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${(masteredCount / cards.length) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </motion.div>

        {/* Main Flashcard Area */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-8 py-12"
        >
          {/* Flashcard */}
          <div className="w-full max-w-2xl h-80">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
                onClick={() => setIsFlipped(!isFlipped)}
                className="relative w-full h-full cursor-pointer"
              >
                <motion.div
                  className="absolute inset-0 rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-slate-950/70 to-slate-900/50 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.35)] backdrop-blur-xl flex flex-col justify-between overflow-hidden"
                  animate={{
                    rotateY: isFlipped ? 180 : 0,
                  }}
                  transition={{ duration: 0.6 }}
                  style={{ perspective: 1200 }}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_60%)]" />

                  <div className="relative space-y-6 flex-1 flex flex-col justify-center">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                        {isFlipped ? 'Answer' : 'Question'}
                      </p>
                      <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
                        {isFlipped ? currentCard.back : currentCard.front}
                      </h2>
                    </div>
                  </div>

                  <div className="relative text-center">
                    <p className="text-sm text-zinc-400">
                      {isFlipped ? 'Click to see question' : 'Click to reveal answer'}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Card Counter */}
          <p className="text-sm text-zinc-400">
            Card {currentIndex + 1} of {cards.length}
          </p>

          {/* Confidence Buttons (shown when card is flipped) */}
          {isFlipped && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl grid grid-cols-3 gap-3"
            >
              <button
                onClick={() => handleMastered('hard')}
                className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:border-rose-400/60 hover:bg-rose-500/20"
              >
                Need Review
              </button>
              <button
                onClick={() => handleMastered('medium')}
                className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200 transition hover:border-amber-400/60 hover:bg-amber-500/20"
              >
                Got It
              </button>
              <button
                onClick={() => handleMastered('easy')}
                className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/60 hover:bg-emerald-500/20"
              >
                Mastered
              </button>
            </motion.div>
          )}

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="rounded-lg border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFlipped(!isFlipped)}
              className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-500/20"
            >
              <RotateCw className="h-5 w-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              disabled={currentIndex === cards.length - 1}
              className="rounded-lg border border-white/10 bg-white/5 p-3 transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
          </motion.div>

          {/* Shuffle button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/10"
          >
            + Create New Set
          </motion.button>
        </motion.div>
      </div>
  );
}
