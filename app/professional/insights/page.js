'use client'

import { useEffect, useState } from 'react'
import { getProjects, getTasks } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Folder, CheckSquare, TrendingUp, Clock, AlertCircle, CheckCircle } from 'lucide-react'

export default function ProfessionalInsightsPage() {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    let mounted = true
    Promise.all([getProjects(), getTasks()]).then(([p, t]) => {
      if (mounted) {
        setProjects(p)
        setTasks(t)
      }
    })
    return () => { mounted = false }
  }, [])

  const activeProjects = projects.filter(p => p.progress < 100).length
  const completedProjects = projects.filter(p => p.progress === 100).length
  const openTasks = tasks.filter(t => t.status !== 'completed').length
  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length
  const overdueTasks = tasks.filter(t => {
    const dueDate = new Date(t.dueDate)
    return dueDate < new Date() && t.status !== 'completed'
  }).length

  const recentActivity = tasks.slice(0, 5).map(t => ({
    title: t.title,
    type: 'task',
    status: t.status,
    date: t.dueDate
  }))

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Insights</p>
        <h1 className="text-3xl font-semibold tracking-tight">Work intelligence</h1>
      </div>

      {/* Work Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-xl border border-border bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Folder className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-sm text-muted-foreground">Active Projects</span>
          </div>
          <p className="text-3xl font-semibold">{activeProjects}</p>
          <p className="text-xs text-muted-foreground mt-2">{completedProjects} completed</p>
        </Card>

        <Card className="rounded-xl border border-border bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-pink-400" />
            </div>
            <span className="text-sm text-muted-foreground">Open Tasks</span>
          </div>
          <p className="text-3xl font-semibold">{openTasks}</p>
          <p className="text-xs text-muted-foreground mt-2">{completedTasks} completed</p>
        </Card>

        <Card className="rounded-xl border border-border bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm text-muted-foreground">High Priority</span>
          </div>
          <p className="text-3xl font-semibold">{highPriorityTasks}</p>
          <p className="text-xs text-muted-foreground mt-2">Tasks need attention</p>
        </Card>

        <Card className="rounded-xl border border-border bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-sm text-muted-foreground">Overdue</span>
          </div>
          <p className="text-3xl font-semibold">{overdueTasks}</p>
          <p className="text-xs text-muted-foreground mt-2">Tasks past due date</p>
        </Card>
      </div>

      {/* Project Progress */}
      <Card className="rounded-xl border border-border bg-card/60 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Project Progress</h2>
            <p className="text-sm text-muted-foreground mt-1">Overview of your active workspaces</p>
          </div>
        </div>
        <div className="space-y-4">
          {projects.filter(p => p.progress < 100).slice(0, 5).map((project) => (
            <div key={project.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.category}</p>
                </div>
                <span className="text-sm font-medium">{project.progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
          ))}
          {projects.filter(p => p.progress < 100).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
              <p>All projects completed!</p>
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="rounded-xl border border-border bg-card/60 p-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        </div>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No recent activity to show.</p>
            </div>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-background/60">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.status.replace('_', ' ')} • {new Date(activity.date).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {activity.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Productivity Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-xl border border-border bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Productivity</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tasks completed this week</span>
              <span className="font-semibold">{completedTasks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Projects completed this month</span>
              <span className="font-semibold">{completedProjects}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average task completion rate</span>
              <span className="font-semibold">
                {tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-border bg-card/60 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Folder className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Work Distribution</h2>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 4).map((project) => {
              const projectTasks = tasks.filter(t => t.projectName === project.name).length
              return (
                <div key={project.id} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground truncate max-w-[150px]">{project.name}</span>
                  <span className="font-semibold">{projectTasks} tasks</span>
                </div>
              )
            })}
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground">No projects to analyze</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}