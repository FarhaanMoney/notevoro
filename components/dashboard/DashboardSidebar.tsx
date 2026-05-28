'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  MessageCircle,
  BookOpen,
  Zap,
  BarChart3,
  Globe,
  TrendingUp,
  Settings,
  Brain,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const sidebarItems = [
  { icon: Home, label: 'Home', href: '/dashboard', id: 'home' },
  { icon: MessageCircle, label: 'AI Chat', href: '/dashboard/chat', id: 'chat' },
  { icon: BookOpen, label: 'Smart Notes', href: '/dashboard/notes', id: 'notes' },
  { icon: Zap, label: 'Flashcards', href: '/dashboard/flashcards', id: 'flashcards' },
  { icon: BarChart3, label: 'Quizzes', href: '/dashboard/quizzes', id: 'quizzes' },
  { icon: Brain, label: 'Mock Tests', href: '/dashboard/mock-tests', id: 'mock-tests' },
  { icon: Globe, label: 'Visual Learn', href: '/dashboard/visual-learning', id: 'visual' },
  { icon: TrendingUp, label: 'Progress', href: '/dashboard/progress', id: 'progress' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings', id: 'settings' },
];

export function DashboardSidebar({ isOpen, onToggle }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const getActiveId = () => {
    const pathSegment = pathname.split('/').pop();
    if (pathname === '/dashboard') return 'home';
    return pathSegment || 'home';
  };

  const activeId = getActiveId();

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="hidden md:flex absolute left-0 top-0 h-screen w-80 flex-col gap-6 rounded-r-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.28)] backdrop-blur-xl z-30"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_20px_80px_rgba(59,130,246,0.24)]">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/90">Notevoro</p>
            <p className="text-sm font-semibold text-white">Workspace</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative"
              >
                <motion.div
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  whileHover={{ x: 4 }}
                >
                  {/* Active glow background */}
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.15)]"
                      transition={{ duration: 0.3 }}
                    />
                  )}

                  {/* Hover background */}
                  {hoveredId === item.id && !isActive && (
                    <div className="absolute inset-0 rounded-2xl bg-white/5" />
                  )}

                  {/* Content */}
                  <div className="relative flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-300' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section: AI Energy + Profile */}
        <div className="border-t border-white/10 pt-6 space-y-4">
          {/* AI Energy */}
          <div className="rounded-2xl border border-cyan-400/20 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">AI Energy</p>
              <span className="text-xs font-semibold text-cyan-100">245 / 250</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                initial={{ width: 0 }}
                animate={{ width: '98%' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-[11px] text-zinc-400">Resets in 12 hours</p>
          </div>

          {/* Plan badge + upgrade */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-violet-200">
              Pro Plan
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              You have access to visual learning and advanced features.
            </p>
          </div>

          {/* Profile */}
          <button className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:bg-white/10">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-400">Profile</p>
            <p className="mt-1 text-sm font-semibold text-white">View Account</p>
          </button>
        </div>
      </motion.aside>

      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="md:hidden fixed top-6 left-6 z-40 rounded-lg border border-white/10 bg-white/5 p-2 backdrop-blur-xl transition hover:bg-white/10"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="md:hidden fixed inset-0 bg-black/40 z-20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="md:hidden fixed left-0 top-0 h-screen w-72 flex-col gap-6 rounded-r-2xl border border-white/10 bg-[#0a0a14]/95 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.5)] backdrop-blur-xl z-30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-white">Notevoro</p>
          </div>
          <button onClick={onToggle} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => onToggle()}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30'
                    : 'text-zinc-400 hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}
