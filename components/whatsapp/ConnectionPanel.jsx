'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import { Link, RefreshCw, XCircle } from 'lucide-react';
export default function ConnectionPanel({
  status,
  verified,
  connecting,
  disconnecting,
  onConnect,
  onDisconnect,
  onRefresh,
}) {
  return (
    <Card className="border-white/10 bg-[#08080d] text-white transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Connection Overview</CardTitle>
            <CardDescription className="text-zinc-400">
              {verified ? 'Your WhatsApp is verified and synced with Notevoro.' : 'Complete linking to unlock WhatsApp AI features.'}
            </CardDescription>
          </div>
          <StatusBadge status={status?.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-400">Phone</p>
            <p className="mt-2 text-lg font-medium">{status?.phone_number || 'Not linked'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
            <p className="text-sm text-zinc-400">Mode</p>
            <p className="mt-2 text-lg font-medium capitalize">{status?.connect_mode || 'link'}</p>
          </div>
        </div>

        {status?.last_error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200">
            {status.last_error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={onConnect}
            disabled={connecting || status?.status === 'connected'}
            className="bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:opacity-90"
          >
            <Link className="mr-2 h-4 w-4" />
            {connecting ? 'Starting…' : status?.status === 'connected' ? 'Connected' : 'Connect WhatsApp'}
          </Button>
          <Button
            variant="outline"
            onClick={onDisconnect}
            disabled={disconnecting || status?.status !== 'connected'}
            className="border-red-500/30 text-white hover:bg-red-950/30"
          >
            <XCircle className="mr-2 h-4 w-4" />
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </Button>
          <Button variant="secondary" onClick={onRefresh} className="bg-zinc-800 text-white hover:bg-zinc-700">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
