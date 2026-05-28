'use client';

import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardNavbar } from './DashboardNavbar';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Floating Top Navbar */}
          <DashboardNavbar onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />

          {/* Workspace content */}
          <main className="flex-1 overflow-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="h-full w-full"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
