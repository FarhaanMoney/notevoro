'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, CheckCircle, Clock, AlertCircle, Download, Send, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'

export default function AssignmentSubmissionsPage() {
  const params = useParams()
  const router = useRouter()
  const [grading, setGrading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState('')

  // Mock assignment and submissions data
  const assignment = {
    id: params.id,
    title: 'Algebra Chapter 5 Problems',
    classroom: 'Mathematics 8A',
    dueDate: 'Tomorrow, 4:00 PM',
    totalPoints: 100,
  }

  const submissions = [
    { id: '1', student: 'Ahmed Khan', status: 'submitted', submittedAt: '2 hours ago', score: null, feedback: '' },
    { id: '2', student: 'Sara Patel', status: 'submitted', submittedAt: '3 hours ago', score: 85, feedback: 'Great work! Keep it up.' },
    { id: '3', student: 'John Smith', status: 'late', submittedAt: '1 day ago', score: null, feedback: '' },
    { id: '4', student: 'Emma Wilson', status: 'not_submitted', submittedAt: null, score: null, feedback: '' },
    { id: '5', student: 'Michael Brown', status: 'submitted', submittedAt: '5 hours ago', score: 92, feedback: 'Excellent understanding of the concepts.' },
  ]

  async function submitGrade() {
    if (!selectedStudent || !score) {
      toast.error('Please select a student and enter a score')
      return
    }
    setGrading(true)
    try {
      // Mock grading - will be replaced with API call
      await new Promise(resolve => setTimeout(resolve, 500))
      toast.success('Grade submitted successfully!')
      setSelectedStudent(null)
      setFeedback('')
      setScore('')
    } catch (err) {
      toast.error('Failed to submit grade')
    } finally {
      setGrading(false)
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'submitted': return <CheckCircle className="w-5 h-5 text-green-400" />
      case 'late': return <Clock className="w-5 h-5 text-yellow-400" />
      case 'not_submitted': return <AlertCircle className="w-5 h-5 text-red-400" />
      default: return null
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'submitted': return 'Submitted'
      case 'late': return 'Late'
      case 'not_submitted': return 'Not Submitted'
      default: return status
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />Back to Assignments
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{assignment.title}</h1>
        <p className="text-muted-foreground mt-1">{assignment.classroom} • Due: {assignment.dueDate} • {assignment.totalPoints} points</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Submissions List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Student Submissions</h2>
          <div className="space-y-2">
            {submissions.map((submission) => (
              <Card
                key={submission.id}
                className={`p-4 cursor-pointer transition ${
                  selectedStudent?.id === submission.id
                    ? 'border-primary bg-primary/10'
                    : 'bg-card/60 hover:border-primary/40'
                }`}
                onClick={() => setSelectedStudent(submission)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                    {submission.student[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{submission.student}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {getStatusIcon(submission.status)}
                      <span>{getStatusLabel(submission.status)}</span>
                      {submission.submittedAt && <span>• {submission.submittedAt}</span>}
                    </div>
                  </div>
                  {submission.score !== null && (
                    <div className="text-right">
                      <div className="font-semibold">{submission.score}/{assignment.totalPoints}</div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Grading Panel */}
        <div>
          {selectedStudent ? (
            <Card className="p-6 bg-card/60">
              <h2 className="text-lg font-semibold mb-4">Grade {selectedStudent.student}'s Work</h2>
              
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Submission Status</span>
                    <span className="flex items-center gap-2 text-sm">
                      {getStatusIcon(selectedStudent.status)}
                      {getStatusLabel(selectedStudent.status)}
                    </span>
                  </div>
                  {selectedStudent.submittedAt && (
                    <div className="text-sm text-muted-foreground">Submitted: {selectedStudent.submittedAt}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="score">Score (out of {assignment.totalPoints})</Label>
                  <Input
                    id="score"
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder={`Enter score (0-${assignment.totalPoints})`}
                    max={assignment.totalPoints}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback to the student..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />Download Submission
                  </Button>
                  <Button
                    onClick={submitGrade}
                    disabled={grading}
                    className="flex-1 bg-gradient-to-r from-violet-500 to-pink-500"
                  >
                    {grading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <><Send className="w-4 h-4 mr-2" />Submit Grade</>}
                  </Button>
                </div>

                {selectedStudent.feedback && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm font-medium mb-1">Previous Feedback</div>
                    <div className="text-sm text-muted-foreground">{selectedStudent.feedback}</div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 bg-card/60 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">Select a Student</h3>
              <p className="text-sm text-muted-foreground">Click on a student from the list to view and grade their submission.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
