import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Notevoro AI — Your AI Study Partner',
  description: 'Learn smarter with AI chat, quizzes, and flashcards. Built for students.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b0b0f] text-zinc-100 antialiased">
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
