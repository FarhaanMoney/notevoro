"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardingShell({ children, title, subtitle, step, total, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-black via-slate-900 to-black">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-white">{title || 'Welcome to Notevoro'}</h1>
          {subtitle && <p className="text-sm text-zinc-400 mt-2">{subtitle}</p>}
        </div>

        <Card className="p-6 bg-white/[0.03] border-white/5">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-xs text-zinc-400">Step {step} of {total}</div>
            <div className="text-xs text-zinc-400">{Math.round((step/total)*100)}%</div>
          </div>

          <div className="space-y-4">{children}</div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-300">Back</Button>
            <div />
          </div>
        </Card>
      </div>
    </div>
  );
}
