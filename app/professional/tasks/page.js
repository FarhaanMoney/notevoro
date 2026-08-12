'use client'

import { useEffect, useMemo, useState } from 'react'
import { getTasks, createTask } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, CheckSquare, Calendar, MoreHorizontal, Star } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  completed: 'Completed',
}

const STATUS_COLORS = {
  todo: 'bg-gray-500/10 text-gray-700',
  in_progress: 'bg-blue-500/10 text-blue-700',
  in_review: 'bg-amber-500/10 text-amber-700',
  completed: 'bg-green-500/10 text-green-700',
}

const PRIORITY_COLORS = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-green-400',
}

export default function ProfessionalTasksPage() {
  const [tasks, setTasks] = useState([])
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('today')
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({ title: '', projectName: '', dueDate: '', priority: 'medium' })

  useEffect(() => {
    let mounted = true
    getTasks().then((data) => {
      if (mounted) setTasks(data)
    })
    return () => { mounted = false }
  }, [])

  const filteredTasks = useMemo(() => {
    const normalized = query.toLowerCase()
    return tasks.filter((task) => {
      const matchesQuery = task.title.toLowerCase().includes(normalized) || task.projectName.toLowerCase().includes(normalized)
      
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const taskDate = new Date(task.dueDate)
      taskDate.setHours(0, 0, 0, 0)
      
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'today' ? taskDate.getTime() === today.getTime() :
        activeTab === 'upcoming' ? taskDate > today && taskDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000) :
        activeTab === 'overdue' ? taskDate < today && task.status !== 'completed' :
        activeTab === 'completed' ? task.status === 'completed' : true
      
      return matchesQuery && matchesTab
    })
  }, [tasks, query, activeTab])

  async function handleCreate(e) {
    e.preventDefault()
    const task = await createTask(form)
    setTasks((prev) => [task, ...prev])
    setForm({ title: '', projectName: '', dueDate: '', priority: 'medium' })
    setOpenCreate(false)
    toast.success('Task added')
  }

  function updateTaskStatus(id, nextStatus) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, status: nextStatus } : task)))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Tasks</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your work items</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="rounded-2xl px-5 py-3 gap-2 bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_200px]">
        <div className="rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Search className="w-4 h-4" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-5">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {filteredTasks.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {activeTab === 'completed' ? 'No completed tasks yet.' : 'You\'re all caught up!'}
              </p>
              {activeTab !== 'completed' && (
                <Button onClick={() => setOpenCreate(true)}>Add Task</Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <Card key={task.id} className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className={STATUS_COLORS[task.status] || ''}>
                          {STATUS_LABELS[task.status]}
                        </Badge>
                        <span className={`text-xs font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
                        </span>
                      </div>
                      <p className="font-medium">{task.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>{task.projectName}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {task.status !== 'completed' && (
                        <Button variant="outline" size="sm" onClick={() => updateTaskStatus(task.id, 'completed')}>
                          Complete
                        </Button>
                      )}
                      {task.status === 'todo' && (
                        <Button variant="ghost" size="sm" onClick={() => updateTaskStatus(task.id, 'in_progress')}>
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button variant="ghost" size="sm" onClick={() => updateTaskStatus(task.id, 'in_review')}>
                          Review
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Add a new task</h2>
                <p className="text-sm text-muted-foreground">Capture work items quickly.</p>
              </div>
              <Button variant="ghost" onClick={() => setOpenCreate(false)}>Close</Button>
            </div>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <Label htmlFor="title">Task title</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="projectName">Project</Label>
                <Input id="projectName" value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="dueDate">Due date</Label>
                  <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={form.priority} onValueChange={(value) => setForm({ ...form, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <Button type="submit">Add Task</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}