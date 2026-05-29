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
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

interface DashboardNavbarProps {
  onSidebarToggle: () => void;
}

export function DashboardNavbar({ onSidebarToggle }: DashboardNavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-20 mx-4 mt-4 rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.6)] px-4 py-3 backdrop-blur-sm md:mx-6 md:mt-6 md:rounded-xl md:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Menu + Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onSidebarToggle}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden md:flex items-center gap-2.5 rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-tertiary),0.3)] px-3 py-2 min-w-[280px]">
            <Search className="h-4 w-4 text-[rgb(var(--text-tertiary))] flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="flex-1 bg-transparent text-sm text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--text-tertiary))] outline-none"
            />
          </div>
        </div>

        {/* Right: Status + Actions */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="hidden sm:inline">12 day streak</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-200">
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden md:inline">245 energy</span>
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
            >
              {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </motion.div>
          </motion.button>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors"
          >
            <Bell className="h-4 w-4" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-semibold text-white"
            >
              3
            </motion.div>
          </motion.button>

          {/* Profile */}
          <div className="relative">
            <motion.button
              onClick={() => setProfileOpen(!profileOpen)}
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-1.5 rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] px-2.5 py-1.5 text-sm transition-colors hover:bg-[rgb(var(--bg-tertiary))]"
            >
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-blue-500" />
              <ChevronDown
                className={`h-3.5 w-3.5 text-[rgb(var(--text-tertiary))] transition-transform ${
                  profileOpen ? 'rotate-180' : ''
                }`}
              />
            </motion.button>

            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 mt-2 w-48 rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.95)] shadow-lg backdrop-blur-sm overflow-hidden z-40"
              >
                <button className="w-full px-4 py-2.5 text-left text-sm text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-tertiary))] transition-colors flex items-center gap-2">
                  <User className="h-4 w-4 text-[rgb(var(--text-tertiary))]" />
                  Profile
                </button>
                <button className="w-full px-4 py-2.5 text-left text-sm text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-tertiary))] transition-colors border-t border-[rgb(var(--border-color))]">
                  Settings
                </button>
                <button className="w-full px-4 py-2.5 text-left text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-[rgb(var(--border-color))]">
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
