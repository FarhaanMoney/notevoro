'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Loader2, FileText, Calendar, Clock } from 'lucide-react'
import { toast } from 'sonner'

export default function CreateAssignmentPage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    instructions: '',
    subject: '',
    classroom: '',
    dueDate: '',
    dueTime: '',
    points: '',
    difficulty: 'medium',
  })

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.instructions || !form.classroom) {
      toast.error('Please fill in all required fields')
      return
    }
    setCreating(true)
    try {
      // Mock creation - will be replaced with API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Assignment created successfully!')
      router.push('/educator/assignments')
    } catch (err) {
      toast.error('Failed to create assignment')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />Back to Assignments
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create Assignment</h1>
        <p className="text-muted-foreground mt-1">Create and distribute assignments to your students.</p>
      </div>

      <Card className="p-6 bg-card/60">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Assignment Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="e.g. Algebra Chapter 5 Problems"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={form.subject}
                onChange={(e) => update('subject', e.target.value)}
                placeholder="e.g. Mathematics"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classroom">Classroom *</Label>
            <Select value={form.classroom} onValueChange={(v) => update('classroom', v)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a classroom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Mathematics 8A</SelectItem>
                <SelectItem value="2">Biology 10B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Instructions *</Label>
            <Textarea
              id="instructions"
              value={form.instructions}
              onChange={(e) => update('instructions', e.target.value)}
              placeholder="Provide detailed instructions for this assignment..."
              rows={6}
              required
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => update('dueDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueTime">Due Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={form.dueTime}
                onChange={(e) => update('dueTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                value={form.points}
                onChange={(e) => update('points', e.target.value)}
                placeholder="e.g. 100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select value={form.difficulty} onValueChange={(v) => update('difficulty', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={creating} className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500">
              {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Assignment'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
