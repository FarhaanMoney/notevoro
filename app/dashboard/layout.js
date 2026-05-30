'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/browser';
import Sidebar from '@/components/layout/Sidebar';
import { Loader2 } from 'lucide-react';
import DashboardPage from './page';
import QuizzesPage from './quizzes/page';
import FlashcardsPage from './flashcards/page';
import NotesPage from './notes/page';
import MockTestsPage from './mock-tests/page';
import VisualLearningPage from './visual-learning/page';
import ChatPage from './chat/page';
import ProgressPage from './progress/page';
import SettingsPage from './settings/page';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    
    const checkAuth = async () => {
      if (authChecked) return;
      
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (!session?.access_token) {
          router.replace('/');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        
        if (response.status === 401) {
          router.replace('/');
          return;
        }
        
        if (!response.ok) return;
        
        const data = await response.json();
        const isOnboardingComplete = data.user?.personalization?.onboarding_completed || 
                                       data.user?.onboardingStep === 'completed' || 
                                       Boolean(data.user?.onboardingCompletedAt);
        
        if (!isOnboardingComplete) {
          router.replace('/onboarding');
          return;
        }
        
        setUser(data.user);
        setLoading(false);
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/');
      }
    };

    checkAuth();

    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token) {
        router.replace('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, authChecked]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
