'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

const VisualCanvas = dynamic(() => import('@/components/visual-explanation/VisualCanvas'), { ssr: false });

export default function RightPanel({ visual }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 rounded-lg overflow-hidden">
        <Suspense fallback={<div className="h-full flex items-center justify-center text-zinc-400">Loading visual…</div>}>
          <VisualCanvas visual={visual || undefined} />
        </Suspense>
      </div>
    </div>
  );
}
