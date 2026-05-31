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
    console.log('Dashboard layout: useEffect mounted, loading:', loading, 'authChecked:', authChecked);
    const sb = supabaseBrowser();
    
    const checkAuth = async () => {
      console.log('Dashboard layout: checkAuth called, authChecked:', authChecked);
      if (authChecked) {
        console.log('Dashboard layout: auth already checked, skipping');
        return;
      }
      
      try {
        console.log('Dashboard layout: Checking auth...');
        const { data: { user }, error } = await sb.auth.getUser();
        console.log('Dashboard layout: User from getUser:', user);
        console.log('Dashboard layout: Error from getUser:', error);
        
        if (error || !user) {
          console.log('Dashboard layout: No user, redirecting to home');
          router.replace('/');
          return;
        }

        const { data: { session } } = await sb.auth.getSession();
        console.log('Dashboard layout: Session from getSession:', session);
        console.log('Dashboard layout: Session access token exists:', !!session?.access_token);
        
        console.log('Dashboard layout: Fetching /api/auth/me...');
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        
        console.log('Dashboard layout: /api/auth/me response status:', response.status);
        
        if (response.status === 401) {
          console.log('Dashboard layout: 401 from auth/me, redirecting to home');
          router.replace('/');
          return;
        }
        
        if (!response.ok) {
          console.log('Dashboard layout: auth/me response not ok:', response.status, 'staying in loading state');
          return;
        }
        
        const data = await response.json();
        console.log('Dashboard layout: User data from auth/me:', data);
        const isOnboardingComplete = data.user?.personalization?.onboarding_completed || 
                                       data.user?.onboardingStep === 'completed' || 
                                       Boolean(data.user?.onboardingCompletedAt);
        
        console.log('Dashboard layout: isOnboardingComplete:', isOnboardingComplete);
        
        if (!isOnboardingComplete) {
          console.log('Dashboard layout: Onboarding not complete, redirecting to /onboarding');
          router.replace('/onboarding');
          return;
        }
        
        console.log('Dashboard layout: Setting user and loading to false');
        setUser(data.user);
        setLoading(false);
        setAuthChecked(true);
        console.log('Dashboard layout: Auth check complete, user set, loading false');
      } catch (error) {
        console.error('Dashboard layout: Auth check failed:', error);
        router.replace('/');
      }
    };

    checkAuth();

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        router.replace('/');
      } else {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          const { data: { session } } = await sb.auth.getSession();
          const response = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${session?.access_token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          }
        }
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
