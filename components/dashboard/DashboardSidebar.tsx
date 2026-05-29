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
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="hidden md:flex fixed left-0 top-0 h-screen w-[220px] flex-col gap-4 rounded-r-xl border-r border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.6)] p-4 backdrop-blur-sm z-30"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-1 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-primary))]">Notevoro</p>
            <p className="text-xs text-[rgb(var(--text-tertiary))]">Workspace</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative group"
              >
                <motion.div
                  className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'text-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-light))]'
                      : 'text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-tertiary),0.5)]'
                  }`}
                  whileHover={{ x: 2 }}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full bg-[rgb(var(--accent-primary))]"
                      transition={{ duration: 0.2 }}
                    />
                  )}

                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-[rgb(var(--accent-primary))]' : ''}`} />
                  <span className="truncate font-medium">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Profile Section */}
        <div className="border-t border-[rgb(var(--border-color))] pt-3 space-y-2">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-tertiary),0.5)] transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="truncate">Settings</span>
          </Link>

          <button className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[rgb(var(--text-secondary))] hover:text-red-500 hover:bg-red-500/10 transition-colors">
            <LogOut className="h-4 w-4" />
            <span className="truncate">Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-40 rounded-lg border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.8)] p-2 backdrop-blur-sm transition-colors hover:bg-[rgb(var(--bg-tertiary))]"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="md:hidden fixed inset-0 bg-black/30 z-20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="md:hidden fixed left-0 top-0 h-screen w-64 flex-col gap-4 border-r border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.95)] p-4 backdrop-blur-sm z-30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <p className="font-bold uppercase text-sm">Notevoro</p>
          </div>
          <button onClick={onToggle} className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeId === item.id;

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onToggle}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-[rgb(var(--accent-primary))] bg-[rgb(var(--accent-light))]'
                    : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-tertiary))]'
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
