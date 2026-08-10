"use client"
import { useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Plus, Copy, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'
import { mockClassroomList } from '@/lib/educator/mock/classroom-data'

export default function ClassroomsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [classrooms, setClassrooms] = useState(mockClassroomList)
  const [creating, setCreating] = useState(false)
  const [newClassroom, setNewClassroom] = useState({
    name: '', subject: '', grade: '', description: '',
  })

  function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
    return code
  }

  async function handleCreateClassroom(e) {
    e.preventDefault()
    if (!newClassroom.name || !newClassroom.subject || !newClassroom.grade) {
      toast.error('Please fill in all required fields')
      return
    }
    setCreating(true)
    try {
      // Mock creation - will be replaced with API call
      const code = `${newClassroom.subject.substring(0, 4).toUpperCase()}${newClassroom.grade}-${generateCode()}`
      const created = {
        id: Date.now().toString(),
        name: newClassroom.name,
        subject: newClassroom.subject,
        grade: newClassroom.grade,
        student_count: 0,
        completion: 0,
        next_deadline: null,
        code,
      }
      setClassrooms([...classrooms, created])
      setShowCreateModal(false)
      setNewClassroom({ name: '', subject: '', grade: '', description: '' })
      toast.success('Classroom created successfully!')
    } catch (err) {
      toast.error('Failed to create classroom')
    } finally {
      setCreating(false)
    }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code)
    toast.success('Classroom code copied!')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Classrooms</h1>
          <p className="text-muted-foreground mt-1">Manage your classrooms and students.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Create Classroom
        </Button>
      </div>

      {classrooms.length === 0 ? (
        <VoroEmptyState
          type="default"
          title="No classrooms yet"
          description="Create your first classroom to start teaching and managing students."
          action={<Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-violet-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" />Create Classroom
          </Button>}
          className="bg-card/40 border-dashed"
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {classrooms.map((classroom) => (
            <Card key={classroom.id} className="p-5 bg-card/60 hover:border-primary/40 transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold">{classroom.name}</h3>
                  <p className="text-sm text-muted-foreground">{classroom.subject} — Grade {classroom.grade}</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => copyCode(classroom.code)} title="Copy code">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    {classroom.student_count} Students
                  </span>
                  <span className="text-muted-foreground">{classroom.completion}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: `${classroom.completion}%` }} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Code: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{classroom.code}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => copyCode(classroom.code)}>
                  <Copy className="w-3 h-3 mr-1" />Copy Code
                </Button>
                <Link href={`/educator/classrooms/${classroom.id}`} className="flex-1">
                  <Button size="sm" className="w-full bg-gradient-to-r from-violet-500 to-pink-500">
                    Open <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Classroom Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6 bg-card/95 backdrop-blur">
            <h2 className="text-xl font-bold mb-4">Create a Classroom</h2>
            <form onSubmit={handleCreateClassroom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Classroom Name *</Label>
                <Input
                  id="name"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  placeholder="e.g. Mathematics 8A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={newClassroom.subject}
                  onChange={(e) => setNewClassroom({ ...newClassroom, subject: e.target.value })}
                  placeholder="e.g. Mathematics"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade/Level *</Label>
                <Input
                  id="grade"
                  value={newClassroom.grade}
                  onChange={(e) => setNewClassroom({ ...newClassroom, grade: e.target.value })}
                  placeholder="e.g. 8, 10, Freshman"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newClassroom.description}
                  onChange={(e) => setNewClassroom({ ...newClassroom, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={creating} className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500">
                  {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Classroom'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
