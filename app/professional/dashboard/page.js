import { createClient } from '@/lib/supabase/server'
import { getRecentProjects, getUpcomingDeadlines } from '@/lib/professional/professional-repository'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Plus, Folder, CheckSquare, FileText, Calendar, ArrowRight, Clock, TrendingUp } from 'lucide-react'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function ProfessionalDashboardPage() {
  const supabase = await createClient()
  let userName = 'Professional'
  
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      userName = profile?.display_name || profile?.full_name || 'Professional'
    }
  }

  const recentProjects = await getRecentProjects()
  const upcomingDeadlines = await getUpcomingDeadlines()
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const activeProjects = recentProjects.filter(p => p.progress < 100)
  const highPriorityTasks = upcomingDeadlines.filter(d => d.priority === 'high')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getGreeting()}, {userName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/professional/voro">
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" /> Ask Voro
            </Button>
          </Link>
          <Button size="sm" className="gap-2 bg-gradient-to-r from-violet-500 to-pink-500">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4 border border-border bg-card/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-semibold mt-1">{activeProjects.length}</p>
            </div>
            <Folder className="w-8 h-8 text-violet-400" />
          </div>
        </Card>
        <Card className="p-4 border border-border bg-card/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Pending Tasks</p>
              <p className="text-2xl font-semibold mt-1">{upcomingDeadlines.length}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-pink-400" />
          </div>
        </Card>
        <Card className="p-4 border border-border bg-card/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">High Priority</p>
              <p className="text-2xl font-semibold mt-1">{highPriorityTasks.length}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-red-400" />
          </div>
        </Card>
        <Link href="/professional/calendar">
          <Card className="p-4 border border-border bg-card/60 hover:border-primary/40 transition cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Calendar</p>
                <p className="text-2xl font-semibold mt-1">View</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Priorities */}
          <Card className="border border-border bg-card/60">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Today's Priorities</h2>
                <Link href="/professional/tasks" className="text-xs text-primary hover:underline">View all</Link>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {upcomingDeadlines.slice(0, 5).map((deadline) => (
                <Link key={deadline.id} href={`/professional/tasks/${deadline.id}`} className="block rounded-lg border border-border bg-background/60 p-3 hover:border-primary/40 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{deadline.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="truncate">{deadline.projectName}</span>
                        <span>•</span>
                        <span className={deadline.priority === 'high' ? 'text-red-400' : deadline.priority === 'medium' ? 'text-amber-400' : 'text-green-400'}>
                          {deadline.priority}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">{deadline.relativeDeadline}</Badge>
                  </div>
                </Link>
              ))}
              {upcomingDeadlines.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No priorities for today. You're all caught up!
                </div>
              )}
            </div>
          </Card>

          {/* Recent Projects */}
          <Card className="border border-border bg-card/60">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Recent Projects</h2>
                <Link href="/professional/projects" className="text-xs text-primary hover:underline">View all</Link>
              </div>
            </div>
            <div className="p-4 space-y-2">
              {recentProjects.slice(0, 4).map((project) => (
                <Link key={project.id} href={`/professional/projects/${project.id}`} className="block rounded-lg border border-border bg-background/60 p-3 hover:border-primary/40 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">{project.category}</p>
                      <p className="text-sm font-medium truncate">{project.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{project.progress}%</Badge>
                  </div>
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </Link>
              ))}
              {recentProjects.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No projects yet. Create your first project to get started.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border border-border bg-card/60">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Quick Actions</h2>
            </div>
            <div className="p-2 space-y-1">
              <Link href="/professional/documents" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-sm">New Document</span>
              </Link>
              <Link href="/professional/projects" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
                  <Folder className="w-4 h-4 text-pink-400" />
                </div>
                <span className="text-sm">New Project</span>
              </Link>
              <Link href="/professional/tasks" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm">New Task</span>
              </Link>
              <Link href="/professional/research" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-sm">Start Research</span>
              </Link>
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="border border-border bg-card/60">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Upcoming</h2>
            </div>
            <div className="p-2 space-y-1">
              {upcomingDeadlines.slice(0, 3).map((deadline) => (
                <Link key={deadline.id} href={`/professional/tasks/${deadline.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{deadline.title}</p>
                    <p className="text-xs text-muted-foreground">{deadline.relativeDeadline}</p>
                  </div>
                </Link>
              ))}
              {upcomingDeadlines.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No upcoming deadlines
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}