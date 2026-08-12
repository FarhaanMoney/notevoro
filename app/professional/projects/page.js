'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getProjects, createProject } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Folder, Archive, MoreHorizontal, Star } from 'lucide-react'
import { toast } from 'sonner'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

const STATUS_COLORS = {
  'Planning': 'bg-blue-500/10 text-blue-700',
  'Active': 'bg-green-500/10 text-green-700',
  'On Hold': 'bg-amber-500/10 text-amber-700',
  'Completed': 'bg-gray-500/10 text-gray-700',
}

export default function ProfessionalProjectsPage() {
  const [projects, setProjects] = useState([])
  const [query, setQuery] = useState('')
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({ name: '', category: '', description: '' })

  useEffect(() => {
    let mounted = true
    getProjects().then((data) => {
      if (mounted) setProjects(data)
    })
    return () => { mounted = false }
  }, [])

  const filteredProjects = useMemo(() => {
    const normalized = query.toLowerCase()
    return projects.filter((project) =>
      project.name.toLowerCase().includes(normalized) || project.category.toLowerCase().includes(normalized)
    )
  }, [projects, query])

  async function handleCreate(e) {
    e.preventDefault()
    const project = await createProject(form)
    setProjects((prev) => [project, ...prev])
    setForm({ name: '', category: '', description: '' })
    setOpenCreate(false)
    toast.success('Project created')
  }

  function handleArchive(id) {
    setProjects((prev) => prev.filter((project) => project.id !== id))
    toast('Project archived')
  }

  const getStatus = (progress) => {
    if (progress === 100) return 'Completed'
    if (progress >= 50) return 'Active'
    if (progress > 0) return 'Active'
    return 'Planning'
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Projects</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your workspaces</h1>
        </div>
        <Button onClick={() => setOpenCreate(true)} className="rounded-2xl px-5 py-3 gap-2 bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Search className="w-4 h-4" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects..."
            className="w-full bg-transparent text-sm text-foreground outline-none"
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <Folder className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{query ? 'No projects found' : 'No projects yet'}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'Try a different search term.' : 'Create your first project to organize your work.'}
          </p>
          {!query && (
            <Button onClick={() => setOpenCreate(true)}>Create Project</Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const status = getStatus(project.progress)
            return (
              <Link key={project.id} href={`/professional/projects/${project.id}`}>
                <Card className="rounded-xl border border-border bg-card/60 p-6 hover:border-primary/40 transition cursor-pointer h-full">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">{project.category}</p>
                      <h3 className="font-semibold truncate">{project.name}</h3>
                    </div>
                    <Badge variant="secondary" className={STATUS_COLORS[status] || ''}>
                      {status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Updated {formatDate(project.updatedAt)}</span>
                    <span>{project.progress}% complete</span>
                  </div>
                  <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Create new project</h2>
                <p className="text-sm text-muted-foreground">Start a new professional initiative.</p>
              </div>
              <Button variant="ghost" onClick={() => setOpenCreate(false)}>Close</Button>
            </div>
            <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <Label htmlFor="name">Project name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <Button type="submit">Create Project</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}