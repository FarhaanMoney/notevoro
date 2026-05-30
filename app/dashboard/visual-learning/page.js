'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Plus } from 'lucide-react';
import EmptyState from '@/components/layout/EmptyState';

export default function VisualLearningPage({ user }) {
  const [hasVisualLearning, setHasVisualLearning] = useState(false);

  const handleGenerateVisual = () => {
    // TODO: Implement visual learning generation
    console.log('Generate visual learning clicked');
  };

  if (!hasVisualLearning) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-gray-900">Visual Learning</h1>
            <Button onClick={handleGenerateVisual}>
              <Plus className="h-4 w-4 mr-2" />
              Generate Visual Learning
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={LayoutDashboard}
            title="No visual explanations yet"
            subtitle="Generate AI-powered diagrams and visual learning tools."
            buttonText="Generate Visual Learning"
            onButtonClick={handleGenerateVisual}
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
          <h1 className="text-3xl font-semibold text-gray-900">Visual Learning</h1>
          <Button onClick={handleGenerateVisual}>
            <Plus className="h-4 w-4 mr-2" />
            Generate New
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8 bg-gray-50">
        {/* Visual learning content will go here */}
      </div>
    </div>
  );
}
