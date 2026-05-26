'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
export default function MessagesPanel({ messages }) {
  return (
    <Card className="border-white/10 bg-[#08080d] text-white">
      <CardHeader>
        <CardTitle className="text-lg">Recent Messages</CardTitle>
        <CardDescription className="text-zinc-400">Latest inbound and outbound WhatsApp activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
        {messages.length ? (
          messages.map((message) => (
            <div
              key={message.id}
              className="rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-white/20"
            >
              <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wider text-zinc-500">
                <span>{message.direction}</span>
                <span>{new Date(message.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-100">{message.text || '—'}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No messages synced yet. Send a message to your Notevoro WhatsApp number after connecting.</p>
        )}
      </CardContent>
    </Card>
  );
}
