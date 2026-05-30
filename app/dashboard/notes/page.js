'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NotebookPen, Plus, ArrowRight } from 'lucide-react';

const suggestedTopics = [
  'Photosynthesis',
  'Thermodynamics',
  'World War II',
  'Organic Chemistry',
];

export default function NotesPage({ user }) {
  const [hasNotes, setHasNotes] = useState(false);

  const handleCreateNote = () => {
    // TODO: Implement note creation
    console.log('Create note clicked');
  };

  const handleTopicClick = (topic) => {
    // TODO: Implement topic selection
    console.log('Topic selected:', topic);
  };

  if (!hasNotes) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Smart Notes</h1>
              <p className="text-body text-gray-500 mt-1">Generate structured study notes from any topic.</p>
            </div>
            <Button onClick={handleCreateNote}>
              <Plus className="h-4 w-4 mr-2" />
              Create Note
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <NotebookPen className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Create AI Notes</h2>
            <p className="text-body text-gray-500 mb-8">
              Generate structured study notes from any topic, PDF, image, or document.
            </p>
            <Button size="lg" onClick={handleCreateNote}>
              Create Notes
            </Button>
          </div>
        </div>

        {/* Suggested Topics */}
        <div className="px-8 pb-8">
          <Card className="premium-card p-8">
            <h3 className="text-card-title text-gray-900 mb-4">Suggested Topics</h3>
            <div className="grid grid-cols-2 gap-3">
              {suggestedTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicClick(topic)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <span className="text-body text-gray-700">{topic}</span>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              ))}
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
            <h1 className="text-page-title text-gray-900">Smart Notes</h1>
            <p className="text-body text-gray-500 mt-1">Generate structured study notes from any topic.</p>
          </div>
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
