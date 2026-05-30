'use client';

import { useRouter } from 'next/navigation';
import { 
  Home, MessageSquare, NotebookPen, BookOpen, ClipboardList, 
  LayoutDashboard, Settings, Crown, Flame, Trophy,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { useState } from 'react';

const navigationGroups = [
  {
    title: 'WORKSPACE',
    items: [
      { id: 'home', icon: Home, label: 'Home' },
      { id: 'chat', icon: MessageSquare, label: 'AI Chat' },
      { id: 'notes', icon: NotebookPen, label: 'Smart Notes' },
    ]
  },
  {
    title: 'STUDY TOOLS',
    items: [
      { id: 'flashcards', icon: BookOpen, label: 'Flashcards' },
      { id: 'quizzes', icon: ClipboardList, label: 'Quizzes' },
      { id: 'mock-tests', icon: ClipboardList, label: 'Mock Tests' },
      { id: 'visual-learning', icon: LayoutDashboard, label: 'Visual Learning' },
    ]
  },
  {
    title: 'ACCOUNT',
    items: [
      { id: 'progress', icon: Trophy, label: 'Progress' },
      { id: 'settings', icon: Settings, label: 'Settings' },
    ]
  },
];

export default function Sidebar({ user, activeView, onViewChange }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const plan = user?.plan || 'free';
  const isTrialActive = Boolean(user?.is_trial_active);
  const streak = user?.streak || 0;
  const xp = user?.xp || 0;

  return (
    <aside 
      className={`h-screen flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? 'w-[72px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="ml-3 font-semibold text-gray-900">Notevoro</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.title} className="mb-4">
            {!collapsed && (
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-gray-400 tracking-wider">
                  {group.title}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                      isActive
                        ? 'bg-[#f4f1ff] text-[#6c4cff]'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={collapsed ? item.label : ''}
                  >
                    {isActive && !collapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#6c4cff] rounded-r-full" />
                    )}
                    <Icon className={`h-4 w-4 shrink-0 ${collapsed ? 'mx-auto' : ''}`} />
                    {!collapsed && <span className="ml-3">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-gray-200 shrink-0">
        {!collapsed ? (
          <div className="space-y-3">
            {/* Plan Badge */}
            <div className="flex items-center justify-between">
              <Badge variant={isTrialActive ? 'default' : 'secondary'} className="capitalize bg-purple-100 text-purple-700 hover:bg-purple-200">
                {isTrialActive ? '7-day trial' : plan}
              </Badge>
              <button
                onClick={() => router.push('/premium')}
                className="text-xs text-purple-600 hover:underline"
              >
                Upgrade
              </button>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-2 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-gray-600">{streak} day streak</span>
            </div>

            {/* User */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
              <Avatar className="h-8 w-8">
                <div className="h-full w-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-600">
                  {user?.name?.[0] || 'U'}
                </div>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{xp} XP</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Avatar className="h-8 w-8">
              <div className="h-full w-full bg-purple-100 flex items-center justify-center text-xs font-medium text-purple-600">
                {user?.name?.[0] || 'U'}
              </div>
            </Avatar>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-2 mt-2 text-gray-400 hover:text-gray-600"
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
