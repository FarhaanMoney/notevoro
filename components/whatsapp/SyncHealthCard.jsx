'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Radio, Wifi } from 'lucide-react';

export default function SyncHealthCard({ connectionStatus, realtimeStatus, lastActivity }) {
  const live = connectionStatus === 'connected';
  const realtimeOk = realtimeStatus === 'SUBSCRIBED';

  return (
    <Card className="border-white/10 bg-[#08080d] text-white">
      <CardHeader>
        <CardTitle className="text-lg">Sync Health</CardTitle>
        <CardDescription className="text-zinc-400">Connection, realtime, and webhook activity</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Activity className={`h-4 w-4 ${live ? 'text-emerald-400' : 'text-amber-400'}`} />
            Connection
          </div>
          <p className="mt-2 font-medium">{live ? 'Live' : 'Setup required'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Radio className={`h-4 w-4 ${realtimeOk ? 'text-sky-400' : 'text-zinc-500'}`} />
            Realtime
          </div>
          <p className="mt-2 font-medium">{realtimeOk ? 'Subscribed' : realtimeStatus || 'Connecting…'}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
          <div className="flex items-center gap-2 text-zinc-400 text-sm">
            <Wifi className="h-4 w-4 text-violet-400" />
            Last activity
          </div>
          <p className="mt-2 font-medium text-sm">
            {lastActivity ? new Date(lastActivity).toLocaleString() : 'No events yet'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
