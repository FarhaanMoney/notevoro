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
    <div className="relative h-screen w-full bg-[#07070f] text-white overflow-hidden">
      {/* Background cosmic effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="star-field" />
        <div className="nebula-layer" />
        <div className="nebula-layer nebula-layer-2" />
      </div>

      {/* Main layout */}
      <div className="relative z-10 flex h-screen w-full">
        {/* Floating Sidebar */}
        <DashboardSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden pl-0 md:pl-[20rem]">
          {/* Floating Top Navbar */}
          <DashboardNavbar onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

          {/* Workspace content */}
          <main className="flex-1 overflow-auto pr-0 xl:pr-[26rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="h-full w-full"
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
