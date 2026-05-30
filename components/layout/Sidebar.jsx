'use client';

import { useRouter } from 'next/navigation';
import { 
  Home, MessageSquare, NotebookPen, BookOpen, ClipboardList, 
  LayoutDashboard, Settings, Crown, Coins, Flame, Trophy,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useState } from 'react';

const navigationItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
  { id: 'notes', icon: NotebookPen, label: 'Smart Notes' },
  { id: 'flashcards', icon: BookOpen, label: 'Flashcards' },
  { id: 'quizzes', icon: ClipboardList, label: 'Quizzes' },
  { id: 'mock-tests', icon: ClipboardList, label: 'Mock Tests' },
  { id: 'visual-learning', icon: LayoutDashboard, label: 'Visual Learning' },
  { id: 'progress', icon: Trophy, label: 'Progress' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ user, activeView, onViewChange }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const plan = user?.plan || 'free';
  const isTrialActive = Boolean(user?.is_trial_active);
  const energy = typeof user?.aiEnergy === 'number' ? user.aiEnergy : 20;
  const energyMax = typeof user?.aiEnergy_max === 'number' ? user.aiEnergy_max : 20;
  const energyDisplay = plan === 'premium' ? 'Unlimited' : energy;
  const streak = user?.streak || 0;
  const xp = user?.xp || 0;

  return (
    <aside 
      className={`h-screen flex flex-col bg-background border-r border-border transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="ml-3 font-semibold text-foreground">Notevoro</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
              title={collapsed ? item.label : ''}
            >
              <Icon className={`h-4 w-4 shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-border shrink-0">
        {!collapsed ? (
          <div className="space-y-3">
            {/* Plan Badge */}
            <div className="flex items-center justify-between">
              <Badge variant={isTrialActive ? 'default' : 'secondary'} className="capitalize">
                {isTrialActive ? '7-day trial' : plan}
              </Badge>
              <button
                onClick={() => router.push('/premium')}
                className="text-xs text-primary hover:underline"
              >
                Upgrade
              </button>
            </div>

            {/* Energy */}
            <div className="flex items-center gap-2 text-sm">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="text-muted-foreground">{energyDisplay} AI Energy</span>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground">{streak} day streak</span>
            </div>

            {/* User */}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Avatar className="h-8 w-8">
                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                  {user?.name?.[0] || 'U'}
                </div>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{xp} XP</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8">
              <div className="h-full w-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {user?.name?.[0] || 'U'}
              </div>
            </Avatar>
            <Coins className="h-4 w-4 text-yellow-500" />
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 mt-2 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
