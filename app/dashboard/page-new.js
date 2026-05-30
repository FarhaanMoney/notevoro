'use client';

import { MessageSquare, NotebookPen, BookOpen, ClipboardList, LayoutDashboard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const studyTools = [
  { id: 'notes', icon: NotebookPen, title: 'Smart Notes', description: 'AI-powered notes from any topic' },
  { id: 'flashcards', icon: BookOpen, title: 'Flashcards', description: 'Study with spaced repetition' },
  { id: 'quizzes', icon: ClipboardList, title: 'Quizzes', description: 'Test your knowledge' },
  { id: 'mock-tests', icon: ClipboardList, title: 'Mock Tests', description: 'Practice exam conditions' },
  { id: 'visual-learning', icon: LayoutDashboard, title: 'Visual Learning', description: 'AI-generated diagrams' },
  { id: 'chat', icon: MessageSquare, title: 'AI Chat', description: 'Ask anything, learn anything' },
];

export default function DashboardPage({ user, onViewChange }) {
  const userName = user?.name || 'Student';
  const greeting = getGreeting();

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-semibold text-foreground">{greeting}, {userName.split(' ')[0]}</h1>
        <p className="text-muted-foreground mt-1">Continue where you left off</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground mb-6">Start something new</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studyTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card
                  key={tool.id}
                  className="p-6 cursor-pointer hover:shadow-md transition-shadow border-border bg-card"
                  onClick={() => onViewChange(tool.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground">{tool.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
