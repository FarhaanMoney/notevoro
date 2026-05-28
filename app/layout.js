import './globals.css';
import AppShell from '@/components/AppShell';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Notevoro — AI Learning OS',
  description: 'A futuristic AI learning operating system for immersive visual lessons, flashcards, notes, and mock tests.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B1020] text-[#F8FAFC] antialiased">
        <AppShell>{children}</AppShell>
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
