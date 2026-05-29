'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Bell,
  Zap,
  User,
  ChevronDown,
  Menu,
} from 'lucide-react';

interface DashboardNavbarProps {
  onSidebarToggle: () => void;
}

export function DashboardNavbar({ onSidebarToggle }: DashboardNavbarProps) {
  const [streak] = useState(12);
  const [aiEnergy] = useState(245);
  const [notifications] = useState(3);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="sticky top-0 z-20 mx-6 mt-6 rounded-[1.75rem] border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onSidebarToggle}
            className="md:hidden flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:flex min-w-[320px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search notes, quizzes, AI prompts..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-amber-400/15 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span>{streak} day streak</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            <Zap className="h-4 w-4 text-cyan-300" />
            <span>{aiEnergy} AI energy</span>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            className="relative rounded-2xl border border-white/10 bg-white/5 p-2.5 text-zinc-300 transition hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-semibold text-white"
              >
                {notifications}
              </motion.div>
            )}
          </motion.button>

          <div className="relative">
            <motion.button
              onClick={() => setProfileOpen(!profileOpen)}
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
            >
              <div className="h-7 w-7 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400" />
              <ChevronDown
                className={`h-4 w-4 text-zinc-400 transition ${profileOpen ? 'rotate-180' : ''}`}
              />
            </motion.button>

            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[#07101a]/95 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden z-40"
              >
                <button className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 transition flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 transition border-t border-white/10">
                  Settings
                </button>
                <button className="w-full px-4 py-3 text-left text-sm text-rose-400 hover:bg-rose-500/10 transition border-t border-white/10">
                  Logout
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
