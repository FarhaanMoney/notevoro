import { getDashboardOverview, getRecentProjects, getUpcomingDeadlines, getTaskOverview, getFocusTime, getAIActivity } from '@/lib/professional/professional-repository'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Search, Bell, Calendar, Plus, Folder, CheckSquare, FileText, CircleDashed } from 'lucide-react'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export default async function ProfessionalDashboardPage() {
  const overview = await getDashboardOverview()
  const recentProjects = await getRecentProjects()
  const upcomingDeadlines = await getUpcomingDeadlines()
  const taskOverview = await getTaskOverview()
  const focusTime = await getFocusTime()
  const aiActivity = await getAIActivity()

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-violet-200">Professional Workspace</span>
            <Badge variant="secondary">Desktop-first</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Good evening, Nina</p>
            <h1 className="text-4xl font-semibold tracking-tight">Here's what's happening with your work today.</h1>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative rounded-3xl border border-border bg-card/80 p-4 shadow-sm shadow-black/5">
              <div className="absolute inset-x-0 top-0 h-1 rounded-t-3xl bg-gradient-to-r from-violet-500 to-pink-500" />
              <div className="flex items-center gap-3 text-muted-foreground">
                <Search className="w-4 h-4" />
                <span>Search your projects, tasks, or notes</span>
              </div>
              <input type="text" placeholder="Search work" className="mt-3 w-full border border-border bg-transparent px-4 py-3 rounded-3xl text-sm text-foreground outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" className="rounded-3xl px-4 py-4 gap-2">
                <Bell className="w-4 h-4" /> Notifications
              </Button>
              <Button variant="secondary" className="rounded-3xl px-4 py-4 gap-2">
                <Calendar className="w-4 h-4" /> Calendar
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button className="rounded-3xl px-5 py-4 gap-2 bg-gradient-to-r from-violet-500 to-pink-500">
            <Plus className="w-4 h-4" /> New
          </Button>
          <Button variant="outline" className="rounded-3xl px-5 py-4 gap-2">
            <Sparkles className="w-4 h-4" /> Ask Voro
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {[
          { title: 'Active Projects', value: overview.activeProjects, extra: `${overview.dueThisWeek} due this week`, icon: Folder },
          { title: 'Tasks in Progress', value: overview.tasksInProgress, extra: `${overview.highPriority} high priority`, icon: CheckSquare },
          { title: 'Tasks Completed', value: overview.tasksCompleted, extra: `+${overview.completedChange}% vs last 7 days`, icon: FileText },
          { title: 'Focus Time', value: overview.focusTime, extra: `+${overview.focusChange}% vs last 7 days`, icon: CircleDashed },
        ].map((stat) => (
          <Card key={stat.title} className="rounded-3xl border border-border bg-card/80 p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{stat.title}</p>
                <p className="mt-4 text-3xl font-semibold tracking-tight">{stat.value}</p>
              </div>
              <stat.icon className="w-7 h-7 text-violet-300" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{stat.extra}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="rounded-3xl border border-border bg-card/80 p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Recent Projects</p>
              <h2 className="text-2xl font-semibold">Live work spaces</h2>
            </div>
            <Link href="/professional/projects" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/professional/projects/${project.id}`} className="block rounded-3xl border border-border bg-background/60 p-4 transition hover:border-primary/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{project.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{project.category}</p>
                  </div>
                  <Badge variant="secondary">{project.progress}%</Badge>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>Last updated {formatDate(project.updatedAt)}</span>
                  <span>• Updated by {project.updatedBy}</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-3xl border border-border bg-card/80 p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Upcoming Deadlines</p>
                <h2 className="text-xl font-semibold">Due soon</h2>
              </div>
              <Link href="/professional/tasks" className="text-sm text-primary hover:underline">See all</Link>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <Link key={deadline.id} href={`/professional/tasks/${deadline.id}`} className="block rounded-3xl border border-border bg-background/60 p-4 transition hover:border-primary/40">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span>{deadline.title}</span>
                    <span className="text-muted-foreground">{deadline.relativeDeadline}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{deadline.projectName}</span>
                    <span>{deadline.priority.charAt(0).toUpperCase() + deadline.priority.slice(1)} priority</span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="rounded-3xl border border-border bg-card/80 p-6">
            <div className="mb-4">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Task Overview</p>
              <h2 className="text-xl font-semibold">Status snapshot</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'To Do', value: taskOverview.todo },
                { label: 'In Progress', value: taskOverview.in_progress },
                { label: 'In Review', value: taskOverview.in_review },
                { label: 'Completed', value: taskOverview.completed },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-border bg-background/60 p-4">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="rounded-3xl border border-border bg-card/80 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Focus Time</p>
              <h2 className="text-2xl font-semibold">Weekly productivity</h2>
            </div>
            <Badge variant="secondary">Work rhythm</Badge>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-3 text-center text-xs text-muted-foreground">
              {focusTime.map((item) => (
                <div key={item.day}>{item.day}</div>
              ))}
            </div>
            <div className="flex items-end gap-3 h-48">
              {focusTime.map((item) => (
                <div key={item.day} className="flex-1">
                  <div className="h-full rounded-3xl bg-gradient-to-t from-violet-500 to-pink-500" style={{ height: `${Math.min(item.hours * 15, 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div>Mon — {focusTime[0]?.hours}h</div>
              <div>Tue — {focusTime[1]?.hours}h</div>
              <div>Wed — {focusTime[2]?.hours}h</div>
              <div>Thu — {focusTime[3]?.hours}h</div>
              <div>Fri — {focusTime[4]?.hours}h</div>
              <div>Sat — {focusTime[5]?.hours}h</div>
              <div>Sun — {focusTime[6]?.hours}h</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border bg-card/80 p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">AI Activity</p>
              <h2 className="text-2xl font-semibold">Voro actions</h2>
            </div>
            <Sparkles className="w-6 h-6 text-violet-300" />
          </div>
          <div className="space-y-3">
            {aiActivity.map((activity) => (
              <div key={activity.id} className="rounded-3xl border border-border bg-background/60 p-4">
                <p className="font-semibold">{activity.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
                <div className="mt-3 text-xs text-muted-foreground">{activity.time}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card/80 p-6">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.3em]">Quick actions</p>
          <h2 className="text-2xl font-semibold">Move faster with Voro</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'New Project', icon: Folder },
            { label: 'Create Task', icon: CheckSquare },
            { label: 'Upload Document', icon: FileText },
            { label: 'Start Research', icon: Search },
            { label: 'Ask Voro', icon: Sparkles },
          ].map((action) => (
            <Button key={action.label} variant="outline" className="rounded-3xl px-5 py-4 gap-2">
              <action.icon className="w-4 h-4" /> {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
