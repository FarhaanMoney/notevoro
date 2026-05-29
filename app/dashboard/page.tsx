'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Zap,
  BookOpen,
  Brain,
  BarChart3,
  MessageCircle,
  Flame,
  Lightbulb,
} from 'lucide-react';

export default function DashboardPage() {
  const [userName] = useState('Farhaan');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <div className="w-full space-y-6 p-6 md:p-8">
      {/* Greeting Section */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-2"
      >
        <motion.div variants={itemVariants} className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-[rgb(var(--text-primary))]">
            Welcome back, {userName}
          </h1>
          <p className="text-sm text-[rgb(var(--text-secondary))]">
            Continue your learning journey with AI-powered study tools
          </p>
        </motion.div>
      </motion.section>

      {/* Status Cards - Horizontal */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div
          variants={itemVariants}
          className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] p-4 backdrop-blur-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-tertiary))]">
                Study Streak
              </p>
              <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">12</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">days in a row</p>
            </div>
            <Flame className="h-5 w-5 text-orange-500 opacity-70" />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] p-4 backdrop-blur-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-tertiary))]">
                Hours Studied
              </p>
              <p className="mt-1 text-2xl font-bold text-cyan-600 dark:text-cyan-400">48.5</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">this month</p>
            </div>
            <Zap className="h-5 w-5 text-cyan-500 opacity-70" />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] p-4 backdrop-blur-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-tertiary))]">
                Current Focus
              </p>
              <p className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">Biology</p>
              <p className="text-xs text-[rgb(var(--text-secondary))]">genetics unit</p>
            </div>
            <BookOpen className="h-5 w-5 text-indigo-500 opacity-70" />
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Start - Continue Learning */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <motion.h2 variants={itemVariants} className="text-lg font-semibold text-[rgb(var(--text-primary))]">
          Continue Learning
        </motion.h2>

        <motion.div
          variants={itemVariants}
          className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[
            {
              icon: BarChart3,
              title: 'Biology Quiz',
              desc: 'Ecosystems - 8/10 completed',
              href: '/dashboard/quizzes',
              color: 'from-cyan-500 to-blue-500',
            },
            {
              icon: Zap,
              title: 'Spanish Vocab',
              desc: '24/32 flashcards mastered',
              href: '/dashboard/flashcards',
              color: 'from-violet-500 to-purple-500',
            },
            {
              icon: BookOpen,
              title: 'Physics Notes',
              desc: 'Laws of Motion - AI generated',
              href: '/dashboard/notes',
              color: 'from-emerald-500 to-teal-500',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group"
              >
                <motion.div
                  variants={itemVariants}
                  className="rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] p-4 backdrop-blur-sm hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.8)] transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${item.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-[rgb(var(--text-tertiary))] group-hover:text-[rgb(var(--accent-primary))] transition-colors" />
                  </div>
                  <h3 className="text-sm font-semibold text-[rgb(var(--text-primary))] mb-1">{item.title}</h3>
                  <p className="text-xs text-[rgb(var(--text-secondary))]">{item.desc}</p>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </motion.section>

      {/* Quick Actions */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <motion.h2 variants={itemVariants} className="text-lg font-semibold text-[rgb(var(--text-primary))]">
          Quick Actions
        </motion.h2>

        <motion.div variants={itemVariants} className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { icon: BookOpen, label: 'New Notes', href: '/dashboard/notes', color: 'emerald' },
            { icon: BarChart3, label: 'New Quiz', href: '/dashboard/quizzes', color: 'cyan' },
            { icon: Zap, label: 'Flashcards', href: '/dashboard/flashcards', color: 'violet' },
            { icon: MessageCircle, label: 'Ask AI', href: '/dashboard/chat', color: 'pink' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="group rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] p-4 text-center backdrop-blur-sm hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.8)] transition-all"
                >
                  <Icon className="h-5 w-5 text-[rgb(var(--accent-primary))] mx-auto mb-2 opacity-80 group-hover:opacity-100" />
                  <p className="text-xs font-medium text-[rgb(var(--text-primary))]">{action.label}</p>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </motion.section>

      {/* AI Suggestions */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        <motion.h2 variants={itemVariants} className="text-lg font-semibold text-[rgb(var(--text-primary))]">
          AI Suggestions
        </motion.h2>

        <motion.div variants={itemVariants} className="space-y-2">
          {[
            {
              icon: Lightbulb,
              title: 'Generate Flashcards',
              desc: 'Create flashcards from your Biology notes on genetics',
            },
            {
              icon: Brain,
              title: 'Continue Quiz',
              desc: 'Resume where you left off - 2 questions remaining',
            },
            {
              icon: Sparkles,
              title: 'AI Summary',
              desc: 'Your Physics notes need review - AI can summarize them',
            },
          ].map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <motion.button
                key={suggestion.title}
                variants={itemVariants}
                className="w-full text-left rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] p-4 backdrop-blur-sm hover:border-[rgb(var(--accent-primary))] hover:bg-[rgba(var(--bg-secondary),0.8)] transition-all"
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 text-[rgb(var(--accent-primary))] flex-shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[rgb(var(--text-primary))]">{suggestion.title}</p>
                    <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{suggestion.desc}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.section>

      {/* CTA */}
      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="pt-4 pb-8"
      >
        <motion.div
          variants={itemVariants}
          className="rounded-lg border border-[rgb(var(--border-color))] bg-gradient-to-br from-indigo-500/10 to-blue-500/10 p-6 backdrop-blur-sm"
        >
          <div className="flex items-start gap-4">
            <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-[rgb(var(--text-primary))] mb-1">Upgrade to Pro</h3>
              <p className="text-sm text-[rgb(var(--text-secondary))] mb-3">
                Unlock unlimited AI prompts, advanced analytics, and collaborative studying.
              </p>
              <Link
                href="/premium"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                Learn more
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
}
