import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, Calendar, Users, CheckCircle, Clock } from 'lucide-react'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'

export default function AssignmentsPage() {
  // Mock assignments data
  const assignments = [
    { id: '1', title: 'Algebra Chapter 5 Problems', classroom: 'Mathematics 8A', dueDate: 'Tomorrow, 4:00 PM', status: 'active', submitted: 20, total: 24 },
    { id: '2', title: 'Biology Quiz - Cell Division', classroom: 'Biology 10B', dueDate: 'Friday, 2:00 PM', status: 'active', submitted: 15, total: 28 },
    { id: '3', title: 'Geometry Worksheet', classroom: 'Mathematics 8A', dueDate: 'Next Monday', status: 'draft', submitted: 0, total: 24 },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">Create, distribute, and grade assignments.</p>
        </div>
        <Link href="/educator/assignments/create">
          <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
            <Plus className="w-4 h-4 mr-2" />Create Assignment
          </Button>
        </Link>
      </div>

      {assignments.length === 0 ? (
        <VoroEmptyState
          type="default"
          title="No assignments yet"
          description="Create your first assignment to start tracking student work."
          action={<Link href="/educator/assignments/create">
            <Button className="bg-gradient-to-r from-violet-500 to-pink-500">
              <Plus className="w-4 h-4 mr-2" />Create Assignment
            </Button>
          </Link>}
          className="bg-card/40 border-dashed"
        />
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="p-5 bg-card/60 hover:border-primary/40 transition">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{assignment.title}</h3>
                      <p className="text-sm text-muted-foreground">{assignment.classroom}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assignment.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      assignment.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {assignment.status === 'active' ? 'Active' : assignment.status === 'draft' ? 'Draft' : 'Completed'}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {assignment.dueDate}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {assignment.submitted}/{assignment.total} submitted
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Edit</Button>
                  <Button size="sm" variant="outline">View Submissions</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
