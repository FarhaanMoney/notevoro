import './globals.css';
import { Inter } from 'next/font/google';
import Head from 'next/head';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/auth/AuthProvider';

export const metadata = {
  title: 'Notevoro AI — Your AI Study Partner',
  description: 'Learn smarter with AI chat, quizzes, and flashcards. Built for students.',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </Head>
      <body className="min-h-screen bg-[#0b0b0f] text-zinc-100 antialiased">
        <AuthProvider>
          {children}
          <Toaster theme="dark" position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
