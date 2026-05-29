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
  LogOut,
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
  { icon: Globe, label: 'Visual Learning', href: '/dashboard/visual-learning', id: 'visual-learning' },
  { icon: TrendingUp, label: 'Progress', href: '/dashboard/progress', id: 'progress' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings', id: 'settings' },
];

export function DashboardSidebar({ isOpen, onToggle }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const activeId = (() => {
    if (pathname === '/dashboard') return 'home';
    return pathname.split('/').pop() || 'home';
  })();

  return (
    <>
      <motion.aside
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] flex-col justify-between border-r border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.72)] p-4 backdrop-blur-xl"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/10">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Notevoro</p>
              <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">Study OS</p>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;
              const isHovered = hoveredItem === item.id;
              return (
                <Link key={item.id} href={item.href} className="group" onMouseEnter={() => setHoveredItem(item.id)} onMouseLeave={() => setHoveredItem(null)}>
                  <div
                    className={`relative flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-[rgba(var(--accent-primary),0.12)] text-[rgb(var(--accent-primary))]'
                        : 'text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--bg-tertiary),0.36)] hover:text-[rgb(var(--text-primary))]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-[rgb(var(--accent-primary))]"
                      />
                    )}
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3 border-t border-[rgb(var(--border-color))] pt-4">
          <div className="rounded-3xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.72)] p-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[rgb(var(--text-primary))]">Priya Shah</p>
                <p className="text-xs text-[rgb(var(--text-tertiary))]">Pro Plan</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Link href="/dashboard/settings" className="rounded-2xl px-3 py-3 text-sm text-[rgb(var(--text-secondary))] transition hover:bg-[rgba(var(--bg-tertiary),0.36)] hover:text-[rgb(var(--text-primary))]">
              Settings
            </Link>
            <button className="rounded-2xl px-3 py-3 text-left text-sm text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-200">
              Logout
            </button>
          </div>
        </div>
      </motion.aside>

      <button
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.92)] text-[rgb(var(--text-primary))] shadow-sm backdrop-blur-xl transition hover:bg-[rgba(var(--bg-secondary),0.98)]"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
              onClick={onToggle}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.94)] p-4 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between gap-3 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/10">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Notevoro</p>
                    <p className="font-semibold text-[rgb(var(--text-primary))]">Study OS</p>
                  </div>
                </div>
                <button onClick={onToggle} className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]">
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
                      onClick={onToggle}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                        isActive
                          ? 'bg-[rgba(var(--accent-primary),0.12)] text-[rgb(var(--accent-primary))]'
                          : 'text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--bg-tertiary),0.36)] hover:text-[rgb(var(--text-primary))]'
                      }`}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-6 space-y-2 border-t border-[rgb(var(--border-color))] pt-4">
                <Link href="/dashboard/settings" onClick={onToggle} className="block rounded-2xl px-3 py-3 text-sm text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--bg-tertiary),0.36)] hover:text-[rgb(var(--text-primary))]">
                  Settings
                </Link>
                <button onClick={onToggle} className="block w-full rounded-2xl px-3 py-3 text-left text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-200">
                  Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
