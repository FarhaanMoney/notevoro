'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, Search, Plus } from 'lucide-react';
import EmptyState from '@/components/layout/EmptyState';

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
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-foreground">Quizzes</h1>
            <Button onClick={handleCreateQuiz}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quiz
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={ClipboardList}
            title="Quiz Generator"
            subtitle="Generate quizzes from notes, PDFs, flashcards, or AI notes."
            buttonText="Create Quiz"
            onButtonClick={handleCreateQuiz}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-foreground">Quizzes</h1>
          <Button onClick={handleCreateQuiz}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="border-b border-border px-8 py-4">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Quiz content will go here */}
      </div>
    </div>
  );
}
