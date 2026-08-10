"use client"
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, FileText, BookOpen, BarChart3, Settings, Copy, ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { generateClassroomCode } from '@/lib/educator/mock/classroom-data'
import * as classroomRepo from '@/lib/educator/classroom-repository'
import { ChartContainer } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'assignments', label: 'Assignments', icon: FileText },
  { id: 'resources', label: 'Resources', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function ClassroomDetailPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  
  const [classroom, setClassroom] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [showCreateAssignment, setShowCreateAssignment] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [assignmentDraft, setAssignmentDraft] = useState({
    title: '',
    description: '',
    subject: '',
    instructions: '',
    dueDate: '',
    dueTime: '',
    points: 100,
    type: 'Worksheet',
  })

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await classroomRepo.getClassroomById(params.id)
        if (mounted) setClassroom(res.classroom || null)
      } catch (err) {
        console.error('Failed to load classroom', err)
        // fallback to mock for local dev
        try {
          const mock = await import('@/lib/educator/mock/classroom-data')
          const m = mock.getMockClassroom(params.id)
          if (mounted) setClassroom(m)
        } catch (e) {
          if (mounted) setClassroom(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [params.id])

  if (loading) {
    return <div className="p-8 max-w-6xl mx-auto">Loading classroom...</div>
  }
  if (!classroom) {
    return <div className="p-8 max-w-6xl mx-auto">Classroom not found or access denied.</div>
  }

  function copyCode() {
    const code = classroom.code ?? classroom.classroom_code ?? ''
    navigator.clipboard.writeText(code)
    toast.success('Classroom code copied!')
  }

  function createAssignment() {
    const dueDate = assignmentDraft.dueDate ? `${assignmentDraft.dueDate} ${assignmentDraft.dueTime || '23:59'}` : 'TBD'
    const newAssignment = {
      id: `a-${Date.now()}`,
      title: assignmentDraft.title || 'New Assignment',
      description: assignmentDraft.description || 'No description provided.',
      subject: assignmentDraft.subject || classroom.subject || 'General',
      instructions: assignmentDraft.instructions || 'Complete the assignment as instructed.',
      dueDate,
      type: assignmentDraft.type,
      points: assignmentDraft.points,
      submitted: 0,
      total: classroom.studentCount || (classroom.students || []).length || 0,
      status: 'Draft',
      createdAt: new Date().toISOString(),
    }

    setClassroom((prev) => ({
      ...prev,
      assignments: [...(prev?.assignments || []), newAssignment],
    }))
    setShowCreateAssignment(false)
    setAssignmentDraft({
      title: '',
      description: '',
      subject: '',
      instructions: '',
      dueDate: '',
      dueTime: '',
      points: 100,
      type: 'Worksheet',
    })
    toast.success('Assignment created in the classroom (mock)')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
          <Link href="/educator/classrooms">
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Classrooms
          </Link>
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{classroom.name}</h1>
            <p className="text-muted-foreground mt-1">{classroom.subject} — Grade {classroom.grade}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyCode}>
              <Copy className="w-4 h-4 mr-2" />Copy Code
            </Button>
            <Button className="bg-gradient-to-r from-violet-500 to-pink-500" onClick={() => setShowInvite(true)}>
              <Plus className="w-4 h-4 mr-2" />Invite Students
            </Button>
          </div>
        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInvite(false)} />
          <Card className="relative w-full max-w-lg p-6 bg-card/95 backdrop-blur">
            <h3 className="text-xl font-semibold mb-2">Invite Students</h3>
            <p className="text-sm text-muted-foreground mb-4">Students can join from their Student Workspace using this classroom code.</p>
            <div className="mb-4">
              <div className="font-mono text-2xl tracking-widest bg-muted px-4 py-3 rounded text-center">{classroom.classroom_code ?? classroom.code}</div>
            </div>
            <div className="flex gap-2 mb-4">
              <Button className="flex-1" onClick={() => {
                const code = classroom.classroom_code ?? classroom.code ?? ''
                navigator.clipboard.writeText(code)
                toast.success('Classroom code copied')
              }}>
                Copy Code
              </Button>
              <Button className="flex-1" onClick={async () => {
                const code = classroom.classroom_code ?? classroom.code ?? ''
                const shareText = `Join my classroom ${classroom.name} using code ${code}`
                const url = typeof window !== 'undefined' ? window.location.href : ''
                if (navigator.share) {
                  try {
                    await navigator.share({ title: `Join ${classroom.name}`, text: shareText, url })
                  } catch (e) {
                    // user cancelled or no share
                  }
                } else {
                  try {
                    await navigator.clipboard.writeText(`${shareText} — ${url}`)
                    toast.success('Invite copied to clipboard')
                  } catch (e) {
                    toast.error('Unable to share invite')
                  }
                }
              }}>
                Share Invite
              </Button>
            </div>
            <div className="text-sm text-muted-foreground mb-4">Alternatively, instruct students to open their Student Workspace and enter the classroom code to join.</div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInvite(false)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedStudent(null)} />
          <Card className="relative w-full max-w-xl p-6 bg-card/95 backdrop-blur">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold">{selectedStudent.name}</h3>
                <div className="text-sm text-muted-foreground">{selectedStudent.email}</div>
              </div>
              <Button variant="outline" onClick={() => setSelectedStudent(null)}>Close</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Average Score</div>
                <div className="text-2xl font-semibold">{selectedStudent.average}%</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Assignments Completed</div>
                <div className="text-2xl font-semibold">{selectedStudent.completed}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Missing Assignments</div>
                <div className="text-2xl font-semibold">{selectedStudent.missing}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Last Active</div>
                <div className="text-2xl font-semibold">{selectedStudent.lastActive}</div>
              </div>
            </div>
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">Recent Activity</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(selectedStudent.recentActivity || []).map((activity, index) => (
                  <li key={index} className="rounded-lg border border-border p-3 bg-background">{activity}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Teacher Notes</h4>
              <div className="rounded-lg border border-border p-4 bg-background text-sm text-muted-foreground">
                {selectedStudent.notes || 'No notes yet. Add a note in the next phase.'}
              </div>
            </div>
          </Card>
        </div>
      )}

      {showCreateAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateAssignment(false)} />
          <Card className="relative w-full max-w-2xl p-6 bg-card/95 backdrop-blur">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-xl font-semibold">Create Assignment</h3>
                <p className="text-sm text-muted-foreground">Add a new assignment to this classroom. This is mock state only for now.</p>
              </div>
              <Button variant="outline" onClick={() => setShowCreateAssignment(false)}>Close</Button>
            </div>
            <div className="grid gap-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={assignmentDraft.title}
                    onChange={(e) => setAssignmentDraft((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                    placeholder="Worksheet 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    value={assignmentDraft.subject}
                    onChange={(e) => setAssignmentDraft((prev) => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                    placeholder="Algebra"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={assignmentDraft.dueDate}
                    onChange={(e) => setAssignmentDraft((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Time</label>
                  <input
                    type="time"
                    value={assignmentDraft.dueTime}
                    onChange={(e) => setAssignmentDraft((prev) => ({ ...prev, dueTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Assignment Type</label>
                  <select
                    value={assignmentDraft.type}
                    onChange={(e) => setAssignmentDraft((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  >
                    <option>Worksheet</option>
                    <option>Quiz</option>
                    <option>Project</option>
                    <option>Discussion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <input
                    type="number"
                    min="0"
                    value={assignmentDraft.points}
                    onChange={(e) => setAssignmentDraft((prev) => ({ ...prev, points: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={assignmentDraft.description}
                  onChange={(e) => setAssignmentDraft((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  rows={3}
                  placeholder="Explain the goals and output for this assignment."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instructions</label>
                <textarea
                  value={assignmentDraft.instructions}
                  onChange={(e) => setAssignmentDraft((prev) => ({ ...prev, instructions: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  rows={4}
                  placeholder="Provide step-by-step directions for students."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowCreateAssignment(false)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-violet-500 to-pink-500" onClick={createAssignment}>Create Assignment</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Classroom Info */}
      <Card className="p-6 bg-card/60 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Classroom Code</div>
            <div className="font-mono font-semibold">{classroom.classroom_code ?? classroom.code}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Students</div>
            <div className="font-semibold">{classroom.studentCount}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Class Average</div>
            <div className="font-semibold">{classroom.classAverage}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
            <div className="font-semibold">{classroom.completionRate}%</div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab classroom={classroom} />}
        {activeTab === 'students' && <StudentsTab classroom={classroom} onSelectStudent={setSelectedStudent} />}
        {activeTab === 'assignments' && <AssignmentsTab classroom={classroom} onCreate={() => setShowCreateAssignment(true)} />}
        {activeTab === 'resources' && <ResourcesTab classroom={classroom} />}
        {activeTab === 'settings' && <SettingsTab classroom={classroom} />}
      </div>
    </div>
  )
}

function OverviewTab({ classroom }) {
  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card/60">
        <h2 className="text-lg font-semibold mb-4">Class Statistics</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{classroom.studentCount}</div>
            <div className="text-sm text-muted-foreground">Students</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{classroom.classAverage}%</div>
            <div className="text-sm text-muted-foreground">Class Average</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{classroom.activeAssignments}</div>
            <div className="text-sm text-muted-foreground">Active Assignments</div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/60">
        <h2 className="text-lg font-semibold mb-4">Class Progress</h2>
        <div className="h-48">
          <ChartContainer id={`progress-${classroom.id}`} className="h-full" config={{ line: { color: 'linear-gradient(90deg,#7c3aed,#ec4899)' } }}>
            <LineChart data={classroom.progressData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} />
            </LineChart>
          </ChartContainer>
        </div>
      </Card>

      <Card className="p-6 bg-card/60">
        <h2 className="text-lg font-semibold mb-4">Upcoming Assignments</h2>
        <div className="space-y-3">
          {(classroom.assignments || []).map((assignment) => (
            <div key={assignment.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{assignment.title}</div>
                <div className="text-sm text-muted-foreground">Due: {assignment.dueDate}</div>
              </div>
              <div className="w-40 text-right">
                <div className="font-semibold">{assignment.submitted}/{assignment.total}</div>
                <div className="text-xs text-muted-foreground">Submitted</div>
              </div>
              <Button size="sm" variant="outline">Open</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function StudentsTab({ classroom, onSelectStudent }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Student Roster ({classroom.studentCount || (classroom.students || []).length})</h2>
        <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Add Student
        </Button>
      </div>
      <Card className="p-6 bg-card/60">
        <div className="space-y-2">
          {(classroom.students || []).map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => onSelectStudent(student)}
              className="w-full text-left flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                {student.name ? student.name[0] : 'S'}
              </div>
              <div className="flex-1">
                <div className="font-medium">{student.name}</div>
                <div className="text-sm text-muted-foreground">Last active: {student.lastActive}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{student.average}%</div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function AssignmentsTab({ classroom, onCreate }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Assignments</h2>
        <Button className="bg-gradient-to-r from-violet-500 to-pink-500" onClick={onCreate}>
          <Plus className="w-4 h-4 mr-2" />Create Assignment
        </Button>
      </div>
      <Card className="p-6 bg-card/60">
        <div className="space-y-3">
          {(classroom.assignments || []).map((assignment) => (
            <div key={assignment.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{assignment.title}</div>
                <div className="text-sm text-muted-foreground">Due: {assignment.dueDate}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{assignment.submitted}/{assignment.total}</div>
                <div className="text-xs text-muted-foreground">Submitted</div>
              </div>
              <Button size="sm" variant="outline">View</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ResourcesTab({ classroom }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Teaching Resources</h2>
        <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Add Resource
        </Button>
      </div>
      {(classroom.resources || []).length === 0 ? (
        <Card className="p-8 bg-card/60 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-1">No resources yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add lesson plans, worksheets, and other teaching materials.</p>
          <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" />Add Resource
          </Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {(classroom.resources || []).map((res) => (
            <Card key={res.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{res.name}</div>
                  <div className="text-sm text-muted-foreground">{res.type} • {res.date}</div>
                </div>
                <div className="text-right">
                  <Button size="sm" variant="outline">Open</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsTab({ classroom }) {
  const [code, setCode] = useState(classroom.code)
  const [viewResources, setViewResources] = useState(Boolean(classroom?.settings?.viewResources))
  const [submitLate, setSubmitLate] = useState(Boolean(classroom?.settings?.submitLateWork))
  const [commentOn, setCommentOn] = useState(Boolean(classroom?.settings?.commentOnAssignments))
  const [viewAnnouncements, setViewAnnouncements] = useState(Boolean(classroom?.settings?.viewAnnouncements))

  function handleCopy() {
    navigator.clipboard.writeText(code)
    toast.success('Classroom code copied!')
  }

  function handleRegenerate() {
    const parts = classroom.subject ? classroom.subject : 'CLS'
    const newCode = generateClassroomCode(parts, classroom.grade || '')
    setCode(newCode)
    toast.success('Classroom code regenerated (mock)')
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-card/60">
        <h2 className="text-lg font-semibold mb-4">Classroom Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Classroom Name</label>
            <input
              type="text"
              defaultValue={classroom.name}
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-md"
              rows={3}
              placeholder="Add a description for this classroom..."
            />
          </div>
          <div>
            <label className="text-sm font-medium">Classroom Code</label>
            <div className="flex items-center gap-2 mt-1">
              <div className="font-mono px-3 py-2 bg-muted rounded-md">{code}</div>
              <Button size="sm" variant="outline" onClick={handleCopy}>Copy</Button>
              <Button size="sm" onClick={handleRegenerate}>Regenerate</Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between">
              <span>Students can view class resources</span>
              <input type="checkbox" checked={viewResources} onChange={(e) => setViewResources(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between">
              <span>Students can submit late work</span>
              <input type="checkbox" checked={submitLate} onChange={(e) => setSubmitLate(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between">
              <span>Students can comment on assignments</span>
              <input type="checkbox" checked={commentOn} onChange={(e) => setCommentOn(e.target.checked)} />
            </label>
            <label className="flex items-center justify-between">
              <span>Students can view announcements</span>
              <input type="checkbox" checked={viewAnnouncements} onChange={(e) => setViewAnnouncements(e.target.checked)} />
            </label>
          </div>
          <Button className="bg-gradient-to-r from-violet-500 to-pink-500">Save Changes</Button>
        </div>
      </Card>

      <Card className="p-6 bg-card/60 border-red-500/30">
        <h2 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">Once you delete a classroom, there is no going back. Please be certain.</p>
        <Button variant="destructive">Delete Classroom</Button>
      </Card>
    </div>
  )
}
