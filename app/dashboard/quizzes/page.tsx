"use client";
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Award, ArrowRight } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export default function QuizzesPage() {
  const [questions] = useState<QuizQuestion[]>([
    {
      id: '1',
      question: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correct: 2,
      explanation: 'Paris is the capital and largest city of France.',
    },
    {
      id: '2',
      question: 'Which planet is closest to the Sun?',
      options: ['Venus', 'Mercury', 'Mars', 'Earth'],
      correct: 1,
      explanation: 'Mercury is the smallest and closest planet to the Sun.',
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isCorrect = selected === currentQuestion.correct;

  const handleAnswer = (optionIndex: number) => {
    if (answered) return;
    setSelected(optionIndex);
    setAnswered(true);
    if (optionIndex === currentQuestion.correct) {
      setScore(score + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setFinished(true);
    }
  };

  const percentage = Math.round((score / questions.length) * 100);

  if (finished) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 md:px-12 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 max-w-2xl"
          >
            {/* Score Circle */}
            <div className="relative w-48 h-48 mx-auto">
              <motion.div
                className="absolute inset-0 rounded-full border-8 border-white/10 bg-white/5 flex items-center justify-center"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: 'spring' }}
              >
                <div className="text-center">
                  <p className="text-6xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                    {percentage}%
                  </p>
                  <p className="text-sm text-zinc-400 mt-2">
                    {score} out of {questions.length}
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-bold text-white">Quiz Complete!</h1>
              <p className="text-lg text-zinc-400">
                {percentage >= 80
                  ? "Excellent work! You've mastered this topic."
                  : percentage >= 60
                  ? "Good job! Keep practicing to improve."
                  : "Keep learning! Review the concepts and try again."}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                Review Answers
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 font-semibold text-slate-950 shadow-[0_20px_80px_rgba(59,130,246,0.25)] transition hover:brightness-110"
              >
                Try Another Quiz
              </motion.button>
            </div>
          </motion.div>
        </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-6 md:px-12 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-white">Biology Quiz</h1>
            <p className="text-zinc-400">Test your knowledge with these questions</p>
          </div>

          {/* Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <p className="text-sm text-zinc-400">
                Score: {score}
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Question Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-8"
        >
          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-8"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {currentQuestion.question}
              </h2>
            </motion.div>
          </AnimatePresence>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selected === index;
              const isCorrectOption = index === currentQuestion.correct;
              let bgColor = 'bg-white/5 border-white/10';

              if (answered) {
                if (isSelected && isCorrect) {
                  bgColor = 'bg-emerald-500/20 border-emerald-400/40';
                } else if (isSelected && !isCorrect) {
                  bgColor = 'bg-rose-500/20 border-rose-400/40';
                } else if (isCorrectOption) {
                  bgColor = 'bg-emerald-500/20 border-emerald-400/40';
                }
              } else if (isSelected) {
                bgColor = 'bg-cyan-500/20 border-cyan-400/40';
              }

              return (
                <motion.button
                  key={index}
                  whileHover={!answered ? { scale: 1.02 } : {}}
                  onClick={() => handleAnswer(index)}
                  disabled={answered}
                  className={`w-full rounded-xl border px-6 py-4 text-left font-semibold text-white transition ${bgColor} disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg border-2 ${
                      answered && isCorrectOption ? 'border-emerald-400 bg-emerald-500/20' :
                      answered && isSelected && !isCorrect ? 'border-rose-400 bg-rose-500/20' :
                      isSelected ? 'border-cyan-400 bg-cyan-500/20' : 'border-white/20'
                    }`}>
                      <span className="text-sm">{String.fromCharCode(65 + index)}</span>
                    </div>
                    <span>{option}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Explanation (shown after answer) */}
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border px-6 py-4 ${
                isCorrect
                  ? 'border-emerald-400/40 bg-emerald-500/10'
                  : 'border-rose-400/40 bg-rose-500/10'
              }`}
            >
              <p className={`text-sm font-semibold mb-2 ${
                isCorrect ? 'text-emerald-200' : 'text-rose-200'
              }`}>
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p className="text-sm text-zinc-300">
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}

          {/* Next Button */}
          {answered && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleNext}
              className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 font-semibold text-slate-950 shadow-[0_20px_80px_rgba(59,130,246,0.25)] transition hover:brightness-110 flex items-center justify-center gap-2"
            >
              {currentIndex === questions.length - 1 ? 'See Results' : 'Next Question'}
              <ArrowRight className="h-5 w-5" />
            </motion.button>
          )}
        </motion.div>
      </div>
  );
}
