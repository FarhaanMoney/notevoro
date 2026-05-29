'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Bell, ChevronRight, ChevronDown, Moon, Sun, Sparkles } from 'lucide-react';

const titles: Record<string, string> = {
  '/dashboard': 'Home',
  '/dashboard/chat': 'AI Chat',
  '/dashboard/notes': 'Smart Notes',
  '/dashboard/flashcards': 'Flashcards',
  '/dashboard/quizzes': 'Quizzes',
  '/dashboard/mock-tests': 'Mock Tests',
  '/dashboard/visual-learning': 'Visual Learning',
  '/dashboard/progress': 'Progress',
  '/dashboard/settings': 'Settings',
};

interface DashboardNavbarProps {
  pathname: string;
  onSidebarToggle: () => void;
}

export function DashboardNavbar({ pathname, onSidebarToggle }: DashboardNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  const title = useMemo(() => titles[pathname] ?? 'Study', [pathname]);
  const breadcrumbs = useMemo(() => {
    const parts = pathname.replace('/dashboard', '').split('/').filter(Boolean);
    return ['Dashboard', ...parts.map((part) => part.replace('-', ' ').replace(/\b\w/g, (chr) => chr.toUpperCase()))];
  }, [pathname]);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="sticky top-0 z-30 mx-4 mt-4 flex items-center justify-between gap-3 rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.72)] px-4 py-3 backdrop-blur-xl shadow-sm md:mx-6"
    >
      <div className="min-w-0 space-y-1">
        <p className="text-xs uppercase tracking-[0.32em] text-[rgb(var(--text-tertiary))]">Study Workspace</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-base font-semibold text-[rgb(var(--text-primary))]">{title}</h1>
          <div className="hidden items-center gap-1 rounded-full border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-tertiary),0.8)] px-3 py-1 text-xs text-[rgb(var(--text-secondary))] md:flex">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb} className="inline-flex items-center gap-1">
                {index > 0 && <ChevronRight className="h-3 w-3" />}
                {crumb}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-3 py-1 text-xs text-[rgb(var(--text-secondary))] ring-1 ring-[rgba(var(--border-color),0.8)]">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          12 day streak
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-[rgba(var(--bg-tertiary),0.9)] px-3 py-1 text-xs text-[rgb(var(--text-secondary))] ring-1 ring-[rgba(var(--border-color),0.8)]">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          245 energy
        </div>
        <button
          onClick={toggleTheme}
          className="grid h-10 w-10 place-items-center rounded-2xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.92)] text-[rgb(var(--text-secondary))] transition hover:text-[rgb(var(--text-primary))]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>
        <button
          className="hidden sm:inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/10 transition hover:brightness-110"
          type="button"
        >
          Upgrade
        </button>
        <div className="relative">
          <button
            onClick={() => setProfileOpen((current) => !current)}
            className="flex h-10 min-w-[44px] items-center gap-2 rounded-2xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.92)] px-3 text-sm text-[rgb(var(--text-primary))] transition hover:bg-[rgba(var(--bg-tertiary),0.95)]"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white">P</span>
            <ChevronDown className={`h-4 w-4 transition ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-full mt-2 w-52 rounded-[28px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.95)] p-2 shadow-lg shadow-black/20"
            >
              <button className="w-full rounded-2xl px-4 py-3 text-left text-sm text-[rgb(var(--text-primary))] transition hover:bg-[rgba(var(--bg-tertiary),0.8)]">
                Profile
              </button>
              <button className="w-full rounded-2xl px-4 py-3 text-left text-sm text-[rgb(var(--text-primary))] transition hover:bg-[rgba(var(--bg-tertiary),0.8)]">
                Settings
              </button>
              <button className="w-full rounded-2xl px-4 py-3 text-left text-sm text-rose-400 transition hover:bg-rose-500/10">
                Logout
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
