'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, TrendingUp, Play, BookOpen } from 'lucide-react';

interface MockTest {
  id: string;
  title: string;
  subject: string;
  duration: number;
  questionCount: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completionRate: number;
  avgScore: number;
  lastAttempt?: Date;
}

export default function MockTestsPage() {
  const [tests] = useState<MockTest[]>([
    {
      id: '1',
      title: 'Biology - Full Length Exam',
      subject: 'Biology',
      duration: 180,
      questionCount: 50,
      difficulty: 'Hard',
      completionRate: 85,
      avgScore: 78,
      lastAttempt: new Date(Date.now() - 86400000),
    },
    {
      id: '2',
      title: 'Chemistry - Acids & Bases',
      subject: 'Chemistry',
      duration: 90,
      questionCount: 25,
      difficulty: 'Medium',
      completionRate: 72,
      avgScore: 82,
    },
    {
      id: '3',
      title: 'Physics - Mechanics',
      subject: 'Physics',
      duration: 120,
      questionCount: 40,
      difficulty: 'Hard',
      completionRate: 60,
      avgScore: 71,
    },
    {
      id: '4',
      title: 'Spanish - Conversational',
      subject: 'Languages',
      duration: 60,
      questionCount: 20,
      difficulty: 'Medium',
      completionRate: 0,
      avgScore: 0,
    },
  ]);

  const [selectedTest, setSelectedTest] = useState<MockTest | null>(null);
  const [testStarted, setTestStarted] = useState(false);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200';
      case 'Medium':
        return 'bg-amber-500/20 border-amber-400/40 text-amber-200';
      case 'Hard':
        return 'bg-rose-500/20 border-rose-400/40 text-rose-200';
      default:
        return 'bg-white/5 border-white/10 text-white';
    }
  };

  if (testStarted && selectedTest) {
    return (
      <div className="min-h-screen w-full px-6 md:px-12 py-8 flex flex-col">
          {/* Test Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between pb-6 border-b border-white/10"
          >
            <div>
              <h1 className="text-2xl font-bold text-white">{selectedTest.title}</h1>
              <p className="text-sm text-zinc-400">
                Question 5 of {selectedTest.questionCount}
              </p>
            </div>

            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-8"
            >
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">Time Remaining</p>
                <p className="text-2xl font-bold text-cyan-300">45:32</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  setTestStarted(false);
                  setSelectedTest(null);
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Exit Test
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Test Content */}
          <div className="flex-1 py-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-8"
            >
              <h2 className="text-xl font-bold text-white mb-4">
                What is the primary function of mitochondria?
              </h2>
              <div className="space-y-3">
                {[
                  'Storage of genetic information',
                  'Production of ATP (energy)',
                  'Protein synthesis',
                  'Photosynthesis',
                ].map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left font-semibold text-white transition hover:border-cyan-400/40 hover:bg-cyan-500/5"
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">Progress</p>
                <p className="text-sm font-semibold text-white">10% (5/50)</p>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: '10%' }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen w-full px-6 md:px-12 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">Mock Tests</h1>
          <p className="text-zinc-400">Simulate real exams and track your progress</p>
        </motion.div>

        {/* Tests Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {tests.map((test) => (
              <motion.button
                key={test.id}
                onClick={() => setSelectedTest(test)}
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/5 group"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg mb-2">{test.title}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getDifficultyColor(test.difficulty)}`}>
                          {test.difficulty}
                        </span>
                        <span className="text-xs text-zinc-400">{test.subject}</span>
                      </div>
                    </div>
                    <motion.div
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-400/40 opacity-0 group-hover:opacity-100 transition"
                      whileHover={{ scale: 1.1 }}
                    >
                      <Play className="h-5 w-5 text-cyan-300" />
                    </motion.div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Duration
                      </p>
                      <p className="font-semibold text-white">{test.duration}m</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-400 flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> Questions
                      </p>
                      <p className="font-semibold text-white">{test.questionCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Avg Score
                      </p>
                      <p className="font-semibold text-white">
                        {test.avgScore > 0 ? `${test.avgScore}%` : 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Performance Bar */}
                  {test.completionRate > 0 && (
                    <div className="pt-4 border-t border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-400">Completion Rate</p>
                        <p className="text-xs font-semibold text-white">{test.completionRate}%</p>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${test.completionRate}%` }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <button className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    test.completionRate > 0
                      ? 'border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:brightness-110'
                  }`}>
                    {test.completionRate > 0 ? 'Retake Test' : 'Start Test'}
                  </button>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Test Detail Modal */}
        <AnimatePresence>
          {selectedTest && !testStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTest(null)}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 to-slate-900 p-8 max-w-2xl w-full space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-white">{selectedTest.title}</h2>
                  <p className="text-zinc-400">{selectedTest.subject}</p>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-zinc-400 mb-1">Duration</p>
                    <p className="font-bold text-white">{selectedTest.duration}m</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-zinc-400 mb-1">Questions</p>
                    <p className="font-bold text-white">{selectedTest.questionCount}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-zinc-400 mb-1">Difficulty</p>
                    <p className="font-bold text-white">{selectedTest.difficulty}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                    <p className="text-xs text-zinc-400 mb-1">Avg Score</p>
                    <p className="font-bold text-white">{selectedTest.avgScore > 0 ? `${selectedTest.avgScore}%` : 'N/A'}</p>
                  </div>
                </div>

                {selectedTest.lastAttempt && (
                  <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/30 p-4">
                    <p className="text-sm text-cyan-200">
                      📝 Last attempted {Math.floor((Date.now() - selectedTest.lastAttempt.getTime()) / 86400000)} days ago
                    </p>
                  </div>
                )}

                <p className="text-zinc-300">
                  Test yourself with this comprehensive exam to identify weak areas and improve your performance.
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setSelectedTest(null)}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setTestStarted(true)}
                    className="flex-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-semibold text-white shadow-[0_20px_80px_rgba(34,211,238,0.25)] transition hover:brightness-110"
                  >
                    Start Test
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
}
