'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarSeparator, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut } from '@/components/ui/dropdown-menu';
import { Search, Bell, Sparkles, BookOpen, ClipboardList, MessageSquare, Trophy, Compass, Settings, LogOut, Menu, ChevronDown, Star, Archive, User } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase/browser';
import CommandPalette from '@/components/CommandPalette';

const MAIN_WORLDS = [
  { title: 'Home', href: '/', icon: Sparkles, description: 'Central learning hub' },
  { title: 'Visual Learning', href: '/visual-learning', icon: Sparkles, description: 'Immersive lesson studio' },
  { title: 'Flashcard Lab', href: '/flashcards', icon: BookOpen, description: 'Memory training lab' },
  { title: 'AI Notes', href: '/ai-notes', icon: ClipboardList, description: 'Smart note workspace' },
  { title: 'Mock Test Center', href: '/mock-test', icon: Trophy, description: 'Exam prep arena' },
  { title: 'AI Companion', href: '/ai-companion', icon: MessageSquare, description: 'Personalized learning partner' },
  { title: 'Library', href: '/library', icon: Archive, description: 'Saved lessons & resources' },
  { title: 'Profile', href: '/profile', icon: User, description: 'Account & achievements' },
];

const QUICK_ACTIONS = [
  { title: 'Launch Visual Lesson', href: '/visual-learning', icon: Sparkles },
  { title: 'Start Flashcards', href: '/flashcards', icon: BookOpen },
  { title: 'Create AI Note', href: '/ai-notes', icon: ClipboardList },
  { title: 'Begin Mock Test', href: '/mock-test', icon: Trophy },
];

const AI_TOOLS = [
  { title: 'Study Companion', href: '/ai-companion', icon: MessageSquare },
  { title: 'Search Lessons', href: '/library', icon: Compass },
  { title: 'Settings', href: '/settings', icon: Settings },
];

const RECENT_LESSONS = [
  { title: 'Quantum Fields', subtitle: 'Animated concept map', time: '12 min' },
  { title: 'Photosynthesis', subtitle: 'Light, chlorophyll, energy', time: '9 min' },
  { title: 'APIs in Motion', subtitle: 'Request/response flow', time: '7 min' },
];

