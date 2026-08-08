import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Users, FileText, BookOpen, Plus, AlertTriangle, Clock, ArrowRight, GraduationCap, CheckCircle } from 'lucide-react'
import { VoroIllustration } from '@/components/voro/VoroIllustration'

export default async function EducatorDashboardPage() {
  const supabase = await createClient()

  let name = 'Demo Educator'
  let classrooms = []
  let recentActivity = []
  let needsAttention = []

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      name = profile?.display_name || profile?.full_name || 'Educator'
      
      // Mock data for now - will be replaced with real queries
      classrooms = [
        { id: '1', name: 'Mathematics 8A', subject: 'Mathematics', grade: '8', student_count: 24, completion: 82, next_deadline: 'Tomorrow, 4:00 PM' },
        { id: '2', name: 'Biology 10B', subject: 'Biology', grade: '10', student_count: 28, completion: 65, next_deadline: 'Friday, 2:00 PM' },
      ]
      
      recentActivity = [
        { id: '1', type: 'submission', student: 'Ahmed', action: 'submitted Algebra Assignment', time: '2 hours ago' },
        { id: '2', type: 'completion', student: 'Sara', action: 'completed Biology Quiz', time: '3 hours ago' },
        { id: '3', type: 'joined', student: 'John', action: 'joined Mathematics 8A', time: '5 hours ago' },
        { id: '4', type: 'needs_feedback', student: 'Emma', action: 'needs feedback on Physics assignment', time: '1 day ago' },
      ]
      
      needsAttention = [
        { id: '1', type: 'overdue', count: 3, message: '3 overdue assignments' },
        { id: '2', type: 'not_submitted', count: 2, message: '2 students haven\'t submitted work' },
        { id: '3', type: 'average_drop', count: 8, message: 'Class average dropped 8%' },
        { id: '4', type: 'struggling', count: 4, message: '4 students struggling with Algebra' },
      ]
    }
  } else {
    // Preview seed data
    classrooms = [
      { id: 'demo-1', name: 'Mathematics 8A', subject: 'Mathematics', grade: '8', student_count: 24, completion: 82, next_deadline: 'Tomorrow, 4:00 PM' },
    ]
    recentActivity = [
      { id: 'demo-1', type: 'submission', student: 'Ahmed', action: 'submitted Algebra Assignment', time: '2 hours ago' },
    ]
    needsAttention = [
      { id: 'demo-1', type: 'overdue', count: 3, message: '3 overdue assignments' },
    ]
  }

  const quickActions = [
    { icon: Users, label: 'Create Classroom', href: '/educator/classrooms', color: 'from-blue-500 to-cyan-500' },
    { icon: FileText, label: 'Create Assignment', href: '/educator/assignments', color: 'from-violet-500 to-purple-500' },
    { icon: CheckCircle, label: 'Create Quiz', href: '/educator/resources', color: 'from-pink-500 to-rose-500' },
    { icon: BookOpen, label: 'Create Lesson', href: '/educator/resources', color: 'from-orange-500 to-amber-500' },
    { icon: GraduationCap, label: 'Create Presentation', href: '/educator/resources', color: 'from-green-500 to-emerald-500' },
    { icon: Sparkles, label: 'Ask Voro', href: '/educator/voro', color: 'from-violet-500 to-pink-500' },
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="flex items-center gap-6 mb-8">
        <VoroIllustration type="dashboard" size="xl" />
        <div>
          <h1 className="text-3xl font-bold">Good morning, {name} 👋</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your classrooms today.</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-pink-500/10 border-primary/30 hover:border-primary/60 transition cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow mb-3">
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <div className="text-sm font-semibold">{action.label}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Classrooms */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">My Classrooms</h2>
            <Link href="/educator/classrooms">
              <Button size="sm" variant="ghost">View all</Button>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {classrooms.length === 0 ? (
              <Card className="p-8 bg-card/40 border-dashed">
                <div className="text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-1">No classrooms yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first classroom to start teaching.</p>
                  <Link href="/educator/classrooms">
                    <Button size="sm" className="bg-gradient-to-r from-violet-500 to-pink-500">
                      <Plus className="w-4 h-4 mr-2" />Create Classroom
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : classrooms.map((classroom) => (
              <Link key={classroom.id} href={`/educator/classrooms/${classroom.id}`}>
                <Card className="p-5 bg-card/60 hover:border-primary/40 transition cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{classroom.name}</h3>
                      <p className="text-sm text-muted-foreground">{classroom.subject} — Grade {classroom.grade}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{classroom.student_count} Students</span>
                      <span className="text-muted-foreground">{classroom.completion}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: `${classroom.completion}%` }} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Next deadline: {classroom.next_deadline}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Needs Attention */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Needs Attention</h2>
          <div className="space-y-2">
            {needsAttention.length === 0 ? (
              <Card className="p-4 bg-card/40">
                <p className="text-sm text-muted-foreground text-center">All caught up! 🎉</p>
              </Card>
            ) : needsAttention.map((item) => (
              <Card key={item.id} className="p-4 bg-card/60 border-orange-500/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.message}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Student Activity */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Student Activity</h2>
        <div className="space-y-2">
          {recentActivity.length === 0 ? (
            <Card className="p-4 bg-card/40">
              <p className="text-sm text-muted-foreground text-center">No recent activity</p>
            </Card>
          ) : recentActivity.map((activity) => (
            <Card key={activity.id} className="p-3 bg-card/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                  {activity.student[0]}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{activity.student}</span>
                  <span className="text-sm text-muted-foreground"> {activity.action}</span>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
