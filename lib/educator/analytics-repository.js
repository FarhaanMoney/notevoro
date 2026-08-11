import * as assignmentRepo from '@/lib/educator/assignment-repository'
import { mockClassrooms, mockClassroomList } from '@/lib/educator/mock/classroom-data'

const DATE_RANGE_OPTIONS = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  term: 84,
  all: Infinity,
}

function clone(value) {
  return structuredClone(value)
}

function parseDate(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfRange(dateRange) {
  if (!dateRange || dateRange === 'all') return null
  const days = DATE_RANGE_OPTIONS[dateRange] || 7
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days)
  return date
}

function studentIdsForClassroom(classroom) {
  return (classroom?.students || []).map((student) => student.id)
}

function getClassroomById(classroomId) {
  if (!classroomId || classroomId === 'all') return null
  return clone(mockClassrooms[classroomId])
}

function getAllClassrooms() {
  return clone(Object.values(mockClassrooms))
}

export function getClassroomOptions() {
  return [{ id: 'all', name: 'All Classrooms' }, ...clone(mockClassroomList)]
}

function flattenStudents(classrooms) {
  const studentMap = new Map()
  classrooms.forEach((classroom) => {
    (classroom.students || []).forEach((student) => {
      if (!studentMap.has(student.id)) {
        studentMap.set(student.id, { ...student, classroomIds: [classroom.id], classroomNames: [classroom.name] })
      } else {
        const existing = studentMap.get(student.id)
        existing.classroomIds = Array.from(new Set([...existing.classroomIds, classroom.id]))
        existing.classroomNames = Array.from(new Set([...existing.classroomNames, classroom.name]))
      }
    })
  })
  return Array.from(studentMap.values())
}

function filterSubmissions(submissions, classroomIds, dateRange) {
  const startDate = startOfRange(dateRange)
  return submissions.filter((submission) => {
    const assignment = submission.assignmentId
    if (!submission.submittedAt || submission.status === 'not_started') return false
    if (startDate) {
      const submittedAt = parseDate(submission.submittedAt)
      if (!submittedAt || submittedAt < startDate) return false
    }
    return true
  }).filter((submission) => {
    if (!classroomIds || classroomIds.length === 0) return true
    const assignment = submission.assignmentId
    return classroomIds.some((classroomId) => assignment && assignment.startsWith(classroomId) ? true : true)
  })
}

function isCompletionStatus(status) {
  return ['submitted', 'graded', 'returned', 'late'].includes(status)
}

function getAssignmentClassroom(assignments, classroomId) {
  return assignments.filter((assignment) => assignment.classroomId === classroomId)
}

