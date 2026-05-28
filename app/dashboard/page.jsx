'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Zap,
  BookOpen,
  BarChart3,
  Brain,
  TrendingUp,
  Clock,
  Target,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function DashboardPage() {
  const [userName] = useState('Farhaan');
  const [streakDays] = useState(12);
  const [totalHours] = useState(48.5);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen w-full space-y-8 px-6 md:px-12 py-8">
        {/* Welcome Hero Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="rounded-[3rem] border border-white/10 bg-gradient-to-br from-violet-500/10 via-slate-950/80 to-cyan-500/10 p-10 shadow-[0_40px_120px_rgba(59,130,246,0.12)]"
        >
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/90">Welcome back</p>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Hey {userName}, keep the momentum
              </h1>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Streak Card */}
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Study streak</p>
                  <span className="text-2xl font-bold text-amber-300">{streakDays}</span>
                </div>
                <p className="text-sm text-amber-200/70">Days in a row • Don't break it!</p>
              </div>

              {/* Progress Card */}
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Total studied</p>
                  <span className="text-2xl font-bold text-cyan-300">{totalHours}h</span>
                </div>
                <p className="text-sm text-cyan-200/70">Consistent dedication pays off</p>
              </div>

              {/* AI Recommendation Card */}
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-violet-200/80">AI insight</p>
                  <Sparkles className="h-5 w-5 text-violet-300" />
                </div>
                <p className="text-sm text-violet-200/70">Your Biology notes need review</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard/chat"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-[0_20px_80px_rgba(59,130,246,0.25)] transition hover:-translate-y-0.5"
              >
                Ask AI anything
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                View recommendations
              </button>
            </div>
          </motion.div>
        </motion.section>

        {/* Continue Learning Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold text-white">
            Continue Learning
          </motion.h2>

          <motion.div
            variants={itemVariants}
            className="grid gap-4 lg:grid-cols-3"
          >
            {/* Recent Quiz */}
            <Link href="/dashboard/quizzes" className="group">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-cyan-400/40 hover:bg-cyan-500/5">
                <div className="flex items-center justify-between mb-4">
                  <BarChart3 className="h-5 w-5 text-cyan-300" />
                  <span className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Recent</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Biology Ecosystems Quiz</h3>
                <p className="text-sm text-zinc-400 mb-4">8/10 • Completed yesterday</p>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-4/5 bg-gradient-to-r from-cyan-400 to-blue-500" />
                </div>
              </div>
            </Link>

            {/* Recent Flashcards */}
            <Link href="/dashboard/flashcards" className="group">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-violet-400/40 hover:bg-violet-500/5">
                <div className="flex items-center justify-between mb-4">
                  <Zap className="h-5 w-5 text-violet-300" />
                  <span className="text-xs uppercase tracking-[0.3em] text-violet-200/80">Recent</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Spanish Vocabulary Set</h3>
                <p className="text-sm text-zinc-400 mb-4">24/32 mastered • 5 days ago</p>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-3/4 bg-gradient-to-r from-violet-400 to-pink-500" />
                </div>
              </div>
            </Link>

            {/* Recent Notes */}
            <Link href="/dashboard/notes" className="group">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-emerald-400/40 hover:bg-emerald-500/5">
                <div className="flex items-center justify-between mb-4">
                  <BookOpen className="h-5 w-5 text-emerald-300" />
                  <span className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Recent</span>
                </div>
                <h3 className="font-semibold text-white mb-2">Physics: Laws of Motion</h3>
                <p className="text-sm text-zinc-400 mb-4">AI summary generated • Today</p>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.section>

        {/* Quick Actions Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold text-white">
            Quick Actions
          </motion.h2>

          <motion.div variants={itemVariants} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, label: 'Generate Notes', href: '/dashboard/notes', color: 'emerald' },
              { icon: BarChart3, label: 'Create Quiz', href: '/dashboard/quizzes', color: 'cyan' },
              { icon: Zap, label: 'Make Flashcards', href: '/dashboard/flashcards', color: 'violet' },
              { icon: Brain, label: 'Ask AI', href: '/dashboard/chat', color: 'pink' },
            ].map((action) => {
              const Icon = action.icon;
              const colorMap = {
                emerald: 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600',
                cyan: 'from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600',
                violet: 'from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600',
                pink: 'from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600',
              };

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`group rounded-2xl bg-gradient-to-r ${colorMap[action.color as keyof typeof colorMap]} p-5 shadow-[0_20px_80px_rgba(59,130,246,0.12)] transition hover:shadow-[0_24px_100px_rgba(59,130,246,0.18)]`}
                >
                  <div className="flex flex-col items-start gap-4">
                    <Icon className="h-6 w-6 text-white opacity-90" />
                    <div className="flex-1">
                      <p className="font-semibold text-white">{action.label}</p>
                      <p className="text-xs text-white/70 mt-1">Start now</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-white opacity-0 transition group-hover:opacity-100 group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </motion.div>
        </motion.section>

        {/* Study Stats Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold text-white">
            Study Statistics
          </motion.h2>

          <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Clock, label: 'Hours Studied', value: '48.5h', trend: '+12h this week' },
              { icon: BarChart3, label: 'Quizzes Done', value: '156', trend: '+8 this week' },
              { icon: Zap, label: 'Flashcards', value: '1,243', trend: '+89 this week' },
              { icon: TrendingUp, label: 'Avg. Score', value: '84.3%', trend: '+3.2% this week' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <Icon className="h-5 w-5 text-cyan-300" />
                    <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">{stat.trend}</p>
                  </div>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-400 mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
              );
            })}
          </motion.div>
        </motion.section>

        {/* AI Recommendations Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4 pb-8"
        >
          <motion.h2 variants={itemVariants} className="text-2xl font-bold text-white">
            AI Recommendations
          </motion.h2>

          <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-2">
            {[
              {
                title: 'Weak Subjects',
                items: ['Biology: Genetics', 'Chemistry: Stoichiometry', 'History: Medieval Period'],
                icon: Target,
                color: 'rose',
              },
              {
                title: 'Continue Learning',
                items: ['Finish Spanish Set', 'Review Physics Notes', 'Complete Mock Test 3'],
                icon: TrendingUp,
                color: 'emerald',
              },
            ].map((rec) => {
              const Icon = rec.icon;
              return (
                <div key={rec.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <Icon className="h-5 w-5 text-cyan-300" />
                    <h3 className="font-semibold text-white">{rec.title}</h3>
                  </div>
                  <ul className="space-y-2">
                    {rec.items.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                        <span className="h-2 w-2 rounded-full bg-cyan-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </motion.div>
        </motion.section>
      </div>
    </DashboardLayout>
  );
}
