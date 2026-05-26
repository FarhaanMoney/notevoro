'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { toast } from 'sonner';
import { PLAN_BADGE_COLORS, canUseWhatsApp } from '@/lib/plans';
import { 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Zap, 
  RefreshCw, 
  Link2, 
  Copy, 
  ExternalLink,
  Lock,
  Crown,
  AlertCircle
} from 'lucide-react';

export default function WhatsAppDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState({
    connected: false,
    verified: false,
    phoneNumber: null,
    lastActivity: null,
    totalMessages: 0,
    aiEnergyUsed: 0,
    token: null,
    tokenExpires: null
  });
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    fetchUserAndStatus();
    const intervalId = setInterval(fetchUserAndStatus, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchUserAndStatus = async () => {
    try {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      const [userRes, statusRes] = await Promise.all([
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch('/api/whatsapp/status', { headers: { Authorization: `Bearer ${session.access_token}` } })
      ]);

      const userData = await userRes.json();
      const statusData = await statusRes.json().catch(() => null);

      setUser(userData.user);

      if (!statusRes.ok) {
        console.error('WhatsApp status API error:', statusRes.status, statusData);
        toast.error(statusData?.error || statusData?.message || 'Failed to load WhatsApp status');
      } else if (statusData) {
        setWhatsappStatus(statusData);
        console.log('WhatsApp status updated:', statusData);
      }

      // Debug info in dev mode
      if (process.env.NODE_ENV === 'development') {
        setDebugInfo(statusData?.debug || null);
      }
    } catch (error) {
      console.error('Failed to fetch WhatsApp status:', error);
      toast.error('Failed to load WhatsApp status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      const res = await fetch('/api/onboarding/link-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({})
      });
      const data = await res.json();

      if (data.whatsappURL) {
        toast.success('Opening WhatsApp...');
        window.location.href = data.whatsappURL;
        await fetchUserAndStatus();
      } else {
        throw new Error(data.error || 'Failed to generate link');
      }
    } catch (error) {
      console.error('Connect error:', error);
      toast.error(error.message || 'Failed to connect WhatsApp');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        toast.success('WhatsApp disconnected successfully');
        setShowDisconnectModal(false);
        fetchUserAndStatus();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect WhatsApp');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleReconnect = async () => {
    await handleConnect();
  };

  const handleCopyLink = () => {
    const businessNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER || '';
    if (!businessNumber) {
      toast.error('WhatsApp number not configured');
      return;
    }
    const link = `https://wa.me/${businessNumber}`;
    navigator.clipboard.writeText(link);
    toast.success('WhatsApp link copied');
  };

  const handleOpenWhatsApp = () => {
    const businessNumber = process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_NUMBER || '';
    if (whatsappStatus.phoneNumber) {
      window.open(`https://wa.me/${whatsappStatus.phoneNumber.replace(/\D/g, '')}`, '_blank');
    } else if (businessNumber) {
      window.open(`https://wa.me/${businessNumber}`, '_blank');
    } else {
      toast.error('WhatsApp number not configured');
    }
  };

  const handleSendTestMessage = async () => {
    try {
      const { data: { session } } = await supabaseBrowser().auth.getSession();
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        toast.success('Test message sent');
        await fetchUserAndStatus();
      } else {
        throw new Error('Failed to send test message');
      }
    } catch (error) {
      console.error('Test message error:', error);
      toast.error('Failed to send test message');
    }
  };

  const isTrialActive = user?.is_trial_active;
  const effectivePlan = isTrialActive ? 'trial' : (user?.plan || 'free');
  const hasWhatsAppAccess = canUseWhatsApp(effectivePlan);
  const isWhatsAppConnected = whatsappStatus.connected || whatsappStatus.verified;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/60 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/60 to-black p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">WhatsApp AI</h1>
              <p className="text-zinc-400">Connect WhatsApp for AI-powered study assistance on the go</p>
            </div>
            <Badge className={`capitalize ${PLAN_BADGE_COLORS[user?.plan || 'free']}`}>
              {isTrialActive ? '7-day trial' : user?.plan}
            </Badge>
          </div>
        </div>

        {!hasWhatsAppAccess ? (
          /* Locked State for Free Users */
          <Card className="bg-white/[0.02] border-white/10">
            <CardContent className="p-12 text-center">
              <Lock className="h-16 w-16 text-zinc-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">WhatsApp AI is a Premium Feature</h2>
              <p className="text-zinc-400 mb-6">Upgrade to Pro or Premium to unlock WhatsApp AI and get instant study help on your phone.</p>
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => router.push('/premium')}
                  className="bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isWhatsAppConnected ? (
          /* Connected State */
          <div className="space-y-6">
            {/* Main Status Card */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white">WhatsApp Verified</CardTitle>
                      <CardDescription className="text-zinc-400">
                        {whatsappStatus.phoneNumber ? `Connected as +${whatsappStatus.phoneNumber.replace(/^\+?/, '')}` : 'WhatsApp is verified'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    Verified
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/[0.02] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-emerald-400" />
                      <span className="text-zinc-400 text-sm">Messages</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{whatsappStatus.totalMessages || 0}</div>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      <span className="text-zinc-400 text-sm">AI Energy Used</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{whatsappStatus.aiEnergyUsed || 0}</div>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-zinc-400 text-sm">Last Activity</span>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {whatsappStatus.lastActivity 
                        ? new Date(whatsappStatus.lastActivity).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="h-4 w-4 text-purple-400" />
                      <span className="text-zinc-400 text-sm">Plan</span>
                    </div>
                    <div className="text-lg font-bold text-white capitalize">{effectivePlan}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp AI Capabilities */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">What you can do with WhatsApp AI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {whatsappStatus.features?.map((feature, index) => (
                    <div key={index} className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                      <p className="text-sm text-zinc-300">{feature}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    onClick={handleOpenWhatsApp}
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open WhatsApp
                  </Button>
                  <Button 
                    onClick={handleSendTestMessage}
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Test
                  </Button>
                  <Button 
                    onClick={handleCopyLink}
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button 
                    onClick={() => setShowDisconnectModal(true)}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Developer Debug Section */}
            {debugInfo && process.env.NODE_ENV === 'development' && (
              <Card className="bg-white/[0.02] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Developer Debug</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs text-zinc-400 overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Not Connected State */
          <div className="space-y-6">
            <Card className="bg-white/[0.02] border-white/10">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-zinc-500/20 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-zinc-400" />
                  </div>
                  <div>
                    <CardTitle className="text-white">WhatsApp Not Connected</CardTitle>
                    <CardDescription className="text-zinc-400">
                      Connect your WhatsApp to start using AI features on the go
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-white/[0.02] rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-2">How it works:</h3>
                    <ol className="text-zinc-400 text-sm space-y-1 list-decimal list-inside">
                      <li>Click "Connect WhatsApp" below</li>
                      <li>Send the verification message to our WhatsApp number</li>
                      <li>Your account will be linked automatically</li>
                      <li>Start chatting with AI on WhatsApp!</li>
                    </ol>
                  </div>
                  <Button 
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:opacity-90"
                  >
                    {connecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Connect WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Disconnect Confirmation Modal */}
        <Dialog open={showDisconnectModal} onOpenChange={setShowDisconnectModal}>
          <DialogContent className="bg-zinc-950 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Disconnect WhatsApp?</DialogTitle>
              <DialogDescription className="text-zinc-400">
                This will unlink your WhatsApp from Notevoro. You can reconnect anytime, but your conversation history will be preserved.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDisconnectModal(false)}
                className="border-white/10 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
