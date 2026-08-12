'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getProjects, createProject } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Folder, Archive } from 'lucide-react'
import { toast } from 'sonner'

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

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Projects</p>
          <h1 className="text-4xl font-semibold tracking-tight">Your active workspaces</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setOpenCreate(true)} className="rounded-3xl px-5 py-4 gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-border bg-card/80 p-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Search className="w-4 h-4" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                className="w-full bg-transparent text-sm text-foreground outline-none"
              />
            </div>
          </div>
          {filteredProjects.length === 0 ? (
            <Card className="p-8 bg-card/40 text-center">
              <p className="text-sm text-muted-foreground">No matching projects found.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="rounded-3xl border border-border bg-background/80 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{project.category}</div>
                      <Link href={`/professional/projects/${project.id}`} className="text-xl font-semibold hover:text-primary">{project.name}</Link>
                      <p className="mt-3 text-sm text-muted-foreground">{project.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleArchive(project.id)} title="Archive project">
                      <Archive className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Progress: {project.progress}%</span>
                    <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-3xl border border-border bg-card/80 p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Folder className="w-5 h-5" />
              <span className="text-sm font-semibold">Project count</span>
            </div>
            <p className="mt-4 text-4xl font-semibold">{projects.length}</p>
          </Card>
          <Card className="rounded-3xl border border-border bg-card/80 p-6">
            <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">Project categories</div>
            <div className="space-y-2">
              {[...new Set(projects.map((project) => project.category))].map((category) => (
                <div key={category} className="flex items-center justify-between rounded-2xl bg-background/60 p-3 text-sm">
                  <span>{category}</span>
                  <span>{projects.filter((project) => project.category === category).length}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-8 shadow-2xl">
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
