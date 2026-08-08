'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, FileText, BookOpen, BarChart3, Settings, Copy, ArrowLeft, Plus } from 'lucide-react'
import { toast } from 'sonner'

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
  
  // Mock classroom data
  const classroom = {
    id: params.id,
    name: 'Mathematics 8A',
    subject: 'Mathematics',
    grade: '8',
    student_count: 24,
    code: 'MATH8A-7K4P',
    completion: 82,
    next_deadline: 'Tomorrow, 4:00 PM',
  }

  function copyCode() {
    navigator.clipboard.writeText(classroom.code)
    toast.success('Classroom code copied!')
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => window.history.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />Back to Classrooms
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
            <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
              <Plus className="w-4 h-4 mr-2" />Add Student
            </Button>
          </div>
        </div>
      </div>

      {/* Classroom Info */}
      <Card className="p-6 bg-card/60 mb-6">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Classroom Code</div>
            <div className="font-mono font-semibold">{classroom.code}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Students</div>
            <div className="font-semibold">{classroom.student_count}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
            <div className="font-semibold">{classroom.completion}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Next Deadline</div>
            <div className="font-semibold">{classroom.next_deadline}</div>
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
        {activeTab === 'students' && <StudentsTab classroom={classroom} />}
        {activeTab === 'assignments' && <AssignmentsTab classroom={classroom} />}
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
            <div className="text-2xl font-bold">{classroom.student_count}</div>
            <div className="text-sm text-muted-foreground">Total Students</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{classroom.completion}%</div>
            <div className="text-sm text-muted-foreground">Assignment Completion</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">3</div>
            <div className="text-sm text-muted-foreground">Active Assignments</div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/60">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { student: 'Ahmed', action: 'submitted Algebra Assignment', time: '2 hours ago' },
            { student: 'Sara', action: 'completed Biology Quiz', time: '3 hours ago' },
            { student: 'John', action: 'joined the classroom', time: '5 hours ago' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                {activity.student[0]}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">{activity.student}</span>
                <span className="text-sm text-muted-foreground"> {activity.action}</span>
              </div>
              <span className="text-xs text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function StudentsTab({ classroom }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Student Roster ({classroom.student_count})</h2>
        <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Add Student
        </Button>
      </div>
      <Card className="p-6 bg-card/60">
        <div className="space-y-2">
          {['Ahmed Khan', 'Sara Patel', 'John Smith', 'Emma Wilson', 'Michael Brown'].map((student, i) => (
            <div key={i} className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                {student[0]}
              </div>
              <div className="flex-1">
                <div className="font-medium">{student}</div>
                <div className="text-sm text-muted-foreground">Last active: {['2 hours ago', '1 day ago', '3 days ago', '1 week ago', '2 weeks ago'][i]}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{[85, 92, 78, 88, 95][i]}%</div>
                <div className="text-xs text-muted-foreground">Avg Score</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function AssignmentsTab({ classroom }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Assignments</h2>
        <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Create Assignment
        </Button>
      </div>
      <Card className="p-6 bg-card/60">
        <div className="space-y-3">
          {[
            { title: 'Algebra Assignment', due: 'Tomorrow, 4:00 PM', submitted: 20, total: 24 },
            { title: 'Geometry Quiz', due: 'Friday, 2:00 PM', submitted: 15, total: 24 },
            { title: 'Word Problems Set', due: 'Next Monday', submitted: 5, total: 24 },
          ].map((assignment, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{assignment.title}</div>
                <div className="text-sm text-muted-foreground">Due: {assignment.due}</div>
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
      <Card className="p-8 bg-card/60 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold mb-1">No resources yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Add lesson plans, worksheets, and other teaching materials.</p>
        <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
          <Plus className="w-4 h-4 mr-2" />Add Resource
        </Button>
      </Card>
    </div>
  )
}

function SettingsTab({ classroom }) {
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