const FAVORITES = [
  { title: 'Spacetime Canvas' },
  { title: 'Memory Journey' },
  { title: 'Exam Vault' },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openPalette, setOpenPalette] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [user, setUser] = useState({ name: 'Nova', energy: 18, xp: 1620, streak: 7 });

  useEffect(() => {
    const hydrateUser = async () => {
      try {
        const sb = supabaseBrowser();
        const { data } = await sb.auth.getSession();
        if (!data?.session?.access_token) return;

        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });

        if (!response.ok) return;
        const payload = await response.json();
        const profile = payload.user;

        if (profile) {
          setUser({
            name: profile.user_metadata?.full_name || profile.email?.split('@')[0] || 'Nova',
            energy: typeof profile.aiEnergy === 'number' ? profile.aiEnergy : 18,
            xp: typeof profile.xp === 'number' ? profile.xp : 1620,
            streak: typeof profile.streak === 'number' ? profile.streak : 7,
          });
        }
      } catch (error) {
        console.error('Failed to hydrate user', error);
      }
    };

    hydrateUser();
  }, []);

  const handleLogout = async () => {
    try {
      await supabaseBrowser().auth.signOut();
    } catch (error) {
      console.error('Logout failed', error);
    }
    router.push('/');
  };

  const commandItems = useMemo(
    () => [
      ...MAIN_WORLDS.map((item) => ({
        id: `world-${item.href}`,
        label: item.title,
        description: item.description,
        action: () => router.push(item.href),
        shortcut: item.title === 'Home' ? '⌘H' : undefined,
      })),
      ...QUICK_ACTIONS.map((item) => ({
        id: `action-${item.href}`,
        label: item.title,
        description: 'Quick start action',
        action: () => router.push(item.href),
        shortcut: '⌘K',
      })),
      ...AI_TOOLS.map((item) => ({
        id: `tool-${item.href}`,
        label: item.title,
        description: 'AI workspace tool',
        action: () => router.push(item.href),
      })),
      {
        id: 'logout',
        label: 'Logout',
        description: 'Sign out of Notevoro',
        action: handleLogout,
        shortcut: '⇧⌘Q',
      },
    ],
    [router]
  );

  const hideShell = ['/auth', '/onboarding'].some((prefix) => pathname?.startsWith(prefix));
  if (hideShell) {
    return <>{children}</>;
  }

  const filteredRecent = RECENT_LESSONS.filter((item) => item.title.toLowerCase().includes(searchValue.toLowerCase()) || item.subtitle.toLowerCase().includes(searchValue.toLowerCase()));

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex bg-[#0B1020] text-white">
        <Sidebar className="max-w-[18rem] border-r border-white/10 bg-[#071127]/95 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
          <SidebarHeader className="px-4 py-5">
            <Link href="/" className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-3xl bg-gradient-to-br from-purple-500 to-cyan-400 text-white shadow-xl shadow-cyan-500/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="hidden xl:block">
                <p className="text-sm font-semibold">Notevoro OS</p>
                <p className="text-xs text-slate-400">Future of learning</p>
              </div>
            </Link>
          </SidebarHeader>
          <SidebarSeparator />

          <SidebarContent className="space-y-5 px-3 pb-6 pt-2">
            <SidebarGroup>
              <SidebarGroupLabel>Main Worlds</SidebarGroupLabel>
              <SidebarMenu>
                {MAIN_WORLDS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      onClick={() => router.push(item.href)}
                      isActive={pathname === item.href}
                      className="group flex items-center gap-3"
                    >
                      <item.icon className="h-4 w-4 text-cyan-300" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>Quick actions</SidebarGroupLabel>
              <SidebarMenu>
                {QUICK_ACTIONS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      onClick={() => router.push(item.href)}
                      className="group flex items-center gap-3"
                    >
                      <item.icon className="h-4 w-4 text-slate-300" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>

            <SidebarSeparator />

            <SidebarGroup>
              <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
              <SidebarMenu>
                {AI_TOOLS.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      onClick={() => router.push(item.href)}
                      className="group flex items-center gap-3"
                    >
                      <item.icon className="h-4 w-4 text-slate-300" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="px-4 pb-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-slate-400">AI learner profile</p>
                </div>
                <Badge variant="secondary" className="rounded-full px-2 py-1 text-[11px]">
                  {user.streak}d streak
                </Badge>
              </div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-[#08101f]/95 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">AI Energy</p>
                  <p className="text-sm font-semibold text-white">{user.energy} / 20</p>
                </div>
                <div className="rounded-2xl bg-[#08101f]/95 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">XP</p>
                  <p className="text-sm font-semibold text-white">{user.xp.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 bg-[#08131e]">
          <div className="sticky top-0 z-30 border-b border-white/10 bg-[#08131e]/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="md:hidden" />
                <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm shadow-black/10 backdrop-blur-lg">
                  <div className="flex items-center gap-3 text-sm text-slate-200">
                    <Search className="h-4 w-4 text-cyan-300" />
                    <button
                      onClick={() => setOpenPalette(true)}
                      className="text-left text-sm text-slate-300 hover:text-white"
                    >
                      Cmd + K — search worlds, lessons, tools
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden gap-3 md:flex">
                <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                  <Bell className="h-4 w-4 text-cyan-300" /> Notifications
                </button>
                <button className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                  <Star className="h-4 w-4 text-amber-300" /> New streak
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 rounded-3xl border border-white/10 bg-[#09131f]/90 px-4 py-3">
                  <div className="rounded-2xl bg-cyan-500/10 px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-300">Energy</div>
                  <div className="text-sm text-slate-200">{user.energy}/20</div>
                </div>
                <div className="hidden sm:flex items-center gap-3 rounded-3xl border border-white/10 bg-[#09131f]/90 px-4 py-3">
                  <div className="rounded-2xl bg-violet-500/10 px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-violet-300">XP</div>
                  <div className="text-sm text-slate-200">{user.xp.toLocaleString()}</div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-2 rounded-3xl border border-white/10 bg-[#09131f]/90 px-4 py-3 text-sm text-white transition hover:bg-white/10">
                      <span>{user.name}</span>
                      <ChevronDown className="h-4 w-4 text-slate-300" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Profile menu</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => router.push('/profile')}>
                      Profile
                      <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push('/settings')}>
                      Settings
                      <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push('/library')}>
                      Library
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout}>
                      Logout
                      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>

          <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#071127]/95 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              {MAIN_WORLDS.slice(0, 4).map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`flex min-w-[0] flex-1 flex-col items-center rounded-3xl px-3 py-2 text-[11px] transition ${pathname === item.href ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                >
                  <item.icon className="mb-1 h-4 w-4" />
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </SidebarInset>

        <CommandPalette open={openPalette} onOpenChange={setOpenPalette} commands={commandItems} />
      </div>
    </SidebarProvider>
  );
}
