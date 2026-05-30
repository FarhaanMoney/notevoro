'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ClipboardList, Search, Plus, CheckCircle } from 'lucide-react';

export default function QuizzesPage({ user }) {
  const [hasQuizzes, setHasQuizzes] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreateQuiz = () => {
    // TODO: Implement quiz creation
    console.log('Create quiz clicked');
  };

  if (!hasQuizzes) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Quizzes</h1>
              <p className="text-body text-gray-500 mt-1">Generate and manage AI-powered quizzes.</p>
            </div>
            <Button onClick={handleCreateQuiz}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Quiz Generator</h2>
            <p className="text-body text-gray-500 mb-8">
              Generate quizzes from notes, PDFs, flashcards, and AI notes.
            </p>
            <Button size="lg" onClick={handleCreateQuiz}>
              Create Quiz
            </Button>
          </div>
        </div>

        {/* Information Card */}
        <div className="px-8 pb-8">
          <Card className="premium-card p-8">
            <h3 className="text-card-title text-gray-900 mb-4">Why Create Quizzes?</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Improve retention</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Practice exam questions</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Identify weak areas</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Track learning progress</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title text-gray-900">Quizzes</h1>
            <p className="text-body text-gray-500 mt-1">Generate and manage AI-powered quizzes.</p>
          </div>
          <Button onClick={handleCreateQuiz}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="border-b border-gray-200 px-8 py-4 bg-white">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search quizzes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        {/* Quiz content will go here */}
      </div>
    </div>
  );
}
