'use client'

import { useEffect, useMemo, useState } from 'react'
import { getTasks, createTask } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  completed: 'Completed',
}

export default function ProfessionalTasksPage() {
  const [tasks, setTasks] = useState([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
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
      if (status !== 'all' && task.status !== status) return false
      return task.title.toLowerCase().includes(normalized) || task.projectName.toLowerCase().includes(normalized)
    })
  }, [tasks, query, status])

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
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Tasks</p>
          <h1 className="text-4xl font-semibold tracking-tight">Work items and priorities</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setOpenCreate(true)} className="rounded-3xl px-5 py-4 gap-2">
            <Plus className="w-4 h-4" /> New Task
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="rounded-3xl border border-border bg-card/80 p-4">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Search className="w-4 h-4" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              className="w-full bg-transparent text-sm text-foreground outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={status === 'all' ? 'secondary' : 'outline'} size="sm" onClick={() => setStatus('all')}>All</Button>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <Button key={key} variant={status === key ? 'secondary' : 'outline'} size="sm" onClick={() => setStatus(key)}>{label}</Button>
            ))}
          </div>
        </div>

        <Card className="rounded-3xl border border-border bg-card/80 p-6">
          <div className="flex items-center gap-3 text-muted-foreground mb-4">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-semibold">Task breakdown</span>
          </div>
          <div className="space-y-3">
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <div key={key} className="rounded-2xl bg-background/60 p-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{label}</span>
                  <span>{tasks.filter((task) => task.status === key).length}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card className="p-8 bg-card/40 text-center">
            <p className="text-sm text-muted-foreground">No tasks match your filters.</p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="rounded-3xl border border-border bg-background/80 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{task.projectName}</div>
                    <p className="mt-2 text-xl font-semibold">{task.title}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{STATUS_LABELS[task.status]}</span>
                      <span>{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority</span>
                      <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {task.status !== 'completed' && (
                      <Button variant="secondary" size="sm" onClick={() => updateTaskStatus(task.id, 'completed')}>Complete</Button>
                    )}
                    {task.status === 'todo' && (
                      <Button variant="outline" size="sm" onClick={() => updateTaskStatus(task.id, 'in_progress')}>Start</Button>
                    )}
                    {task.status === 'in_progress' && (
                      <Button variant="outline" size="sm" onClick={() => updateTaskStatus(task.id, 'in_review')}>Review</Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-8 shadow-2xl">
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
