'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardNavbar } from './DashboardNavbar';
import { DashboardRightPanel } from './DashboardRightPanel';
import { FloatingAIInput } from './FloatingAIInput';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen w-full bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))] overflow-hidden">
      {/* Background effects for dark mode only */}
      {typeof window !== 'undefined' && document.documentElement.classList.contains('dark') && (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-cyan-500/5" />
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-h-screen w-full">
        <DashboardSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 flex-col overflow-hidden md:pl-56">
          <DashboardNavbar onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-auto pb-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="min-h-[calc(100vh-80px)] w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Floating AI Input */}
          <div className="fixed bottom-0 left-0 right-0 md:left-56">
            <FloatingAIInput onSubmit={(msg) => console.log('AI message:', msg)} />
          </div>
        </div>

        <DashboardRightPanel />
      </div>
    </div>
  );
}
