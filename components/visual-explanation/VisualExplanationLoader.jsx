'use client';

export default function VisualExplanationLoader() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-1/3 rounded-full bg-zinc-800 animate-pulse" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-3xl bg-zinc-900 animate-pulse" />
        <div className="h-40 rounded-3xl bg-zinc-900 animate-pulse" />
      </div>
      <div className="space-y-3">
        <div className="h-12 rounded-3xl bg-zinc-900 animate-pulse" />
        <div className="h-12 rounded-3xl bg-zinc-900 animate-pulse" />
        <div className="h-12 rounded-3xl bg-zinc-900 animate-pulse" />
      </div>
    </div>
  );
}
