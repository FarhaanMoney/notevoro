'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Loader2, Route } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function CampaignPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadCampaign(t) {
    const r = await fetch('/api/campaign', { headers: { Authorization: `Bearer ${t}` } });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed to load campaign');
    setData(d);
  }

  useEffect(() => {
    const sb = supabaseBrowser();
    sb.auth.getSession().then(async ({ data }) => {
      const t = data?.session?.access_token || null;
      if (!t) return router.replace('/');
      setToken(t);
      await loadCampaign(t);
    }).catch(() => router.replace('/'));
  }, [router]);

  async function startLevel(level) {
    if (!token || !level.unlocked) return;
    setLoading(true);
    try {
      const r = await fetch('/api/campaign/start', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ level_number: level.level_number }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not start');
      toast.success(`Started level ${level.level_number}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!data) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-purple-400" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card className="p-5 bg-white/[0.02] border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"><BookOpen className="h-5 w-5 text-white" /></div>
            <div>
              <h1 className="text-xl font-semibold">Campaign</h1>
              <p className="text-sm text-zinc-400">Follow the roadmap. Each level costs 5 credits.</p>
            </div>
          </div>
        </Card>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[900px] px-2 py-4 relative">
            <svg className="absolute inset-0 w-full h-32" viewBox="0 0 1000 130" preserveAspectRatio="none" aria-hidden>
              <path d="M20,65 C120,5 220,125 320,65 C420,5 520,125 620,65 C720,5 820,125 980,65" fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth="4" />
            </svg>
            <div className="relative flex items-center justify-between gap-4 h-32">
              {data.levels.map((level) => (
                <button
                  key={level.level_number}
                  onClick={() => startLevel(level)}
                  disabled={!level.unlocked || loading}
                  className={`h-14 w-14 rounded-full border-2 flex items-center justify-center text-xs font-semibold ${
                    level.completed ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' :
                    level.unlocked ? 'bg-purple-500/20 border-purple-400 text-white' :
                    'bg-zinc-800 border-zinc-600 text-zinc-400'
                  }`}
                >
                  {level.level_number}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.levels.map((level) => (
            <Card key={level.level_number} className="p-4 bg-white/[0.02] border-white/10">
              <div className="flex items-center justify-between">
                <div className="font-medium flex items-center gap-2"><Route className="h-4 w-4 text-purple-300" />Level {level.level_number}</div>
                <Badge className="bg-white/5 text-zinc-300 border-white/10 capitalize">{level.type}</Badge>
              </div>
              <p className="text-xs text-zinc-400 mt-2 capitalize">Difficulty: {level.difficulty}</p>
              <p className="text-xs text-zinc-400 mt-1">Reward: {level.reward}</p>
              <Button onClick={() => startLevel(level)} disabled={!level.unlocked || loading} className="w-full h-12 mt-3 bg-white text-black hover:bg-zinc-200">
                {level.unlocked ? 'Start Level' : 'Locked'}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
