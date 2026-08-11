'use client'

import { useEffect, useState } from 'react'
import { X, Star, Share2, Layers, BookOpen, FileText, HelpCircle, Presentation, Search, ArrowRightCircle, PlusSquare, FolderPlus, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const resourceIcons = {
  lesson: BookOpen,
  worksheet: FileText,
  quiz: HelpCircle,
  presentation: Presentation,
  research: Search,
  notes: Layers,
}

export default function ResourceDetailDrawer({ open, resource, onClose, classrooms, assignments, onDuplicate, onArchive, onDelete, onFavorite, onAddToClassroom, onAddToAssignment, onShare, onOpenShare }) {
  const [selectedClassroom, setSelectedClassroom] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState('')

  useEffect(() => {
    if (open && classrooms.length) setSelectedClassroom(classrooms[0].id)
    if (open && assignments.length) setSelectedAssignment(assignments[0]?.id || '')
  }, [open, classrooms, assignments])

  if (!resource) return null

  const Icon = resourceIcons[resource.type] || Layers

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-3xl border border-border bg-card/70 p-6">
              <div className="flex items-center gap-4">
                <div className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.24em] text-muted-foreground">{resource.type}</div>
                  <h2 className="text-2xl font-semibold">{resource.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{resource.subject}</span>
                    <span>Grade {resource.grade}</span>
                    <span>{resource.status === 'archived' ? 'Archived' : resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-border bg-background p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Owner</div>
                  <div className="mt-2 font-semibold">{resource.owner}</div>
                </div>
                <div className="rounded-3xl border border-border bg-background p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Updated</div>
                  <div className="mt-2 font-semibold">{new Date(resource.updatedAt).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-background p-4">
                <div className="text-sm font-semibold">Description</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{resource.description}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="border-input bg-background">{tag}</Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-3xl border border-border bg-card/70 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Classrooms</p>
                    <h3 className="text-lg font-semibold">Using this resource</h3>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{resource.classroomIds.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {resource.classroomIds.length ? resource.classroomIds.map((id) => (
                    <div key={id} className="rounded-2xl border border-border bg-background p-4 text-sm">{classrooms.find((room) => room.id === id)?.name || id}</div>
                  )) : <p className="text-sm text-muted-foreground">No classrooms connected yet.</p>}
                </div>
              </Card>

              <Card className="rounded-3xl border border-border bg-card/70 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Assignments</p>
                    <h3 className="text-lg font-semibold">Connected assignments</h3>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">{resource.assignmentIds.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                  {resource.assignmentIds.length ? resource.assignmentIds.map((id) => (
                    <div key={id} className="rounded-2xl border border-border bg-background p-4 text-sm">{assignments.find((assignment) => assignment.id === id)?.title || id}</div>
                  )) : <p className="text-sm text-muted-foreground">No assignments connected yet.</p>}
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="rounded-3xl border border-border bg-card/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Actions</p>
                  <h3 className="text-lg font-semibold">Manage resource</h3>
                </div>
              </div>
              <div className="space-y-3">
                <Button className="w-full" onClick={() => onFavorite(resource)}>
                  <Star className="mr-2 h-4 w-4" /> {resource.favorite ? 'Unfavorite' : 'Favorite'}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => onDuplicate(resource)}>
                  <Copy className="mr-2 h-4 w-4" /> Duplicate
                </Button>
                <Button className="w-full" variant="outline" onClick={() => onOpenShare(resource)}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
                <Button className="w-full" variant="outline" onClick={() => onArchive(resource)}>
                  <Archive className="mr-2 h-4 w-4" /> {resource.status === 'archived' ? 'Restore' : 'Archive'}
                </Button>
                <Button className="w-full" variant="destructive" onClick={() => onDelete(resource.id)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </Card>

            <Card className="rounded-3xl border border-border bg-card/70 p-5">
              <div className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Add connections</p>
                  <h3 className="text-lg font-semibold">Reuse this resource</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-semibold">Select classroom</label>
                    <select className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" value={selectedClassroom} onChange={(event) => setSelectedClassroom(event.target.value)}>
                      {classrooms.map((classroom) => (
                        <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                      ))}
                    </select>
                    <Button className="mt-3 w-full" onClick={() => onAddToClassroom(resource.id, selectedClassroom)}>
                      <FolderPlus className="mr-2 h-4 w-4" /> Add to Classroom
                    </Button>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Select assignment</label>
                    <select className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" value={selectedAssignment} onChange={(event) => setSelectedAssignment(event.target.value)}>
                      {assignments.map((assignment) => (
                        <option key={assignment.id} value={assignment.id}>{assignment.title}</option>
                      ))}
                    </select>
                    <Button className="mt-3 w-full" onClick={() => onAddToAssignment(resource.id, selectedAssignment)}>
                      <PlusSquare className="mr-2 h-4 w-4" /> Add to Assignment
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
