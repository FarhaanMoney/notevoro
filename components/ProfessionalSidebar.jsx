'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, LayoutDashboard, Folder, CheckSquare, Search, FileText, Calendar, BarChart3, Users, Zap, Settings, Sparkles } from 'lucide-react'
import { VoroAvatarFox } from '@/components/voro/VoroAvatar'

const mainNav = [
  { href: '/professional/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/professional/projects', label: 'Projects', icon: Folder },
  { href: '/professional/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/professional/research', label: 'Research', icon: Search },
  { href: '/professional/documents', label: 'Documents', icon: FileText },
  { href: '/professional/voro', label: 'Voro', icon: Sparkles },
]

const workspaceNav = [
  { href: '/professional/calendar', label: 'Calendar', icon: Calendar },
  { href: '/professional/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/professional/team', label: 'Team', icon: Users },
  { href: '/professional/integrations', label: 'Integrations', icon: Zap },
]

const accountNav = [
  { href: '/professional/settings', label: 'Settings', icon: Settings },
]

export function ProfessionalSidebar({ user, profile, previewMode }) {
  const pathname = usePathname()
  const initial = (profile?.display_name || profile?.full_name || user?.email || 'P').slice(0, 1).toUpperCase()

  return (
    <aside className="w-72 shrink-0 h-screen sticky top-0 border-r border-border bg-card/40 backdrop-blur flex flex-col">
      <div className="p-5 border-b border-border">
        <Link href="/professional/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight">Notevoro Pro</div>
            <div className="text-xs text-muted-foreground">Professional workspace</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground mb-2">Main</div>
        {mainNav.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${isActive ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-foreground border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}

        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground mt-6 mb-2">Workspace</div>
        {workspaceNav.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${isActive ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-foreground border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-4">
        <div className="rounded-3xl bg-card/80 p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-semibold">{initial}</div>
            <div>
              <div className="text-sm font-medium truncate">{profile?.display_name || profile?.full_name || 'Professional'}</div>
              <div className="text-[11px] text-muted-foreground truncate">{profile?.email || user?.email || 'pro@notevoro.app'}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-primary/20 p-4 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground mb-1">Voro Work Assistant</div>
          <p className="leading-5">Keep your work organized, offload summaries, and track progress faster.</p>
        </div>
        <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Workspace status</div>
        <div className="rounded-full bg-green-500/10 px-3 py-2 text-sm font-medium text-green-300">Active</div>
      </div>
    </aside>
  )
}
