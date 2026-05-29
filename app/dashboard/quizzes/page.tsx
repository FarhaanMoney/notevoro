'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const questions = [
  {
    question: 'What is the main role of mitochondria?',
    options: ['Digest nutrients', 'Generate energy', 'Store DNA', 'Control motion'],
    answer: 1,
    explanation: 'Mitochondria generate ATP, which powers the cell.',
  },
  {
    question: 'Which law states that force equals mass times acceleration?',
    options: ['Newton 1', 'Newton 2', 'Newton 3', 'Law of gravity'],
    answer: 1,
    explanation: 'Newton’s second law defines F = ma.',
  },
];

export default function QuizzesPage() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const current = questions[index];
  const progress = useMemo(() => Math.round(((index + (submitted ? 1 : 0)) / questions.length) * 100), [index, submitted]);

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    if (selected === current.answer) setScore((value) => value + 1);
  };

  const handleNext = () => {
    if (index < questions.length - 1) {
      setIndex((value) => value + 1);
      setSelected(null);
      setSubmitted(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Quizzes</p>
            <h1 className="text-3xl font-semibold text-[rgb(var(--text-primary))]">A cleaner exam flow.</h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
            {index + 1} / {questions.length}
          </div>
        </div>
      </motion.section>

      {submitted && index === questions.length - 1 ? (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-8 text-center">
          <p className="text-sm uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Session complete</p>
          <h2 className="mt-4 text-4xl font-semibold text-[rgb(var(--text-primary))]">{score} / {questions.length}</h2>
          <p className="mt-3 text-sm leading-7 text-[rgb(var(--text-secondary))]">Nice work. Review the explanations to keep the concepts sharp.</p>
          <button className="mt-6 inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110">
            Restart session <ArrowRight className="h-4 w-4" />
          </button>
        </motion.section>
      ) : (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.06 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
          <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Question</p>
              <h2 className="mt-2 text-2xl font-semibold text-[rgb(var(--text-primary))]">{current.question}</h2>
            </div>
            <div className="rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-4 py-2 text-xs text-[rgb(var(--text-secondary))]">
              {progress}% complete
            </div>
          </div>
          <div className="space-y-4">
            {current.options.map((option, optionIndex) => {
              const selectedOption = selected === optionIndex;
              const isCorrect = submitted && optionIndex === current.answer;
              const isWrong = submitted && selectedOption && optionIndex !== current.answer;
              return (
                <button
                  key={option}
                  disabled={submitted}
                  onClick={() => setSelected(optionIndex)}
                  className={`w-full rounded-3xl border px-5 py-4 text-left text-sm transition ${
                    isCorrect
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100'
                      : isWrong
                      ? 'border-rose-400 bg-rose-500/10 text-rose-100'
                      : selectedOption
                      ? 'border-cyan-400 bg-cyan-500/10 text-[rgb(var(--text-primary))]'
                      : 'border-[rgb(var(--border-color))] bg-[rgba(var(--bg-primary),0.95)] text-[rgb(var(--text-primary))]'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {submitted && (
            <div className="mt-6 rounded-3xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-primary),0.9)] p-5 text-sm text-[rgb(var(--text-secondary))]">
              <p className="font-semibold text-[rgb(var(--text-primary))]">Explanation</p>
              <p className="mt-2">{current.explanation}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={handleSubmit}
              disabled={selected === null || submitted}
              className="rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit answer
            </button>
            {submitted && index < questions.length - 1 && (
              <button onClick={handleNext} className="rounded-3xl border border-[rgb(var(--border-color))] px-6 py-3 text-sm text-[rgb(var(--text-primary))] transition hover:border-[rgb(var(--accent-primary))]">
                Next question
              </button>
            )}
          </div>
        </motion.section>
      )}
    </div>
  );
}
