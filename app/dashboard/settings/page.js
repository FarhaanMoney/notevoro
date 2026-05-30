'use client';

import { Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function SettingsPage({ user }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-8 py-6">
        <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Settings */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" defaultValue={user?.name || ''} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue={user?.email || ''} className="mt-1" disabled />
              </div>
              <Button>Save Changes</Button>
            </div>
          </Card>

          {/* More settings will go here */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Preferences</h2>
            <p className="text-muted-foreground">More settings coming soon...</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
