'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import DashboardPage from './page';
import QuizzesPage from './quizzes/page';
import FlashcardsPage from './flashcards/page';
import NotesPage from './notes/page';
import MockTestsPage from './mock-tests/page';
import VisualLearningPage from './visual-learning/page';
import ChatPage from './chat/page';
import ProgressPage from './progress/page';
import SettingsPage from './settings/page';

export default function DashboardClient({ user, children }) {
  const [activeView, setActiveView] = useState('home');

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <DashboardPage user={user} onViewChange={setActiveView} />;
      case 'quizzes':
        return <QuizzesPage user={user} />;
      case 'flashcards':
        return <FlashcardsPage user={user} />;
      case 'notes':
        return <NotesPage user={user} />;
      case 'mock-tests':
        return <MockTestsPage user={user} />;
      case 'visual-learning':
        return <VisualLearningPage user={user} />;
      case 'chat':
        return <ChatPage user={user} />;
      case 'progress':
        return <ProgressPage user={user} />;
      case 'settings':
        return <SettingsPage user={user} />;
      default:
        return <DashboardPage user={user} onViewChange={setActiveView} />;
    }
  };

  return (
    <div className="flex h-screen bg-white">
      <Sidebar user={user} activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 min-w-0 flex flex-col">
        {renderView()}
      </main>
    </div>
  );
}
