'use client';

import { Badge } from '@/components/ui/badge';

const TONES = {
  connected: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-200 border-amber-500/30 animate-pulse',
  disconnected: 'bg-rose-500/15 text-rose-200 border-rose-500/30',
  error: 'bg-red-500/20 text-red-200 border-red-500/40',
};

export default function StatusBadge({ status }) {
  const key = status || 'disconnected';
  const label = key.charAt(0).toUpperCase() + key.slice(1);
  return <Badge className={TONES[key] || TONES.disconnected}>{label}</Badge>;
}
