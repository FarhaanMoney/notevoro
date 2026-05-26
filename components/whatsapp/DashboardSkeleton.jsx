'use client';

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-zinc-900" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 rounded-3xl bg-zinc-900/80" />
          <div className="h-64 rounded-3xl bg-zinc-900/80" />
        </div>
        <div className="h-48 rounded-3xl bg-zinc-900/80" />
      </div>
    </div>
  );
}
