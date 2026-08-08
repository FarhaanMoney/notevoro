'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import {
  LayoutDashboard, Users, FileText, BookOpen, Sparkles, BarChart3,
  Calendar, Settings, LogOut, Crown, GraduationCap, Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VoroAvatarFox } from '@/components/voro/VoroAvatar'

const nav = [
  { href: '/educator/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/educator/classrooms', label: 'Classrooms', icon: Users },
  { href: '/educator/assignments', label: 'Assignments', icon: FileText },
  { href: '/educator/resources', label: 'Resources', icon: BookOpen },
  { href: '/educator/voro', label: 'Voro Assistant', icon: Sparkles },
  { href: '/educator/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/educator/calendar', label: 'Calendar', icon: Calendar },
  { href: '/educator/settings', label: 'Settings', icon: Settings },
]

export function EducatorSidebar({ user, profile, previewMode }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    if (previewMode) return
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (profile?.display_name || profile?.full_name || user?.email || 'U').slice(0, 1).toUpperCase()

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-border bg-card/40 backdrop-blur flex flex-col">
      <div className="p-5 border-b border-border">
        <Link href="/educator/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Notevoro</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
        {nav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/educator/dashboard' && pathname?.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-foreground border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}>
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className="rounded-xl p-3 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-primary/20 cursor-pointer hover:border-primary/40 transition">
          <div className="flex items-center gap-2 mb-1">
            <VoroAvatarFox size="sm" />
            <span className="text-xs font-semibold">🦊 Voro</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Your AI Teaching Assistant</p>
        </div>
        <div className="rounded-xl p-3 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold">Free plan</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">Upgrade for unlimited AI & classroom features.</p>
          <Button size="sm" className="w-full h-7 text-xs bg-gradient-to-r from-violet-500 to-pink-500" onClick={() => window.location.href = '/educator/settings'}>Upgrade to Pro</Button>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">{initial}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile?.display_name || profile?.full_name || 'Educator'}</div>
            <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={logout} title="Logout" className="h-8 w-8"><LogOut className="w-4 h-4" /></Button>
        </div>
      </div>
    </aside>
  )
}
