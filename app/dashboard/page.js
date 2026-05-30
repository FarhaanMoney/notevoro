'use client';

import { MessageSquare, NotebookPen, BookOpen, ClipboardList, LayoutDashboard, ArrowRight, Flame, Coins, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const studyTools = [
  { id: 'notes', icon: NotebookPen, title: 'Smart Notes', description: 'Create AI notes from PDFs, lectures and videos.' },
  { id: 'flashcards', icon: BookOpen, title: 'Flashcards', description: 'Study using active recall and spaced repetition.' },
  { id: 'quizzes', icon: ClipboardList, title: 'Quizzes', description: 'Test your knowledge with AI-generated questions.' },
  { id: 'mock-tests', icon: ClipboardList, title: 'Mock Tests', description: 'Practice with full-length AI-powered exams.' },
  { id: 'visual-learning', icon: LayoutDashboard, title: 'Visual Learning', description: 'Turn complex concepts into visual diagrams.' },
  { id: 'chat', icon: MessageSquare, title: 'AI Chat', description: 'Your personal AI tutor for any subject.' },
];

export default function DashboardPage({ user, onViewChange }) {
  const userName = user?.name || 'Student';
  const greeting = getGreeting();
  const energy = user?.aiEnergy || 20;
  const streak = user?.streak || 0;
  const materialsCreated = user?.materialsCreated || 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <h1 className="text-page-title text-gray-900">{greeting}, {userName.split(' ')[0]}</h1>
        <p className="text-body text-gray-500 mt-2">Continue your learning journey.</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="premium-card p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-yellow-50 flex items-center justify-center">
                  <Coins className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">AI Energy</p>
                  <p className="text-2xl font-bold text-gray-900">{energy}</p>
                </div>
              </div>
            </Card>

            <Card className="premium-card p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Study Streak</p>
                  <p className="text-2xl font-bold text-gray-900">{streak} days</p>
                </div>
              </div>
            </Card>

            <Card className="premium-card p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Materials Created</p>
                  <p className="text-2xl font-bold text-gray-900">{materialsCreated}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-section-title text-gray-900 mb-6">Start Something New</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {studyTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Card
                    key={tool.id}
                    className="premium-card p-6 cursor-pointer"
                    onClick={() => onViewChange(tool.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg flex items-center justify-center" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #3b82f6 100%)'}}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <h3 className="text-card-title text-gray-900 mb-2">{tool.title}</h3>
                    <p className="text-body text-gray-500">{tool.description}</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-section-title text-gray-900 mb-6">Recent Activity</h2>
            <Card className="premium-card p-8">
              {materialsCreated > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Recent Quiz</p>
                      <p className="text-sm text-gray-500">Completed 2 hours ago</p>
                    </div>
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-body text-gray-500">No activity yet. Start creating study materials!</p>
                </div>
              )}
            </Card>
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
