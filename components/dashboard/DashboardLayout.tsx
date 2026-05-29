'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardNavbar } from './DashboardNavbar';
import { FloatingAIInput } from './FloatingAIInput';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setSidebarOpen((current) => !current);
      }
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[rgb(var(--bg-primary))] text-[rgb(var(--text-primary))]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),transparent_15%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.06),transparent_18%)]" />
      <DashboardSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen((state) => !state)} />

      <div className="md:pl-[220px]">
        <DashboardNavbar pathname={pathname} onSidebarToggle={() => setSidebarOpen((state) => !state)} />

        <main className="min-h-[calc(100vh-112px)] px-4 pb-40 pt-4 transition-colors duration-300 md:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="mx-auto max-w-[1480px]"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-6 md:left-[220px] md:px-6">
        <FloatingAIInput onSubmit={(value) => console.log('AI input:', value)} />
      </div>
    </div>
  );
}
