"use client";
import React from 'react';

export default function VisualCanvas() {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Visual Learning Canvas</h2>
        <div className="text-sm text-muted-foreground">Simple drawing area</div>
      </div>
      <div className="flex-1 rounded-md border bg-[rgba(var(--bg-secondary),0.5)]">
        <div className="w-full h-[60vh] flex items-center justify-center text-muted-foreground">Canvas preview (placeholder)</div>
      </div>
    </div>
  );
}
