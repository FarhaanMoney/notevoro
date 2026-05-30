'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BookOpen, Plus, CheckCircle } from 'lucide-react';

export default function FlashcardsPage({ user }) {
  const [hasFlashcards, setHasFlashcards] = useState(false);

  const handleCreateFlashcards = () => {
    // TODO: Implement flashcard creation
    console.log('Create flashcards clicked');
  };

  if (!hasFlashcards) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Flashcards</h1>
              <p className="text-body text-gray-500 mt-1">Generate flashcards and study using active recall.</p>
            </div>
            <Button onClick={handleCreateFlashcards}>
              <Plus className="h-4 w-4 mr-2" />
              Create Flashcards
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Create Flashcards</h2>
            <p className="text-body text-gray-500 mb-8">
              Generate flashcards and study using active recall.
            </p>
            <Button size="lg" onClick={handleCreateFlashcards}>
              Create Flashcards
            </Button>
          </div>
        </div>

        {/* Benefits Card */}
        <div className="px-8 pb-8">
          <Card className="premium-card p-8">
            <h3 className="text-card-title text-gray-900 mb-4">Benefits</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Spaced repetition</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Memory retention</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Active recall</p>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <p className="text-body text-gray-600">Long-term learning</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title text-gray-900">Flashcards</h1>
            <p className="text-body text-gray-500 mt-1">Generate flashcards and study using active recall.</p>
          </div>
          <Button onClick={handleCreateFlashcards}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        {/* Flashcard content will go here */}
      </div>
    </div>
  );
}
