'use client'

import { useEffect, useMemo, useState } from 'react'
import { BookOpen, FileText, HelpCircle, Presentation, Search, Layers, Sparkles, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

const CREATION_OPTIONS = [
  { id: 'lesson', label: 'Lesson Plan', icon: BookOpen, description: 'Structured lesson sequence with objectives and activities.' },
  { id: 'worksheet', label: 'Worksheet', icon: FileText, description: 'Practice exercises with support and answers.' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Formative assessment for quick checks.' },
  { id: 'presentation', label: 'Presentation', icon: Presentation, description: 'Slide deck for classroom discussions.' },
  { id: 'research', label: 'Research', icon: Search, description: 'Research guides, projects, and source lists.' },
  { id: 'notes', label: 'Notes', icon: Layers, description: 'Teacher notes, agendas, or quick reference.' },
  { id: 'ai', label: 'AI Generated Resource', icon: Sparkles, description: 'Let Voro draft resource content from your prompt.' },
  { id: 'upload', label: 'Upload File', icon: UploadCloud, description: 'Create a resource from an uploaded document.' },
]

export default function CreateResourceDialog({ open, defaultType, collections, classrooms, onClose, onCreate }) {
  const [step, setStep] = useState('choose')
  const [resourceType, setResourceType] = useState(defaultType === 'upload' || defaultType === 'ai' ? 'lesson' : defaultType || 'lesson')
  const [loading, setLoading] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [form, setForm] = useState({ title: '', description: '', subject: 'Science', grade: '10', tags: '', classroom: 'all' })

  useEffect(() => {
    if (!open) {
      setStep('choose')
      setResourceType(defaultType === 'upload' || defaultType === 'ai' ? 'lesson' : defaultType || 'lesson')
      setForm({ title: '', description: '', subject: 'Science', grade: '10', tags: '', classroom: 'all' })
      setPrompt('')
      setLoading(false)
    }
  }, [open, defaultType])

  const selectedOption = useMemo(() => CREATION_OPTIONS.find((item) => item.id === (defaultType === 'upload' ? 'upload' : defaultType === 'ai' ? 'ai' : resourceType)), [defaultType, resourceType])

  const handleNext = () => {
    if (step === 'choose') setStep(defaultType === 'ai' ? 'ai' : 'details')
    else if (step === 'ai') {
      setLoading(true)
      setTimeout(() => {
        setLoading(false)
        setForm((current) => ({
          ...current,
          title: `AI Draft: ${prompt.slice(0, 30) || 'New resource'}`,
          description: `This AI-created resource is based on: ${prompt}`,
        }))
        setStep('details')
      }, 1200)
    }
  }

  const handleCreate = () => {
    onCreate({
      title: form.title || `${selectedOption?.label} Preview`,
      description: form.description || selectedOption?.description,
      type: resourceType,
      subject: form.subject,
      grade: form.grade,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      classroomIds: form.classroom === 'all' ? [] : [form.classroom],
      status: 'draft',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{step === 'choose' ? 'What would you like to create?' : `${selectedOption?.label}`}</DialogTitle>
          <DialogDescription>{step === 'choose' ? 'Start with a resource type and build a reusable teaching material foundation.' : 'Use this form to create a new mock resource. It can later be connected to classrooms and assignments.'}</DialogDescription>
        </DialogHeader>

        {step === 'choose' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {CREATION_OPTIONS.map((option) => (
              <Card key={option.id} className="cursor-pointer rounded-3xl border border-border bg-card/70 p-5 transition hover:border-primary/40" onClick={() => {
                if (option.id === 'ai') setStep('ai')
                else if (option.id === 'upload') setStep('details')
                setResourceType(option.id === 'ai' ? 'research' : option.id === 'upload' ? 'notes' : option.id
                )
              }}>
                <div className="flex items-center gap-4">
                  <span className="grid h-12 w-12 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg">
                    <option.icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{option.label}</h3>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : step === 'ai' ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-border bg-card/70 p-5">
              <p className="text-sm text-muted-foreground">Use Voro to create a starting resource draft.</p>
              <Input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Create a Grade 10 biology worksheet about photosynthesis."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={!prompt || loading} onClick={handleNext}>{loading ? 'Generating…' : 'Generate with Voro'}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Resource title" />
              <Input value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Subject" />
              <Input value={form.grade} onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))} placeholder="Grade" />
              <Input value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="Tags (comma separated)" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea
                rows="5"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="Add more details about the resource and how it should be used."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <select
                value={form.classroom}
                onChange={(event) => setForm((current) => ({ ...current, classroom: event.target.value }))}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">No classroom</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                ))}
              </select>
              <select
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="lesson">Lesson Plan</option>
                <option value="worksheet">Worksheet</option>
                <option value="quiz">Quiz</option>
                <option value="presentation">Presentation</option>
                <option value="research">Research</option>
                <option value="notes">Notes</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreate}>Create Resource</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
