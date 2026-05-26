'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, MessageCircle, ShieldCheck } from 'lucide-react';
import { useWhatsAppDashboard } from '@/hooks/useWhatsAppDashboard';
import ConnectionPanel from '@/components/whatsapp/ConnectionPanel';
import SyncHealthCard from '@/components/whatsapp/SyncHealthCard';
import MessagesPanel from '@/components/whatsapp/MessagesPanel';
import DashboardSkeleton from '@/components/whatsapp/DashboardSkeleton';
import ErrorFallback from '@/components/whatsapp/ErrorFallback';

function WhatsAppDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    status,
    verified,
    messages,
    loading,
    connecting,
    disconnecting,
    realtimeStatus,
    error,
    connect,
    disconnect,
    refresh,
  } = useWhatsAppDashboard();

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    const message = searchParams.get('message');
    if (oauth === 'success') {
      toast.success('WhatsApp authorized successfully');
      refresh();
    } else if (oauth === 'error') {
      toast.error(message || 'WhatsApp authorization failed');
    }
  }, [searchParams, refresh]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-[#050505] p-4 md:p-6 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp AI
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">WhatsApp Dashboard</h1>
            <p className="mt-2 text-sm text-zinc-400 max-w-xl">
              Connect your number, monitor sync health, and view live message activity — powered by Supabase realtime.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="border-zinc-700 text-white hover:bg-zinc-900 w-full md:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to app
          </Button>
        </header>

        {error ? <ErrorFallback message={error} onRetry={refresh} /> : null}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <ConnectionPanel
              status={status}
              verified={verified}
              connecting={connecting}
              disconnecting={disconnecting}
              onConnect={connect}
              onDisconnect={disconnect}
              onRefresh={refresh}
            />
            <SyncHealthCard
              connectionStatus={status?.status}
              realtimeStatus={realtimeStatus}
              lastActivity={status?.last_activity}
            />
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#08080d] p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Secure server-side tokens and webhook signature validation
              </div>
              <p className="text-xs text-zinc-500">
                Plan: {user?.plan || 'free'}
                {status?.status === 'pending'
                  ? ' — Finish linking via WhatsApp message or Meta OAuth to leave pending state.'
                  : ''}
              </p>
            </div>
            <MessagesPanel messages={messages} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatsAppDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <WhatsAppDashboardContent />
    </Suspense>
  );
}
