'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NotebookPen, Plus } from 'lucide-react';
import EmptyState from '@/components/layout/EmptyState';

export default function NotesPage({ user }) {
  const [hasNotes, setHasNotes] = useState(false);

  const handleCreateNote = () => {
    // TODO: Implement note creation
    console.log('Create note clicked');
  };

  if (!hasNotes) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-gray-900">Smart Notes</h1>
            <Button onClick={handleCreateNote}>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={NotebookPen}
            title="No notes yet"
            subtitle="Create your first AI-powered note from any topic."
            buttonText="Create Note"
            onButtonClick={handleCreateNote}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-8 py-6 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-gray-900">Smart Notes</h1>
          <Button onClick={handleCreateNote}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        {/* Notes content will go here */}
      </div>
    </div>
  );
}
