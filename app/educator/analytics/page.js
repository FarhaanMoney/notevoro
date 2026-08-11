'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { BarChart3, TrendingUp, Users, FileText, CheckCircle, AlertTriangle } from 'lucide-react'
import { VoroEmptyState } from '@/components/voro/VoroIllustration'
import { toast } from 'sonner'
import * as analyticsRepo from '@/lib/educator/analytics-repository'

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'term', label: 'This term' },
  { value: 'all', label: 'All time' },
]

function formatStat(value, suffix = '') {
  return value === null || value === undefined ? '-' : `${value}${suffix}`
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [classrooms, setClassrooms] = useState([])
  const [activeClassroom, setActiveClassroom] = useState('all')
  const [dateRange, setDateRange] = useState('7d')
  const [overview, setOverview] = useState(null)
  const [classroomPerformance, setClassroomPerformance] = useState([])
  const [topPerformers, setTopPerformers] = useState([])
  const [needsAttention, setNeedsAttention] = useState([])
  const [assignmentAnalytics, setAssignmentAnalytics] = useState([])
  const [performanceTrend, setPerformanceTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showStudentSheet, setShowStudentSheet] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentLoading, setStudentLoading] = useState(false)
  const [analyticsSource, setAnalyticsSource] = useState(null)
  const [showClassroomSheet, setShowClassroomSheet] = useState(false)
  const [selectedClassroomDetails, setSelectedClassroomDetails] = useState(null)

  useEffect(() => {
    let mounted = true
    async function loadSource() {
      setLoading(true)
      setError(null)
      try {
        const [classroomOptions, source] = await Promise.all([
          analyticsRepo.getClassroomOptions(),
          analyticsRepo.getAnalyticsSource(),
        ])
        if (!mounted) return
        setClassrooms(classroomOptions)
        setAnalyticsSource(source)
      } catch (err) {
        console.error(err)
        if (!mounted) return
        setError('Couldn’t load analytics.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadSource()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!analyticsSource) return
    let mounted = true
    async function refresh() {
      setLoading(true)
      setError(null)
      try {
        const [overviewData, classroomData, topData, attentionData, assignmentData, trendData] = await Promise.all([
          analyticsRepo.getAnalyticsOverview(analyticsSource, { classroomId: activeClassroom, dateRange }),
          analyticsRepo.getClassroomAnalytics(analyticsSource, { classroomId: activeClassroom, dateRange }),
          analyticsRepo.getTopPerformers(analyticsSource, { classroomId: activeClassroom, dateRange }),
          analyticsRepo.getStudentsNeedingAttention(analyticsSource, { classroomId: activeClassroom, dateRange }),
          analyticsRepo.getAssignmentAnalytics(analyticsSource, { classroomId: activeClassroom, dateRange }),
          analyticsRepo.getPerformanceTrend(analyticsSource, { classroomId: activeClassroom, dateRange }),
        ])
        if (!mounted) return
        setOverview(overviewData)
        setClassroomPerformance(classroomData)
        setTopPerformers(topData)
        setNeedsAttention(attentionData)
        setAssignmentAnalytics(assignmentData)
        setPerformanceTrend(trendData)
      } catch (err) {
        console.error(err)
        if (!mounted) return
        setError('Couldn’t load analytics.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    refresh()
    return () => { mounted = false }
  }, [analyticsSource, activeClassroom, dateRange])

  const handleRetry = async () => {
    setError(null)
    setLoading(true)
    setOverview(null)
    setClassroomPerformance([])
    setTopPerformers([])
    setNeedsAttention([])
    setAssignmentAnalytics([])
    setPerformanceTrend([])
    setActiveClassroom('all')
    setDateRange('7d')
    setSelectedStudent(null)
    setShowStudentSheet(false)
    setShowClassroomSheet(false)

    try {
      const [classroomOptions, source] = await Promise.all([
        analyticsRepo.getClassroomOptions(),
        analyticsRepo.getAnalyticsSource(),
      ])
      setClassrooms(classroomOptions)
      setAnalyticsSource(source)
    } catch (err) {
      console.error(err)
      setError('Couldn’t load analytics.')
    } finally {
      setLoading(false)
    }
  }

  const handleStudentClick = async (studentId) => {
    setStudentLoading(true)
    try {
      const details = await analyticsRepo.getStudentAnalytics(studentId, analyticsSource, { classroomId: activeClassroom, dateRange })
      setSelectedStudent(details)
      setShowStudentSheet(true)
    } catch (err) {
      console.error(err)
      toast.error('Unable to load student details.')
    } finally {
      setStudentLoading(false)
    }
  }

  const handleClassroomClick = (classroom) => {
    setActiveClassroom(classroom.id)
    setSelectedClassroomDetails(classroom)
    setShowClassroomSheet(true)
  }

  const renderSectionSkeleton = (count = 3) => (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-3xl border border-border bg-card/70 p-4">
          <Skeleton className="h-4 w-3/4 mb-3" />
          <Skeleton className="h-3 w-full mb-2" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  )

  const hasNoClassrooms = !loading && classrooms.length === 0

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="space-y-2">
          <div className="text-sm uppercase tracking-[0.24em] text-primary">Analytics</div>
          <h1 className="text-4xl font-semibold tracking-tight">Track student and classroom performance.</h1>
          <p className="max-w-2xl text-muted-foreground">Measure growth, identify learners who need support, and view assignment outcomes across your classrooms.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Select value={activeClassroom} onValueChange={setActiveClassroom}>
            <SelectTrigger className="min-w-[180px]">
              <SelectValue>{classrooms.find((room) => room.id === activeClassroom)?.name || 'All Classrooms'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classrooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="min-w-[180px]">
              <SelectValue>{RANGE_OPTIONS.find((option) => option.value === dateRange)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <div className="space-y-6">
          <Card className="p-8 bg-card/60 text-center">
            <div className="text-xl font-semibold mb-3">Couldn’t load analytics.</div>
            <p className="text-sm text-muted-foreground mb-6">There was an issue retrieving your analytics data. Try again or refresh the page.</p>
            <Button onClick={handleRetry} className="bg-gradient-to-r from-violet-500 to-pink-500">
              Try Again
            </Button>
          </Card>
        </div>
      ) : hasNoClassrooms ? (
        <VoroEmptyState
          type="default"
          title="Create your first classroom to start seeing analytics."
          description="When students join and assignments are assigned, analytics will populate automatically."
          action={<Button onClick={() => router.push('/educator/classrooms')} className="bg-gradient-to-r from-violet-500 to-pink-500">
            Create Classroom
          </Button>}
          className="bg-card/40 border-dashed"
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { icon: Users, label: 'Total Students', value: overview?.totalStudents, suffix: '' },
              { icon: CheckCircle, label: 'Avg Completion', value: overview?.avgCompletion, suffix: '%' },
              { icon: BarChart3, label: 'Class Average', value: overview?.classAverage, suffix: '%' },
              { icon: FileText, label: 'Total Assignments', value: overview?.totalAssignments, suffix: '' },
            ].map((stat) => (
              <Card key={stat.label} className="p-5 bg-card/60">
                <div className="flex items-center gap-3">
                  <stat.icon className="w-5 h-5 text-primary" />
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{stat.label}</div>
                    <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-8 w-24" /> : formatStat(stat.value, stat.suffix)}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-6 bg-card/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">Classroom Performance</h2>
                <p className="text-sm text-muted-foreground">Review average score and completion rate per classroom.</p>
              </div>
              <div className="text-sm text-muted-foreground">{activeClassroom === 'all' ? 'All classrooms' : `Showing ${classrooms.find((room) => room.id === activeClassroom)?.name}`}</div>
            </div>
            {loading ? (
              <div className="space-y-4">{renderSectionSkeleton(2)}</div>
            ) : classroomPerformance.length === 0 ? (
              <div className="rounded-3xl border border-border bg-background p-8 text-center">
                <p className="font-medium">No classroom data available yet.</p>
                <p className="text-sm text-muted-foreground">Assign work and gather submissions to populate performance metrics.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {classroomPerformance.map((classroom) => (
                  <button
                    key={classroom.id}
                    type="button"
                    onClick={() => handleClassroomClick(classroom)}
                    className="w-full rounded-3xl border border-border bg-card/70 p-5 text-left transition hover:border-primary/50"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-base font-semibold">{classroom.name}</div>
                        <div className="text-sm text-muted-foreground">{classroom.studentCount} students</div>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="rounded-2xl bg-muted px-3 py-2">
                          <div className="text-muted-foreground text-[11px] uppercase tracking-[0.24em]">Average Score</div>
                          <div className="font-semibold">{classroom.avgScore}%</div>
                        </div>
                        <div className="rounded-2xl bg-muted px-3 py-2">
                          <div className="text-muted-foreground text-[11px] uppercase tracking-[0.24em]">Completion Rate</div>
                          <div className="font-semibold">{classroom.completionRate}%</div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="grid xl:grid-cols-[minmax(0,1.2fr)_420px] gap-6">
            <div className="space-y-6">
              <Card className="p-6 bg-card/60">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold">Performance Trend</h2>
                    <p className="text-sm text-muted-foreground">Average student performance over time.</p>
                  </div>
                </div>
                {loading ? (
                  <div className="h-72 rounded-3xl border border-border bg-card/70 p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-44 w-full" />
                  </div>
                ) : performanceTrend.length === 0 ? (
                  <div className="rounded-3xl border border-border bg-background p-8 text-center">
                    <p className="font-medium">No trend data available.</p>
                    <p className="text-sm text-muted-foreground">Performance trends appear once students submit graded work.</p>
                  </div>
                ) : (
                  <ChartContainer id="analytics-trend" className="h-72" config={{ line: { color: 'linear-gradient(90deg,#7c3aed,#ec4899)' } }}>
                    <LineChart data={performanceTrend} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fill: 'rgba(148,163,184,1)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(148,163,184,1)', fontSize: 12 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                      <Line type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} />
                    </LineChart>
                  </ChartContainer>
                )}
              </Card>

              <Card className="p-6 bg-card/60">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold">Assignment Performance</h2>
                    <p className="text-sm text-muted-foreground">See completion and average score for each assignment.</p>
                  </div>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="h-20 rounded-3xl bg-muted/50 p-4" />
                    ))}
                  </div>
                ) : assignmentAnalytics.length === 0 ? (
                  <div className="rounded-3xl border border-border bg-background p-8 text-center">
                    <p className="font-medium">No assignment analytics yet.</p>
                    <p className="text-sm text-muted-foreground">Assign work to begin tracking completion and score trends.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {assignmentAnalytics.map((assignment) => (
                      <button
                        key={assignment.id}
                        type="button"
                        onClick={() => router.push(`/educator/assignments/${assignment.id}/submissions`)}
                        className="w-full rounded-3xl border border-border bg-card/70 p-4 text-left transition hover:border-primary/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold">{assignment.title}</div>
                            <div className="text-sm text-muted-foreground">{assignment.classroom}</div>
                          </div>
                          <div className="text-sm font-semibold">{assignment.completion}%</div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                          <div className="rounded-2xl bg-muted px-3 py-2">
                            <div className="text-muted-foreground">Completion</div>
                            <div className="font-semibold">{assignment.completion}%</div>
                          </div>
                          <div className="rounded-2xl bg-muted px-3 py-2">
                            <div className="text-muted-foreground">Avg Score</div>
                            <div className="font-semibold">{assignment.avgScore}%</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6 bg-card/60">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    <h2 className="text-lg font-semibold">Top Performers</h2>
                  </div>
                </div>
                {loading ? (
                  renderSectionSkeleton(3)
                ) : topPerformers.length === 0 ? (
                  <div className="rounded-3xl border border-border bg-background p-8 text-center">
                    <p className="font-medium">No top performers yet.</p>
                    <p className="text-sm text-muted-foreground">Performance data will appear once assignments are scored.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topPerformers.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleStudentClick(student.id)}
                        className="w-full rounded-3xl border border-border bg-card/70 p-4 text-left transition hover:border-primary/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-semibold">{student.name[0]}</div>
                          <div className="flex-1">
                            <div className="font-semibold">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.classroom}</div>
                          </div>
                          <div className="text-lg font-semibold text-green-500">{student.average}%</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-6 bg-card/60">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                    <h2 className="text-lg font-semibold">Needs Attention</h2>
                  </div>
                </div>
                {loading ? (
                  renderSectionSkeleton(3)
                ) : needsAttention.length === 0 ? (
                  <div className="rounded-3xl border border-border bg-background p-8 text-center">
                    <p className="font-medium">No students need attention right now.</p>
                    <p className="text-sm text-muted-foreground">Continue assigning work and reviewing performance to keep this section current.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {needsAttention.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => handleStudentClick(student.id)}
                        className="w-full rounded-3xl border border-border bg-card/70 p-4 text-left transition hover:border-orange-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-semibold">{student.name[0]}</div>
                          <div className="flex-1">
                            <div className="font-semibold">{student.name}</div>
                            <div className="text-sm text-muted-foreground">{student.classroom}</div>
                            <div className="text-xs text-orange-400 mt-1">{student.reason}</div>
                          </div>
                          <div className="text-lg font-semibold text-orange-500">{student.average}%</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      <Sheet open={showStudentSheet} onOpenChange={setShowStudentSheet}>
        <SheetContent side="right" className="max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedStudent?.name}</SheetTitle>
            <SheetDescription>{selectedStudent?.classroom}</SheetDescription>
          </SheetHeader>

          {studentLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selectedStudent ? (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-border bg-card/70 p-4">
                  <div className="text-sm text-muted-foreground">Average Score</div>
                  <div className="text-2xl font-semibold">{selectedStudent.average}%</div>
                </div>
                <div className="rounded-3xl border border-border bg-card/70 p-4">
                  <div className="text-sm text-muted-foreground">Completion</div>
                  <div className="text-2xl font-semibold">{selectedStudent.completion}%</div>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card/70 p-4">
                <div className="text-sm text-muted-foreground">Assignments completed</div>
                <div className="text-xl font-semibold">{selectedStudent.completed} / {selectedStudent.totalAssignments}</div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-3">Recent Performance</div>
                <div className="grid grid-cols-3 gap-3">
                  {(selectedStudent.recentPerformance || []).map((value, index) => (
                    <div key={index} className="rounded-3xl border border-border bg-card/70 p-4 text-center">
                      <div className="text-sm text-muted-foreground">Session {index + 1}</div>
                      <div className="text-xl font-semibold">{value}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-3xl border border-border bg-card/70 p-4">
                  <div className="text-sm text-muted-foreground">Strengths</div>
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {selectedStudent.strengths?.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
                <div className="rounded-3xl border border-border bg-card/70 p-4">
                  <div className="text-sm text-muted-foreground">Needs Improvement</div>
                  <ul className="mt-2 list-disc list-inside text-sm">
                    {selectedStudent.improvements?.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card/70 p-4">
                <div className="text-sm text-muted-foreground">Last active</div>
                <div className="font-semibold">{selectedStudent.lastActive}</div>
                {selectedStudent.note && <p className="text-sm text-muted-foreground mt-2">{selectedStudent.note}</p>}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">Select a student from the dashboard to view details.</div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={showClassroomSheet} onOpenChange={setShowClassroomSheet}>
        <SheetContent side="right" className="max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedClassroomDetails?.name}</SheetTitle>
            <SheetDescription>Classroom analytics overview</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="rounded-3xl border border-border bg-card/70 p-4">
              <div className="text-sm text-muted-foreground">Students</div>
              <div className="text-2xl font-semibold">{selectedClassroomDetails?.studentCount ?? '-'}</div>
            </div>
            <div className="rounded-3xl border border-border bg-card/70 p-4">
              <div className="text-sm text-muted-foreground">Average Score</div>
              <div className="text-2xl font-semibold">{classroomPerformance.find((room) => room.id === selectedClassroomDetails?.id)?.avgScore ?? '-'}%</div>
            </div>
            <div className="rounded-3xl border border-border bg-card/70 p-4">
              <div className="text-sm text-muted-foreground">Completion Rate</div>
              <div className="text-2xl font-semibold">{classroomPerformance.find((room) => room.id === selectedClassroomDetails?.id)?.completionRate ?? '-'}%</div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => router.push(`/educator/classrooms/${selectedClassroomDetails?.id}`)}>
              Open Classroom
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
