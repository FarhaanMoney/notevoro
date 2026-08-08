'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Users, Plus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

export function JoinClassroomButton() {
  const [showModal, setShowModal] = useState(false)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [classroomPreview, setClassroomPreview] = useState(null)

  async function validateCode() {
    if (!code.trim()) {
      toast.error('Please enter a classroom code')
      return
    }
    setJoining(true)
    try {
      // Mock validation - will be replaced with API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock classroom preview
      setClassroomPreview({
        name: 'Mathematics 8A',
        subject: 'Mathematics',
        grade: '8',
        teacher: 'Ms. Johnson',
        student_count: 24,
      })
    } catch (err) {
      toast.error('Invalid classroom code')
    } finally {
      setJoining(false)
    }
  }

  async function joinClassroom() {
    setJoining(true)
    try {
      // Mock join - will be replaced with API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Successfully joined classroom!')
      setShowModal(false)
      setCode('')
      setClassroomPreview(null)
    } catch (err) {
      toast.error('Failed to join classroom')
    } finally {
      setJoining(false)
    }
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)} variant="outline" className="w-full">
        <Users className="w-4 h-4 mr-2" />Join Classroom
      </Button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6 bg-card/95 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Join a Classroom</h2>
              <Button size="icon" variant="ghost" onClick={() => setShowModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!classroomPreview ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Classroom Code</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MATH8A-7K4P"
                    className="font-mono uppercase"
                    maxLength={12}
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={validateCode} 
                    disabled={joining || !code.trim()} 
                    className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500"
                  >
                    {joining ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validating...</> : 'Validate'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold">{classroomPreview.name}</h3>
                  <p className="text-sm text-muted-foreground">{classroomPreview.subject} — Grade {classroomPreview.grade}</p>
                  <p className="text-sm text-muted-foreground mt-1">Teacher: {classroomPreview.teacher}</p>
                  <p className="text-sm text-muted-foreground">{classroomPreview.student_count} students</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setClassroomPreview(null)} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={joinClassroom} 
                    disabled={joining} 
                    className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500"
                  >
                    {joining ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Joining...</> : 'Join Classroom'}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
