'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, MessageCircle, ShieldCheck, Lock, Crown } from 'lucide-react';
import { useWhatsAppDashboard } from '@/hooks/useWhatsAppDashboard';
import ConnectionPanel from '@/components/whatsapp/ConnectionPanel';
import SyncHealthCard from '@/components/whatsapp/SyncHealthCard';
import MessagesPanel from '@/components/whatsapp/MessagesPanel';
import DashboardSkeleton from '@/components/whatsapp/DashboardSkeleton';
import ErrorFallback from '@/components/whatsapp/ErrorFallback';

function LockedFeatureView({ feature, need, onUpgrade, router }) {
  return (
    <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-[380px] w-[700px] rounded-full bg-purple-500/15 blur-[120px]" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-[110px]" />
      </div>
      <Card className="max-w-md w-full p-8 bg-white/[0.03] border-white/10 text-center backdrop-blur relative">
        <div className="h-14 w-14 rounded-2xl bg-black/80 flex items-center justify-center mx-auto mb-4">
          <Lock className="h-6 w-6 text-purple-200" />
        </div>
        <h2 className="text-xl font-semibold mb-2 text-white">{feature} is locked</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Upgrade to <span className="text-purple-300 font-medium">{need}</span> to unlock {feature.toLowerCase()} and more.
        </p>
        <div className="grid gap-2">
          <Button onClick={() => router.push('/premium')} className="h-12 bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90">
            <Crown className="h-4 w-4 mr-2" />Upgrade now
          </Button>
          <div className="text-[11px] text-zinc-500">
            Tip: Upgrade to Pro or Premium to unlock WhatsApp AI.
          </div>
        </div>
      </Card>
    </div>
  );
}

function WhatsAppDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showLockedView, setShowLockedView] = useState(false);
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

  // Check if user is free
  useEffect(() => {
    if (user && user.plan === 'free' && !user.is_trial_active) {
      setShowLockedView(true);
    }
  }, [user]);

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

  if (showLockedView) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-[#050505] p-4 md:p-6 text-white flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp AI
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">WhatsApp Dashboard</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="border-zinc-700 text-white hover:bg-zinc-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <LockedFeatureView feature="WhatsApp AI" need="Pro" onUpgrade={() => router.push('/premium')} router={router} />
      </div>
    );
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
