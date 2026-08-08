import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp, Users, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'

export default function AnalyticsPage() {
  // Mock analytics data
  const classrooms = [
    { id: '1', name: 'Mathematics 8A', average: 82, completion: 85, students: 24 },
    { id: '2', name: 'Biology 10B', average: 78, completion: 72, students: 28 },
  ]

  const topPerformers = [
    { name: 'Ahmed Khan', classroom: 'Mathematics 8A', average: 95 },
    { name: 'Sara Patel', classroom: 'Biology 10B', average: 92 },
    { name: 'Michael Brown', classroom: 'Mathematics 8A', average: 90 },
  ]

  const needsAttention = [
    { name: 'John Smith', classroom: 'Mathematics 8A', average: 65, reason: 'Struggling with algebra' },
    { name: 'Emma Wilson', classroom: 'Biology 10B', average: 68, reason: 'Missed recent assignments' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track student and classroom performance.</p>
      </div>

      {classrooms.length === 0 ? (
        <VoroEmptyState
          type="default"
          title="No analytics data yet"
          description="Once you have classrooms and assignments, analytics will appear here."
          action={<Button variant="outline" disabled>
            Coming Soon
          </Button>}
          className="bg-card/40 border-dashed"
        />
      ) : (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Total Students', value: '52', color: 'text-blue-400' },
              { icon: CheckCircle, label: 'Avg Completion', value: '79%', color: 'text-green-400' },
              { icon: BarChart3, label: 'Class Average', value: '80%', color: 'text-primary' },
              { icon: FileText, label: 'Total Assignments', value: '12', color: 'text-orange-400' },
            ].map((stat, i) => (
              <Card key={i} className="p-4 bg-card/60">
                <div className="flex items-center gap-3">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                    <div className="text-xl font-semibold">{stat.value}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Classroom Performance */}
          <Card className="p-6 bg-card/60">
            <h2 className="text-lg font-semibold mb-4">Classroom Performance</h2>
            <div className="space-y-4">
              {classrooms.map((classroom) => (
                <div key={classroom.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{classroom.name}</span>
                    <span className="text-sm text-muted-foreground">{classroom.students} students</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Average Score</span>
                        <span className="font-semibold">{classroom.average}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: `${classroom.average}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Completion Rate</span>
                        <span className="font-semibold">{classroom.completion}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500" style={{ width: `${classroom.completion}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card className="p-6 bg-card/60">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Top Performers
              </h2>
              <div className="space-y-3">
                {topPerformers.map((student, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                      {student.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.classroom}</div>
                    </div>
                    <div className="font-semibold text-green-400">{student.average}%</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Needs Attention */}
            <Card className="p-6 bg-card/60">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                Needs Attention
              </h2>
              <div className="space-y-3">
                {needsAttention.map((student, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-semibold">
                      {student.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground">{student.classroom}</div>
                      <div className="text-xs text-orange-400 mt-1">{student.reason}</div>
                    </div>
                    <div className="font-semibold text-orange-400">{student.average}%</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
