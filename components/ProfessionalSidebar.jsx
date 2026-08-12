'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, LayoutDashboard, Folder, CheckSquare, FileText, Calendar, Search, Sparkles, Star, Archive, Settings, BarChart3 } from 'lucide-react'

const mainNav = [
  { href: '/professional/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/professional/my-work', label: 'My Work', icon: CheckSquare },
  { href: '/professional/projects', label: 'Projects', icon: Folder },
  { href: '/professional/documents', label: 'Documents', icon: FileText },
  { href: '/professional/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/professional/calendar', label: 'Calendar', icon: Calendar },
]

const intelligenceNav = [
  { href: '/professional/voro', label: 'Voro', icon: Sparkles },
  { href: '/professional/research', label: 'Research', icon: Search },
  { href: '/professional/insights', label: 'Insights', icon: BarChart3 },
]

const organizationNav = [
  { href: '/professional/favorites', label: 'Favorites', icon: Star },
  { href: '/professional/archive', label: 'Archive', icon: Archive },
]

const accountNav = [
  { href: '/professional/settings', label: 'Settings', icon: Settings },
]

export function ProfessionalSidebar({ user, profile, previewMode }) {
  const pathname = usePathname()
  const initial = (profile?.display_name || profile?.full_name || user?.email || 'P').slice(0, 1).toUpperCase()

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-border bg-card/40 backdrop-blur flex flex-col">
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

        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground mt-6 mb-2">Intelligence</div>
        {intelligenceNav.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${isActive ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-foreground border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}

        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground mt-6 mb-2">Organization</div>
        {organizationNav.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${isActive ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-foreground border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="rounded-2xl bg-card/60 p-3 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">{initial}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile?.display_name || profile?.full_name || 'Professional'}</div>
              <div className="text-[11px] text-muted-foreground truncate">{profile?.email || user?.email || 'pro@notevoro.app'}</div>
            </div>
          </div>
        </div>
        {accountNav.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${isActive ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-foreground border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'}`}>
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
