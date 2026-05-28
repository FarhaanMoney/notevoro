'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Zap, Clock, BarChart3, Calendar } from 'lucide-react';

export default function ProgressPage() {
  const [timeRange, setTimeRange] = useState('week');

  const stats = [
    { icon: Clock, label: 'Hours Studied', value: '48.5h', change: '+12h' },
    { icon: BarChart3, label: 'Quizzes Done', value: '156', change: '+8' },
    { icon: Zap, label: 'Flashcards', value: '1,243', change: '+89' },
    { icon: TrendingUp, label: 'Avg. Score', value: '84.3%', change: '+3.2%' },
  ];

  const subjectProgress = [
    { name: 'Biology', progress: 85, icon: '🧬' },
    { name: 'Chemistry', progress: 72, icon: '⚗️' },
    { name: 'Physics', progress: 91, icon: '⚛️' },
    { name: 'Spanish', progress: 68, icon: '🌍' },
    { name: 'History', progress: 79, icon: '📖' },
    { name: 'Math', progress: 88, icon: '📐' },
  ];

  return (
    <div className="min-h-screen w-full px-6 md:px-12 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white">Progress & Analytics</h1>
              <p className="text-zinc-400">Track your learning journey</p>
            </div>

            <div className="flex gap-2">
              {['week', 'month', 'year'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    timeRange === range
                      ? 'bg-cyan-500/20 border-cyan-400/40 border'
                      : 'border border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Key Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon className="h-5 w-5 text-cyan-300" />
                  <span className="text-xs font-semibold text-emerald-300">{stat.change}</span>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 mb-2">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Subject Progress */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-white">Subject Mastery</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {subjectProgress.map((subject) => (
              <motion.div
                key={subject.name}
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 cursor-pointer transition hover:border-cyan-400/40 hover:bg-cyan-500/5"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white text-lg">{subject.icon} {subject.name}</h3>
                  <span className="text-sm font-bold text-cyan-300">{subject.progress}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${subject.progress}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Study Streak Chart */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-white">Study Consistency</h2>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-end justify-between gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                const heights = [60, 80, 45, 90, 75, 40, 100];
                return (
                  <div key={day} className="flex flex-col items-center gap-2 flex-1">
                    <motion.div
                      className="w-full rounded-lg bg-gradient-to-t from-cyan-500 to-violet-500"
                      initial={{ height: 0 }}
                      animate={{ height: `${heights[idx]}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.1 }}
                    />
                    <span className="text-xs text-zinc-400">{day}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-zinc-300">
                🔥 <span className="font-semibold text-white">12 day streak</span> • Keep it going!
              </p>
            </div>
          </div>
        </motion.section>

        {/* Recommendations */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 pb-8"
        >
          <h2 className="text-2xl font-bold text-white">AI Insights</h2>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-6">
              <div className="flex items-start gap-4">
                <Target className="h-5 w-5 text-cyan-300 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-cyan-100 mb-2">Focus on Weak Areas</h3>
                  <p className="text-sm text-cyan-100/70">
                    Your Chemistry score is 15% below your average. Spend more time on Stoichiometry concepts.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-6">
              <div className="flex items-start gap-4">
                <TrendingUp className="h-5 w-5 text-emerald-300 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-100 mb-2">Maintain Momentum</h3>
                  <p className="text-sm text-emerald-100/70">
                    You're performing 23% better than last month. Your consistent study schedule is paying off!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </div>
  );
}