function getStudentRecord(classrooms, studentId) {
  for (const classroom of classrooms) {
    const student = (classroom.students || []).find((item) => item.id === studentId)
    if (student) return { ...student, classroomId: classroom.id, classroomName: classroom.name }
  }
  return null
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function getSubmissionMetrics(assignments, submissions) {
  const metrics = {}
  submissions.forEach((submission) => {
    const assignment = assignments.find((item) => item.id === submission.assignmentId)
    if (!assignment) return
    if (!metrics[assignment.id]) {
      metrics[assignment.id] = { completed: 0, gradedScores: [], total: assignment.assignedStudentIds?.length || 0 }
    }
    const bucket = metrics[assignment.id]
    if (isCompletionStatus(submission.status)) bucket.completed += 1
    if (typeof submission.score === 'number') bucket.gradedScores.push(submission.score)
  })
  return metrics
}

function getStudentSubmissionStats(assignments, submissions, studentId, classroomId) {
  const studentAssignments = assignments.filter((assignment) => {
    if (classroomId && assignment.classroomId !== classroomId) return false
    if (!assignment.assignedStudentIds || assignment.assignedStudentIds.length === 0) return true
    return assignment.assignedStudentIds.includes(studentId)
  })

  const studentSubmissions = submissions.filter((submission) => submission.studentId === studentId)
  const completed = studentSubmissions.filter((submission) => isCompletionStatus(submission.status)).length
  const gradedScores = studentSubmissions.filter((submission) => typeof submission.score === 'number').map((submission) => submission.score)
  const attempted = studentSubmissions.length

  const assignedCount = studentAssignments.length
  const completionRate = assignedCount > 0 ? Math.round((completed / assignedCount) * 100) : 0
  const averageScore = gradedScores.length ? Math.round(average(gradedScores)) : 0
  const missingCount = Math.max(0, assignedCount - completed)

  return {
    assignedCount,
    completed,
    completionRate,
    averageScore,
    missingCount,
    attempted,
    gradedScores,
    studentAssignments,
  }
}

function getClassroomStudentCounts(classrooms) {
  return classrooms.reduce((map, classroom) => {
    map[classroom.id] = (classroom.students || []).length
    return map
  }, {})
}

export async function getAnalyticsSource() {
  const classrooms = getAllClassrooms()
  const assignments = await assignmentRepo.getAssignments()
  const submissions = await assignmentRepo.getSubmissions()
  return { classrooms, assignments, submissions }
}

export async function getAnalyticsOverview({ classrooms, assignments, submissions }, { classroomId = 'all', dateRange = '7d' } = {}) {
  const filteredClassrooms = classroomId === 'all' ? classrooms : classrooms.filter((room) => room.id === classroomId)
  const classroomIds = filteredClassrooms.map((room) => room.id)
  const filteredAssignments = classroomId === 'all' ? assignments : assignments.filter((assignment) => classroomIds.includes(assignment.classroomId))
  const filteredSubmissions = submissions.filter((submission) => {
    const submissionDate = parseDate(submission.submittedAt)
    if (dateRange !== 'all' && submissionDate) {
      const start = startOfRange(dateRange)
      if (start && submissionDate < start) return false
    }
    return filteredAssignments.some((assignment) => assignment.id === submission.assignmentId)
  })

  const studentSet = new Set()
  filteredClassrooms.forEach((classroom) => {
    (classroom.students || []).forEach((student) => studentSet.add(student.id))
  })

  const totalStudents = studentSet.size
  const totalAssignments = filteredAssignments.length

  const assignmentStudentCounts = filteredAssignments.reduce((sum, assignment) => {
    const assigned = assignment.assignedStudentIds?.length || (classrooms.find((room) => room.id === assignment.classroomId)?.students || []).length
    return sum + assigned
  }, 0)

  const completed = filteredSubmissions.filter((submission) => isCompletionStatus(submission.status)).length
  const avgCompletion = assignmentStudentCounts > 0 ? Math.round((completed / assignmentStudentCounts) * 100) : 0

  const gradedScores = filteredSubmissions.filter((submission) => typeof submission.score === 'number').map((submission) => submission.score)
  const classAverage = gradedScores.length ? Math.round(average(gradedScores)) : 0

  return {
    totalStudents,
    avgCompletion,
    classAverage,
    totalAssignments,
  }
}

export async function getClassroomAnalytics({ classrooms, assignments, submissions }, { classroomId = 'all', dateRange = '7d' } = {}) {
  const selectedClassrooms = classroomId === 'all' ? classrooms : classrooms.filter((room) => room.id === classroomId)
  const classroomStudentCounts = getClassroomStudentCounts(classrooms)

  return selectedClassrooms.map((classroom) => {
    const classroomAssignments = assignments.filter((assignment) => assignment.classroomId === classroom.id)
    const classroomSubmissions = submissions.filter((submission) => {
      if (!classroomAssignments.some((assignment) => assignment.id === submission.assignmentId)) return false
      const submissionDate = parseDate(submission.submittedAt)
      if (dateRange !== 'all' && submissionDate) {
        const start = startOfRange(dateRange)
        if (start && submissionDate < start) return false
      }
      return true
    })
    const studentCount = classroomStudentCounts[classroom.id] || (classroom.students || []).length
    const assigned = classroomAssignments.reduce((sum, assignment) => sum + (assignment.assignedStudentIds?.length || studentCount), 0)
    const completed = classroomSubmissions.filter((submission) => isCompletionStatus(submission.status)).length
    const averageScore = classroomSubmissions.filter((submission) => typeof submission.score === 'number').map((submission) => submission.score)
    const avgScore = averageScore.length ? Math.round(average(averageScore)) : 0
    const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0

    return {
      id: classroom.id,
      name: classroom.name,
      studentCount,
      avgScore,
      completionRate,
    }
  })
}

export async function getTopPerformers({ classrooms, assignments, submissions }, { classroomId = 'all', dateRange = '7d' } = {}) {
  const filteredClassrooms = classroomId === 'all' ? classrooms : classrooms.filter((room) => room.id === classroomId)
  const studentRecords = flattenStudents(filteredClassrooms)
  const start = startOfRange(dateRange)

  return studentRecords
    .map((student) => {
      const studentSubmissions = submissions.filter((submission) => {
        if (submission.studentId !== student.id) return false
        if (start && submission.submittedAt) {
          const date = parseDate(submission.submittedAt)
          if (!date || date < start) return false
        }
        return true
      })
      const graded = studentSubmissions.filter((submission) => typeof submission.score === 'number').map((submission) => submission.score)
      const score = graded.length ? Math.round(average(graded)) : student.average || 0
      return {
        id: student.id,
        name: student.name,
        classroom: student.classroomNames[0] || 'Unknown Classroom',
        average: score,
      }
    })
    .sort((a, b) => b.average - a.average)
    .slice(0, 5)
}

export async function getStudentsNeedingAttention({ classrooms, assignments, submissions }, { classroomId = 'all', dateRange = '7d' } = {}) {
  const filteredClassrooms = classroomId === 'all' ? classrooms : classrooms.filter((room) => room.id === classroomId)
  const studentRecords = flattenStudents(filteredClassrooms)
  const start = startOfRange(dateRange)

  return studentRecords
    .map((student) => {
      const stats = getStudentSubmissionStats(assignments, submissions.filter((submission) => {
        if (submission.studentId !== student.id) return false
        if (start && submission.submittedAt) {
          const date = parseDate(submission.submittedAt)
          if (!date || date < start) return false
        }
        return true
      }), student.id, classroomId)
      const reasons = []
      if (stats.averageScore > 0 && stats.averageScore < 70) reasons.push('Low average score')
      if (stats.completionRate < 70) reasons.push('Low completion rate')
      if (stats.missingCount >= 2) reasons.push('Missed assignments')
      const lastActiveDays = student.lastActive ? Number(student.lastActive.match(/\d+/)?.[0] || 0) : 0
      if (student.lastActive && student.lastActive.includes('day') && lastActiveDays >= 3) reasons.push('No recent activity')
      const trend = student.performanceTrend || []
      if (trend.length >= 2 && trend[trend.length - 1] < trend[trend.length - 2]) reasons.push('Recent performance decline')

      return {
        id: student.id,
        name: student.name,
        classroom: student.classroomNames[0] || 'Unknown Classroom',
        average: stats.averageScore || student.average || 0,
        reason: reasons[0] || 'Needs review',
      }
    })
    .filter((student) => student.reason !== 'Needs review' || student.average < 75)
    .sort((a, b) => a.average - b.average)
    .slice(0, 5)
}

export async function getAssignmentAnalytics({ classrooms, assignments, submissions }, { classroomId = 'all', dateRange = '7d' } = {}) {
  const start = startOfRange(dateRange)
  const filteredAssignments = classroomId === 'all' ? assignments : assignments.filter((assignment) => assignment.classroomId === classroomId)

  return filteredAssignments.map((assignment) => {
    const assignmentSubmissions = submissions.filter((submission) => submission.assignmentId === assignment.id && (!start || parseDate(submission.submittedAt) >= start))
    const completed = assignmentSubmissions.filter((submission) => isCompletionStatus(submission.status)).length
    const averageScore = assignmentSubmissions.filter((submission) => typeof submission.score === 'number').map((submission) => submission.score)
    const avgScore = averageScore.length ? Math.round(average(averageScore)) : 0
    const assignedCount = assignment.assignedStudentIds?.length || (classrooms.find((room) => room.id === assignment.classroomId)?.students || []).length
    const completion = assignedCount > 0 ? Math.round((completed / assignedCount) * 100) : 0
    const classroom = classrooms.find((room) => room.id === assignment.classroomId)

    return {
      id: assignment.id,
      title: assignment.title,
      classroom: classroom?.name || 'Unknown Classroom',
      completion,
      avgScore,
    }
  })
}

export async function getPerformanceTrend({ classrooms, assignments, submissions }, { classroomId = 'all', dateRange = '7d' } = {}) {
  const start = startOfRange(dateRange)
  const filteredClassrooms = classroomId === 'all' ? classrooms : classrooms.filter((room) => room.id === classroomId)
  const allowedClassroomIds = filteredClassrooms.map((room) => room.id)
  const filteredSubmissions = submissions.filter((submission) => {
    const assignment = assignments.find((item) => item.id === submission.assignmentId)
    if (!assignment || !allowedClassroomIds.includes(assignment.classroomId)) return false
    if (!submission.submittedAt) return false
    if (start) {
      const submittedAt = parseDate(submission.submittedAt)
      if (!submittedAt || submittedAt < start) return false
    }
    return typeof submission.score === 'number'
  })

  if (!filteredSubmissions.length) {
    const fallback = filteredClassrooms.flatMap((room) => room.progressData || [])
    return fallback.length ? fallback.map((point) => ({ label: point.day, value: point.score })) : []
  }

  const group = new Map()
  filteredSubmissions.forEach((submission) => {
    const date = parseDate(submission.submittedAt)
    if (!date) return
    const label = `${date.getMonth() + 1}/${date.getDate()}`
    const row = group.get(label) || []
    row.push(submission.score)
    group.set(label, row)
  })

  return Array.from(group.entries())
    .map(([label, scores]) => ({ label, value: Math.round(average(scores)) }))
    .sort((a, b) => new Date(a.label) - new Date(b.label))
}

export async function getStudentAnalytics(studentId, { classrooms, assignments, submissions }, { classroomId = 'all', dateRange = '7d' } = {}) {
  const student = getStudentRecord(classrooms, studentId)
  if (!student) return null
  const stats = getStudentSubmissionStats(assignments, submissions, studentId, classroomId)
  const trend = student.performanceTrend || []
  const strengths = trend.slice(-3).filter((score) => score >= 85).length ? ['Consistent high scores', 'Strong progress'] : ['Focus on concepts']
  const improvements = trend.slice(-3).filter((score) => score < 75).length ? ['Assignment completion', 'Concept review'] : ['Keep practicing challenging problems']

  return {
    id: student.id,
    name: student.name,
    classroom: student.classroomNames[0] || 'Unknown Classroom',
    average: stats.averageScore || student.average || 0,
    completion: stats.completionRate,
    completed: stats.completed,
    totalAssignments: stats.assignedCount,
    recentPerformance: trend.slice(-5),
    strengths,
    improvements,
    performanceTrend: trend,
    lastActive: student.lastActive,
    note: student.notes,
  }
}

export async function getClassroomAnalyticsById(classroomId, source, filters) {
  const all = await getClassroomAnalytics(source, { ...filters, classroomId })
  return all.find((room) => room.id === classroomId) || null
}

export default {
  getAnalyticsSource,
  getAnalyticsOverview,
  getClassroomAnalytics,
  getTopPerformers,
  getStudentsNeedingAttention,
  getAssignmentAnalytics,
  getPerformanceTrend,
  getStudentAnalytics,
  getClassroomAnalyticsById,
  getClassroomOptions,
}
