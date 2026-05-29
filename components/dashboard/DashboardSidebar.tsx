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
  { icon: Globe, label: 'Visual Learning', href: '/dashboard/visual-learning', id: 'visual' },
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
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="hidden md:flex fixed left-0 top-0 h-screen w-60 flex-col gap-5 rounded-r-[2rem] border border-white/10 bg-slate-950/90 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur-2xl z-30"
      >
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_30px_90px_rgba(59,130,246,0.22)]">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-200/80">Notevoro</p>
            <p className="text-sm font-semibold text-white">Workspace</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-1 pb-2">
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
                  className={`relative flex items-center gap-3 rounded-[1.5rem] px-3 py-3 text-sm font-medium transition ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                  whileHover={{ x: 4 }}
                >
                  <span className={`absolute left-0 top-1/2 h-10 w-1.5 -translate-y-1/2 rounded-full transition ${
                    isActive ? 'bg-cyan-400/95 shadow-[0_0_24px_rgba(34,211,238,0.35)]' : 'bg-transparent'
                  }`} />

                  {hoveredId === item.id && !isActive && (
                    <div className="absolute inset-0 rounded-[1.5rem] bg-white/5" />
                  )}

                  <div className="relative flex items-center gap-3 pl-3">
                    <Icon className={`h-5 w-5 ${isActive ? 'text-cyan-300' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 text-sm text-white">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-3xl bg-gradient-to-br from-cyan-500 to-violet-500 shadow-[0_18px_60px_rgba(59,130,246,0.18)]" />
            <div>
              <p className="font-semibold">Farhaan</p>
              <p className="text-xs text-zinc-400">Pro Plan</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <Link href="/dashboard/settings" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/10">
              <span>Settings</span>
              <span className="text-cyan-300">Go</span>
            </Link>
            <button className="w-full rounded-2xl border border-white/10 bg-slate-950/90 px-3 py-2 text-xs text-white transition hover:bg-white/10">
              Logout
            </button>
          </div>
        </div>
      </motion.aside>

      <button
        onClick={onToggle}
        className="md:hidden fixed top-6 left-6 z-40 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl transition hover:bg-white/10"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

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
