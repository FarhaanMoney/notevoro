'use client'

import { useEffect, useState } from 'react'
import { getResearchProjects, createResearchProject } from '@/lib/professional/professional-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, Plus, FileText, ExternalLink, Star, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

const STATUS_COLORS = {
  'Draft': 'bg-gray-500/10 text-gray-700',
  'In progress': 'bg-blue-500/10 text-blue-700',
  'Completed': 'bg-green-500/10 text-green-700',
}

export default function ProfessionalResearchPage() {
  const [projects, setProjects] = useState([])
  const [query, setQuery] = useState('')
  const [openForm, setOpenForm] = useState(false)
  const [form, setForm] = useState({ title: '', goal: '', notes: '' })

  useEffect(() => {
    let mounted = true
    getResearchProjects().then((data) => {
      if (mounted) setProjects(data)
    })
    return () => { mounted = false }
  }, [])

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(query.toLowerCase()) ||
    project.goal.toLowerCase().includes(query.toLowerCase())
  )

  async function handleSubmit(e) {
    e.preventDefault()
    const project = await createResearchProject(form)
    setProjects((prev) => [project, ...prev])
    setForm({ title: '', goal: '', notes: '' })
    setOpenForm(false)
    toast.success('Research project created')
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Research</p>
          <h1 className="text-3xl font-semibold tracking-tight">Knowledge & insights</h1>
        </div>
        <Button onClick={() => setOpenForm(true)} className="rounded-2xl px-5 py-3 gap-2 bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4" /> New Research
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Search className="w-4 h-4" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search research projects..."
            className="w-full bg-transparent text-sm text-foreground outline-none"
          />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{query ? 'No research found' : 'No research projects yet'}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {query ? 'Try a different search term.' : 'Start your first research project to gather insights.'}
          </p>
          {!query && (
            <Button onClick={() => setOpenForm(true)}>Start Research</Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="rounded-xl border border-border bg-card/60 p-6 hover:border-primary/40 transition">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                  <Badge variant="secondary" className={STATUS_COLORS[project.status] || ''}>
                    {project.status}
                  </Badge>
                  <h3 className="font-semibold mt-2">{project.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{project.type}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.goal}</p>
              <div className="rounded-xl bg-background p-4 mb-4">
                <div className="text-xs font-medium mb-2">Notes</div>
                <p className="text-sm text-muted-foreground line-clamp-3">{project.notes}</p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Updated {formatDate(project.updatedAt)}</span>
                <Button variant="ghost" size="sm" className="h-8">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-8 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-semibold">New research project</h2>
                <p className="text-sm text-muted-foreground">Build a knowledge base for your work.</p>
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
                <Label htmlFor="notes">Initial notes</Label>
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