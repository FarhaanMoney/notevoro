'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import {
  LayoutDashboard, Sparkles, MessagesSquare, BookOpen, Layers, HelpCircle,
  FileText, Presentation, Search, Folder, Calendar, BarChart3, Settings,
  GraduationCap, LogOut, Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, active: true },
  { href: '/dashboard/atlas', label: 'Professor Atlas', icon: GraduationCap },
  { href: '/dashboard/chat', label: 'AI Chat', icon: MessagesSquare, active: true },
  { href: '/dashboard/study-pack', label: 'Study Packs', icon: BookOpen, active: true, badge: 'New' },
  { href: '/dashboard/flashcards', label: 'Flashcards', icon: Layers },
  { href: '/dashboard/quizzes', label: 'Quizzes', icon: HelpCircle },
  { href: '/dashboard/tests', label: 'Practice Tests', icon: FileText },
  { href: '/dashboard/presentations', label: 'Presentations', icon: Presentation },
  { href: '/dashboard/research', label: 'Research Agent', icon: Search },
  { href: '/dashboard/folders', label: 'Folders', icon: Folder },
  { href: '/dashboard/calendar', label: 'Calendar', icon: Calendar },
  { href: '/dashboard/usage', label: 'Usage', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ user, profile }) {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initial = (profile?.display_name || profile?.full_name || user?.email || 'U').slice(0, 1).toUpperCase()

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 border-r border-border bg-card/40 backdrop-blur flex flex-col">
      <div className="p-5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">Notevoro</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
        {nav.map((item) => {
          const isActive = pathname === item.href
          const disabled = !item.active
          return (
            <Link
              key={item.href}
              href={disabled ? '#' : item.href}
              onClick={(e) => disabled && e.preventDefault()}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive ? 'bg-gradient-to-r from-violet-500/20 to-pink-500/20 text-foreground border border-primary/30'
                : disabled ? 'text-muted-foreground/50 cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">{item.badge}</span>}
              {disabled && <span className="text-[10px] text-muted-foreground/60">Soon</span>}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <div className="rounded-xl p-3 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold">Free plan</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">Upgrade for unlimited study packs & priority AI.</p>
          <Button size="sm" className="w-full h-7 text-xs bg-gradient-to-r from-violet-500 to-pink-500">Upgrade to Pro</Button>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile?.display_name || profile?.full_name || 'Student'}</div>
            <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={logout} title="Logout" className="h-8 w-8">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
