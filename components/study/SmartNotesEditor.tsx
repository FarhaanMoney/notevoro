"use client";
import React from 'react';

export default function SmartNotesEditor({}: {}) {
  return (
    <div className="h-full w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Smart Notes</h2>
        <div className="text-sm text-muted-foreground">AI-assisted editor</div>
      </div>

      <div className="flex-1 overflow-auto rounded-md border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.5)] p-4">
        <textarea
          className="w-full h-[60vh] resize-none bg-transparent outline-none text-[var(--text-primary)]"
          placeholder="Start taking smart notes... Ask the AI to summarize, extract flashcards, or create quizzes."
        />
      </div>
    </div>
  );
}
