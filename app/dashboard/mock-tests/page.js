'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus } from 'lucide-react';
import EmptyState from '@/components/layout/EmptyState';

export default function MockTestsPage({ user }) {
  const [hasMockTests, setHasMockTests] = useState(false);

  const handleCreateMockTest = () => {
    // TODO: Implement mock test creation
    console.log('Create mock test clicked');
  };

  if (!hasMockTests) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-foreground">Mock Tests</h1>
            <Button onClick={handleCreateMockTest}>
              <Plus className="h-4 w-4 mr-2" />
              Create Mock Test
            </Button>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={ClipboardList}
            title="No mock tests yet"
            subtitle="Create your first mock test to practice exam conditions."
            buttonText="Create Mock Test"
            onButtonClick={handleCreateMockTest}
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
          <h1 className="text-3xl font-semibold text-foreground">Mock Tests</h1>
          <Button onClick={handleCreateMockTest}>
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        {/* Mock test content will go here */}
      </div>
    </div>
  );
}
