'use client';

import { useState, useEffect } from 'react';
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
  const [streak, setStreak] = useState(12);
  const [aiEnergy, setAiEnergy] = useState(245);
  const [notifications, setNotifications] = useState(3);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-20 mx-6 mt-5 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left: Search */}
        <div className="hidden flex-1 md:flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search topics, notes, quizzes..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Streak */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-2 text-sm">
            <div className="flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="font-semibold text-amber-200">{streak} day streak</span>
          </div>

          {/* AI Energy */}
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm">
            <Zap className="h-4 w-4 text-cyan-300" />
            <span className="font-semibold text-cyan-200">{aiEnergy} / 250</span>
          </div>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="relative rounded-lg border border-white/10 bg-white/5 p-2.5 transition hover:bg-white/10"
          >
            <Bell className="h-5 w-5 text-zinc-400" />
            {notifications > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white"
              >
                {notifications}
              </motion.div>
            )}
          </motion.button>

          {/* Profile Dropdown */}
          <div className="relative">
            <motion.button
              onClick={() => setProfileOpen(!profileOpen)}
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 transition hover:bg-white/10"
            >
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400" />
              <ChevronDown
                className={`h-4 w-4 text-zinc-400 transition ${profileOpen ? 'rotate-180' : ''}`}
              />
            </motion.button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#0a0a14]/95 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden z-40"
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
