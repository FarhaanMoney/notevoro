'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LayoutDashboard, Plus, ArrowRight } from 'lucide-react';

const visualExamples = [
  'Mind Maps',
  'Flow Charts',
  'Concept Maps',
  'Process Diagrams',
];

export default function VisualLearningPage({ user }) {
  const [hasVisualLearning, setHasVisualLearning] = useState(false);

  const handleGenerateVisual = () => {
    // TODO: Implement visual learning generation
    console.log('Generate visual learning clicked');
  };

  const handleExampleClick = (example) => {
    // TODO: Implement example selection
    console.log('Example selected:', example);
  };

  if (!hasVisualLearning) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 px-8 py-6 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-gray-900">Visual Learning</h1>
              <p className="text-body text-gray-500 mt-1">Turn complex concepts into easy-to-understand diagrams.</p>
            </div>
            <Button onClick={handleGenerateVisual}>
              <Plus className="h-4 w-4 mr-2" />
              Create Diagram
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="text-center max-w-md">
            <div className="h-20 w-20 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-6">
              <LayoutDashboard className="h-10 w-10 text-purple-500" />
            </div>
            <h2 className="text-section-title text-gray-900 mb-3">Visual Learning</h2>
            <p className="text-body text-gray-500 mb-8">
              Turn complex concepts into easy-to-understand diagrams.
            </p>
            <Button size="lg" onClick={handleGenerateVisual}>
              Create Diagram
            </Button>
          </div>
        </div>

        {/* Examples Card */}
        <div className="px-8 pb-8">
          <Card className="premium-card p-8">
            <h3 className="text-card-title text-gray-900 mb-4">Examples</h3>
            <div className="grid grid-cols-2 gap-3">
              {visualExamples.map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <span className="text-body text-gray-700">{example}</span>
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
            <h1 className="text-page-title text-gray-900">Visual Learning</h1>
            <p className="text-body text-gray-500 mt-1">Turn complex concepts into easy-to-understand diagrams.</p>
          </div>
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
