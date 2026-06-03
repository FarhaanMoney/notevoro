'use client';

import Sidebar from '@/components/layout/Sidebar';

export default function DashboardShell({ children }) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
