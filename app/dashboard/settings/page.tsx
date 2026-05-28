'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield, Palette, Volume2, Zap, LogOut, Save } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: false,
    darkMode: true,
    soundEffects: true,
    animationsEnabled: true,
    dailyReminders: true,
  });

  const [saved, setSaved] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const settingGroups = [
    {
      title: 'Notifications',
      icon: Bell,
      items: [
        { key: 'notifications', label: 'Push Notifications', description: 'Get notified about study reminders' },
        { key: 'emailUpdates', label: 'Email Updates', description: 'Weekly progress reports and tips' },
        { key: 'dailyReminders', label: 'Daily Reminders', description: 'Study streak reminder notifications' },
      ],
    },
    {
      title: 'Preferences',
      icon: Palette,
      items: [
        { key: 'darkMode', label: 'Dark Mode', description: 'Use dark theme for the interface' },
        { key: 'animationsEnabled', label: 'Animations', description: 'Enable smooth UI animations' },
        { key: 'soundEffects', label: 'Sound Effects', description: 'Play audio cues during activities' },
      ],
    },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen w-full px-6 md:px-12 py-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">Settings</h1>
          <p className="text-zinc-400">Customize your Notevoro experience</p>
        </motion.div>

        {/* Settings Groups */}
        <div className="max-w-3xl space-y-6">
          {settingGroups.map((group) => {
            const Icon = group.icon;
            return (
              <motion.section
                key={group.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-cyan-300" />
                  <h2 className="text-xl font-bold text-white">{group.title}</h2>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                  {group.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-white">{item.label}</p>
                        <p className="text-sm text-zinc-400">{item.description}</p>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleToggle(item.key as keyof typeof settings)}
                        className={`relative h-7 w-12 rounded-full transition ${
                          settings[item.key as keyof typeof settings]
                            ? 'bg-cyan-500/30 border-cyan-400/40'
                            : 'bg-white/10 border-white/10'
                        } border`}
                      >
                        <motion.div
                          className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-lg"
                          animate={{
                            x: settings[item.key as keyof typeof settings] ? 20 : 0,
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </motion.button>
                    </div>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>

        {/* Account Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-cyan-300" />
            <h2 className="text-xl font-bold text-white">Account</h2>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left">
              <div className="space-y-1">
                <p className="font-semibold text-white">Change Password</p>
                <p className="text-sm text-zinc-400">Update your account password</p>
              </div>
              <div className="text-zinc-400">→</div>
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left">
              <div className="space-y-1">
                <p className="font-semibold text-white">Connected Apps</p>
                <p className="text-sm text-zinc-400">Manage Google and other integrations</p>
              </div>
              <div className="text-zinc-400">→</div>
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-left">
              <div className="space-y-1">
                <p className="font-semibold text-white">Data & Privacy</p>
                <p className="text-sm text-zinc-400">View and manage your data</p>
              </div>
              <div className="text-zinc-400">→</div>
            </button>
          </div>
        </motion.section>

        {/* Plan Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl space-y-4"
        >
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-cyan-300" />
            <h2 className="text-xl font-bold text-white">Subscription</h2>
          </div>

          <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-white">Current Plan: Pro</p>
                <p className="text-sm text-zinc-400">Renews on June 15, 2026</p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-semibold text-white">₹299/month</p>
                <button className="text-xs font-semibold text-violet-300 hover:text-violet-200">Manage</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-violet-400/20">
              <button className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20">
                Upgrade to Premium
              </button>
              <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
                View Benefits
              </button>
            </div>
          </div>
        </motion.section>

        {/* Danger Zone */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl space-y-4 pb-8"
        >
          <h2 className="text-xl font-bold text-rose-400">Danger Zone</h2>

          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 space-y-3">
            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 transition text-left">
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">Logout All Devices</p>
                <p className="text-sm text-rose-200/70">Sign out from all sessions</p>
              </div>
              <LogOut className="h-5 w-5 text-rose-400" />
            </button>

            <button className="w-full flex items-center justify-between p-4 rounded-xl border border-rose-400/30 bg-rose-500/10 hover:bg-rose-500/20 transition text-left">
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">Delete Account</p>
                <p className="text-sm text-rose-200/70">Permanently delete your account and data</p>
              </div>
              <div className="text-rose-400">→</div>
            </button>
          </div>
        </motion.section>

        {/* Save Button */}
        <motion.div
          className="sticky bottom-0 left-0 right-0 flex justify-center pb-6"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className={`rounded-xl px-8 py-3 font-semibold text-white shadow-[0_20px_80px_rgba(59,130,246,0.25)] transition ${
              saved
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110'
            }`}
          >
            {saved ? '✓ Saved' : <span className="flex items-center gap-2"><Save className="h-5 w-5" /> Save Changes</span>}
          </motion.button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
