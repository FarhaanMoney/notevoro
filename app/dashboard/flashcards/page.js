'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import EmptyState from '@/components/layout/EmptyState';

export default function FlashcardsPage({ user }) {
  const [hasFlashcards, setHasFlashcards] = useState(false);

  const handleCreateFlashcards = () => {
    // TODO: Implement flashcard creation
    console.log('Create flashcards clicked');
  };

  if (!hasFlashcards) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-foreground">Flashcards</h1>
            <Button onClick={handleCreateFlashcards}>
              <Plus className="h-4 w-4 mr-2" />
              Create Flashcard Set
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={BookOpen}
            title="No flashcards yet"
            subtitle="Create your first flashcard set from notes or any topic."
            buttonText="Create Flashcard Set"
            onButtonClick={handleCreateFlashcards}
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
          <h1 className="text-3xl font-semibold text-foreground">Flashcards</h1>
          <Button onClick={handleCreateFlashcards}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Flashcard content will go here */}
      </div>
    </div>
  );
}
