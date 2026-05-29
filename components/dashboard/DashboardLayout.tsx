'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardNavbar } from './DashboardNavbar';
import { DashboardRightPanel } from './DashboardRightPanel';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen w-full bg-[#050712] text-white overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="star-field" />
        <div className="nebula-layer" />
        <div className="nebula-layer nebula-layer-2" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full">
        <DashboardSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 flex-col overflow-hidden md:pl-[15rem]">
          <DashboardNavbar onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-auto pb-8 xl:pr-[22rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="min-h-[calc(100vh-4rem)] w-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        <DashboardRightPanel />
      </div>
    </div>
  );
}
