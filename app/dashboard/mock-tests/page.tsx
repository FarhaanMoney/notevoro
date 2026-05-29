'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Shield } from 'lucide-react';

const testQuestions = [
  {
    question: 'Which process powers the mitochondria?',
    options: ['Photosynthesis', 'Cellular respiration', 'Diffusion', 'Transcription'],
    answer: 1,
  },
  {
    question: 'What is the SI unit of force?',
    options: ['Joule', 'Newton', 'Watt', 'Pascal'],
    answer: 1,
  },
];

export default function MockTestsPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(5 * 60);

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);

  const current = testQuestions[currentIndex];
  const finished = currentIndex >= testQuestions.length;
  const score = useMemo(() => answers.filter((value, index) => value === testQuestions[index].answer).length, [answers]);

  const submitAnswer = () => {
    if (selected === null) return;
    setAnswers((currentAnswers) => [...currentAnswers, selected]);
    setSelected(null);
    setCurrentIndex((current) => current + 1);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Mock Test</p>
            <h1 className="text-3xl font-semibold text-[rgb(var(--text-primary))]">Exam mode with calm pacing.</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
            <Clock className="h-4 w-4 text-cyan-400" /> {formatTime(timeLeft)} remaining
          </div>
        </div>
      </motion.section>

      {finished || timeLeft <= 0 ? (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-8 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Completed</p>
          <h2 className="mt-4 text-4xl font-semibold text-[rgb(var(--text-primary))]">Score: {score}/{testQuestions.length}</h2>
          <p className="mt-3 text-sm leading-7 text-[rgb(var(--text-secondary))]">You can review your answers or start another mock test when ready.</p>
        </motion.section>
      ) : (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[rgb(var(--text-secondary))]">Question {currentIndex + 1} of {testQuestions.length}</p>
              <h2 className="mt-2 text-2xl font-semibold text-[rgb(var(--text-primary))]">{current.question}</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
              <Shield className="h-4 w-4 text-cyan-400" /> Focus mode
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {current.options.map((option, optionIndex) => (
              <button
                key={option}
                onClick={() => setSelected(optionIndex)}
                className={`w-full rounded-3xl border px-5 py-4 text-left text-sm transition ${
                  selected === optionIndex
                    ? 'border-cyan-400 bg-cyan-500/10 text-[rgb(var(--text-primary))]'
                    : 'border-[rgb(var(--border-color))] bg-[rgba(var(--bg-primary),0.95)] text-[rgb(var(--text-primary))]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            onClick={submitAnswer}
            disabled={selected === null}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </motion.section>
      )}
    </div>
  );
}
