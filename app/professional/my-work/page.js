'use client'

import { useEffect, useState } from 'react'
import { getProjects, getTasks, getDocuments } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Folder, CheckSquare, FileText, Clock, MoreHorizontal, Star, Archive } from 'lucide-react'

export default function MyWorkPage() {
  const [projects, setProjects] = useState([])
  const [tasks, setTasks] = useState([])
  const [documents, setDocuments] = useState([])
  const [activeTab, setActiveTab] = useState('recent')

  useEffect(() => {
    let mounted = true
    Promise.all([getProjects(), getTasks(), getDocuments()]).then(([p, t, d]) => {
      if (mounted) {
        setProjects(p)
        setTasks(t)
        setDocuments(d)
      }
    })
    return () => { mounted = false }
  }, [])

  const allWork = [
    ...projects.map(p => ({ ...p, type: 'project', status: p.progress === 100 ? 'completed' : 'in_progress' })),
    ...tasks.map(t => ({ ...t, type: 'task' })),
    ...documents.map(d => ({ ...d, type: 'document' }))
  ].sort((a, b) => new Date(b.updatedAt || b.dueDate) - new Date(a.updatedAt || a.dueDate))

  const recent = allWork.slice(0, 10)
  const inProgress = allWork.filter(w => w.status === 'in_progress' || w.status === 'todo')
  const dueSoon = allWork.filter(w => w.dueDate && new Date(w.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  const completed = allWork.filter(w => w.status === 'completed')

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">My Work</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your work overview</h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="due-soon">Due Soon</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4 mt-6">
          {recent.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No recent work</h3>
              <p className="text-sm text-muted-foreground mb-4">Start by creating a project, task, or document.</p>
              <div className="flex gap-3 justify-center">
                <Button size="sm" onClick={() => window.location.href = '/professional/projects'}>New Project</Button>
                <Button size="sm" variant="outline" onClick={() => window.location.href = '/professional/tasks'}>New Task</Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {recent.map((item) => <WorkItem key={item.id} item={item} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4 mt-6">
          {inProgress.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nothing in progress</h3>
              <p className="text-sm text-muted-foreground">You're all caught up or haven't started any work yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {inProgress.map((item) => <WorkItem key={item.id} item={item} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="due-soon" className="space-y-4 mt-6">
          {dueSoon.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No upcoming deadlines</h3>
              <p className="text-sm text-muted-foreground">You have no work due in the next 7 days.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {dueSoon.map((item) => <WorkItem key={item.id} item={item} showDueDate />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-6">
          {completed.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No completed work</h3>
              <p className="text-sm text-muted-foreground">Complete some tasks or projects to see them here.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {completed.map((item) => <WorkItem key={item.id} item={item} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function WorkItem({ item, showDueDate }) {
  const getIcon = () => {
    switch (item.type) {
      case 'project': return <Folder className="w-4 h-4" />
      case 'task': return <CheckSquare className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const getTypeLabel = () => {
    switch (item.type) {
      case 'project': return 'Project'
      case 'task': return 'Task'
      case 'document': return 'Document'
      default: return 'Item'
    }
  }

  const getStatusColor = () => {
    switch (item.status) {
      case 'completed': return 'bg-green-500/10 text-green-700'
      case 'in_progress': return 'bg-blue-500/10 text-blue-700'
      case 'in_review': return 'bg-amber-500/10 text-amber-700'
      case 'todo': return 'bg-gray-500/10 text-gray-700'
      default: return 'bg-gray-500/10 text-gray-700'
    }
  }

  const getHref = () => {
    switch (item.type) {
      case 'project': return `/professional/projects/${item.id}`
      case 'task': return `/professional/tasks/${item.id}`
      case 'document': return `/professional/documents/${item.id}`
      default: return '#'
    }
  }

  return (
    <Link href={getHref()}>
      <Card className="rounded-xl border border-border bg-card/60 p-4 hover:border-primary/40 transition cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">{getTypeLabel()}</span>
                {item.status && (
                  <Badge variant="secondary" className={`text-xs ${getStatusColor()}`}>
                    {item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
              </div>
              <p className="font-medium truncate">{item.name || item.title}</p>
              <p className="text-sm text-muted-foreground mt-1 truncate">{item.description || item.projectName || item.category}</p>
              {showDueDate && item.dueDate && (
                <p className="text-xs text-muted-foreground mt-2">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Star className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  )
}