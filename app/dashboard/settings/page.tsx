'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Palette, Shield, Zap, LogOut } from 'lucide-react';

const settingsGroups = [
  {
    title: 'Notifications',
    icon: Bell,
    items: [
      { key: 'reminders', label: 'Study reminders' },
      { key: 'weeklyReport', label: 'Weekly summary' },
    ],
  },
  {
    title: 'Appearance',
    icon: Palette,
    items: [
      { key: 'reduceMotion', label: 'Reduce motion' },
      { key: 'compactMode', label: 'Compact layout' },
    ],
  },
];

export default function SettingsPage() {
  const [toggles, setToggles] = useState({
    reminders: true,
    weeklyReport: false,
    reduceMotion: false,
    compactMode: false,
  });

  const toggle = (key: keyof typeof toggles) => setToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[rgb(var(--text-tertiary))]">Settings</p>
            <h1 className="text-3xl font-semibold text-[rgb(var(--text-primary))]">Fine-tune your study experience</h1>
          </div>
          <button className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110">
            <Zap className="h-4 w-4" /> Upgrade plan
          </button>
        </div>
      </motion.section>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsGroups.map((group) => {
          const Icon = group.icon;
          return (
            <motion.section key={group.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-secondary),0.7)] p-6">
              <div className="flex items-center gap-3 text-sm font-semibold text-[rgb(var(--text-primary))]">
                <Icon className="h-5 w-5 text-cyan-400" />
                {group.title}
              </div>
              <div className="mt-5 space-y-4">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between rounded-3xl border border-[rgb(var(--border-color))] bg-[rgba(var(--bg-primary),0.95)] px-4 py-4">
                    <div>
                      <p className="font-medium text-[rgb(var(--text-primary))]">{item.label}</p>
                    </div>
                    <button onClick={() => toggle(item.key as keyof typeof toggles)} className={`relative inline-flex h-9 w-16 items-center rounded-full transition ${toggles[item.key as keyof typeof toggles] ? 'bg-cyan-500' : 'bg-[rgb(var(--border-color))]'}`}>
                      <span className={`absolute left-1 h-7 w-7 rounded-full bg-white transition ${toggles[item.key as keyof typeof toggles] ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.section>
          );
        })}
      </div>

      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="rounded-[32px] border border-rose-400/30 bg-[rgba(255,0,0,0.04)] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-rose-300">Danger zone</p>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Sensitive account actions are listed here.</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-3xl border border-rose-300/50 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20">
            <LogOut className="h-4 w-4" /> Logout All Devices
          </button>
        </div>
      </motion.section>
    </div>
  );
}
