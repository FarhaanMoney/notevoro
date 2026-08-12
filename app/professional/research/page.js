'use client'

import { useEffect, useState } from 'react'
import { getResearchProjects, createResearchProject } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function ProfessionalResearchPage() {
  const [projects, setProjects] = useState([])
  const [openForm, setOpenForm] = useState(false)
  const [form, setForm] = useState({ title: '', goal: '', notes: '' })

  useEffect(() => {
    let mounted = true
    getResearchProjects().then((data) => {
      if (mounted) setProjects(data)
    })
    return () => { mounted = false }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const project = await createResearchProject(form)
    setProjects((prev) => [project, ...prev])
    setForm({ title: '', goal: '', notes: '' })
    setOpenForm(false)
    toast.success('Research project created')
  }

  return (
    <div className="p-8 max-w-8xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Research</p>
          <h1 className="text-4xl font-semibold tracking-tight">Insights, analysis, and discovery</h1>
        </div>
        <Button variant="outline" onClick={() => setOpenForm(true)} className="rounded-3xl px-5 py-4 gap-2">
          New research
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id} className="rounded-3xl border border-border p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{project.status}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{project.title}</h2>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>{project.type}</div>
                  <div>{project.updatedAt}</div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{project.goal}</p>
              <div className="mt-4 rounded-3xl bg-background p-4 text-sm text-foreground">
                <div className="font-medium">Notes</div>
                <p className="mt-2 text-sm text-muted-foreground">{project.notes}</p>
              </div>
            </Card>
          ))}
        </div>
        <Card className="rounded-3xl border border-border p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Research snapshot</div>
          <div className="mt-6 space-y-4 text-sm text-muted-foreground">
            <div>Total projects: <span className="text-foreground font-semibold">{projects.length}</span></div>
            <div>Ongoing ideas: <span className="text-foreground font-semibold">{projects.filter((project) => project.status === 'In progress').length}</span></div>
            <div>Completed briefs: <span className="text-foreground font-semibold">{projects.filter((project) => project.status === 'Completed').length}</span></div>
          </div>
        </Card>
      </div>

      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-semibold">New research project</h2>
                <p className="text-sm text-muted-foreground">Build a new discovery brief.</p>
              </div>
              <Button variant="ghost" onClick={() => setOpenForm(false)}>Close</Button>
            </div>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="goal">Research goal</Label>
                <Input id="goal" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="notes">Brief notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} required />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="secondary" type="button" onClick={() => setOpenForm(false)}>Cancel</Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
