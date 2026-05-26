"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function WhatsAppModal({ open, onClose, onConnect }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Continue on WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <p className="text-sm text-zinc-400">Link WhatsApp for mobile reminders, quick prompts, and AI support on the go.</p>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-300">
                <span className="text-xl">💬</span>
              </div>
              <div>
                <div className="text-sm font-semibold">One-click WhatsApp setup</div>
                <div className="text-xs text-zinc-500">Open WhatsApp, send the link, and stay connected.</div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button className="w-full" onClick={onConnect}>Open WhatsApp</Button>
            <Button variant="ghost" className="w-full" onClick={onClose}>Later</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
