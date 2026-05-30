'use client';

import { Trophy, Flame, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ProgressPage({ user }) {
  const xp = user?.xp || 0;
  const streak = user?.streak || 0;
  const level = user?.level || 1;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-semibold text-foreground">Progress</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Total XP</span>
              </div>
              <p className="text-3xl font-semibold text-foreground">{xp}</p>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-sm text-muted-foreground">Day Streak</span>
              </div>
              <p className="text-3xl font-semibold text-foreground">{streak}</p>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-5 w-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Level</span>
              </div>
              <p className="text-3xl font-semibold text-foreground">{level}</p>
            </Card>
          </div>

          {/* More progress content will go here */}
          <Card className="p-6">
            <p className="text-muted-foreground">Detailed progress tracking coming soon...</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
