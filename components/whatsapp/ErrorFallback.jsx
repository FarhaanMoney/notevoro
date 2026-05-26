'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorFallback({ message, onRetry }) {
  return (
    <div className="rounded-3xl border border-amber-500/30 bg-amber-950/20 p-6 text-amber-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-3">
          <p className="font-medium">Something went wrong</p>
          <p className="text-sm text-amber-200/90">{message}</p>
          {onRetry ? (
            <Button size="sm" variant="outline" onClick={onRetry} className="border-amber-500/40 text-amber-100">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
