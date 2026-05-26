"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function OnboardingShell({ children, title, subtitle, step, total, onBack }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#03040a] via-[#090b15] to-black">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-violet-300/70">Notevoro onboarding</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{title || 'Welcome to Notevoro'}</h1>
          {subtitle && <p className="mt-3 text-sm leading-6 text-zinc-400 max-w-2xl mx-auto">{subtitle}</p>}
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 mb-6">
          <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all" style={{ width: `${Math.round((step / total) * 100)}%` }} />
        </div>

        <Card className="p-6 bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="text-xs text-zinc-400">Step {step} of {total}</div>
            <div className="text-xs text-zinc-400">{Math.round((step / total) * 100)}% complete</div>
          </div>

          <div className="space-y-4">{children}</div>

          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-zinc-300" disabled={step <= 1}>Back</Button>
            <div />
          </div>
        </Card>
      </div>
    </div>
  );
}
