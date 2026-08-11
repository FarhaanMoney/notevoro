import { getMockAssignments, getMockAssignment, formatAssignmentDue, getMockSubmissions, getMockSubmissionById } from '@/lib/educator/mock/assignment-data'

const STORAGE_KEY = 'notevoro_assignments'
const SUBMISSION_STORAGE_KEY = 'notevoro_submissions'

function loadAssignments() {
  if (typeof window === 'undefined') return getMockAssignments()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : getMockAssignments()
  } catch {
    return getMockAssignments()
  }
}

function saveAssignments(assignments) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments))
}

function loadSubmissions() {
  if (typeof window === 'undefined') return getMockSubmissions()
  try {
    const raw = window.localStorage.getItem(SUBMISSION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : getMockSubmissions()
  } catch {
    return getMockSubmissions()
  }
}

function saveSubmissions(submissions) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(submissions))
}

function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 11)}`
}

export async function getAssignments() {
  return loadAssignments()
}

export async function getAssignmentsByClassroom(classroomId) {
  return loadAssignments().filter((assignment) => assignment.classroomId === classroomId)
}

export async function getAssignmentById(id) {
  return loadAssignments().find((assignment) => assignment.id === id) || null
}

export async function createAssignment(data) {
  const assignments = loadAssignments()
  const assignment = {
    id: generateId('asgn'),
    status: data.status || 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignedStudentIds: data.assignedStudentIds || [],
    resources: data.resources || [],
    submissionType: data.submissionType || 'online_text',
    allowLateSubmission: Boolean(data.allowLateSubmission),
    createdBy: data.createdBy || data.educatorId,
    ...data,
  }
  assignments.unshift(assignment)
  saveAssignments(assignments)
  return assignment
}

export async function updateAssignment(id, updates) {
  const assignments = loadAssignments()
  const index = assignments.findIndex((assignment) => assignment.id === id)
  if (index === -1) return null
  assignments[index] = {
    ...assignments[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveAssignments(assignments)
  return assignments[index]
}

export async function deleteAssignment(id) {
  const assignments = loadAssignments()
  const result = assignments.filter((assignment) => assignment.id !== id)
  saveAssignments(result)
  return true
}

export async function publishAssignment(id) {
  return updateAssignment(id, { status: 'assigned' })
}

export async function closeAssignment(id) {
  return updateAssignment(id, { status: 'closed' })
}

export async function getStudentAssignments(studentId) {
  return loadAssignments().filter((assignment) => {
    return (
      assignment.assignedStudentIds.length === 0 ||
      assignment.assignedStudentIds.includes(studentId)
    )
  })
}

export async function getStudentAssignment(id, studentId) {
  const assignment = await getAssignmentById(id)
  if (!assignment) return null
  if (assignment.assignedStudentIds.length === 0) return assignment
  return assignment.assignedStudentIds.includes(studentId) ? assignment : null
}

export async function createSubmission(assignmentId, studentId, submission) {
  const submissions = loadSubmissions()
  const newSubmission = {
    id: generateId('sub'),
    assignmentId,
    studentId,
    content: submission.content || '',
    attachments: submission.attachments || [],
    status: submission.status || 'submitted',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    score: submission.score ?? null,
    feedback: submission.feedback || '',
    gradedAt: submission.gradedAt || null,
    gradedBy: submission.gradedBy || null,
  }
  submissions.unshift(newSubmission)
  saveSubmissions(submissions)
  return newSubmission
}

export async function saveSubmissionDraft(assignmentId, studentId, draft) {
  const submissions = loadSubmissions()
  const existingIndex = submissions.findIndex(
    (submission) => submission.assignmentId === assignmentId && submission.studentId === studentId
  )
  const payload = {
    id: existingIndex >= 0 ? submissions[existingIndex].id : generateId('sub'),
    assignmentId,
    studentId,
    content: draft.content || '',
    attachments: draft.attachments || [],
    status: 'in_progress',
    submittedAt: submissions[existingIndex]?.submittedAt || null,
    updatedAt: new Date().toISOString(),
    score: submissions[existingIndex]?.score ?? null,
    feedback: submissions[existingIndex]?.feedback || '',
    gradedAt: submissions[existingIndex]?.gradedAt || null,
    gradedBy: submissions[existingIndex]?.gradedBy || null,
  }

  if (existingIndex >= 0) {
    submissions[existingIndex] = payload
  } else {
    submissions.unshift(payload)
  }

  saveSubmissions(submissions)
  return payload
}

export async function submitAssignment(assignmentId, studentId, submission) {
  const submissions = loadSubmissions()
  const existingIndex = submissions.findIndex(
    (item) => item.assignmentId === assignmentId && item.studentId === studentId
  )
  const payload = {
    id: existingIndex >= 0 ? submissions[existingIndex].id : generateId('sub'),
    assignmentId,
    studentId,
    content: submission.content || '',
    attachments: submission.attachments || [],
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    score: submission.score ?? null,
    feedback: submission.feedback || '',
    gradedAt: submission.gradedAt || null,
    gradedBy: submission.gradedBy || null,
  }

  if (existingIndex >= 0) {
    submissions[existingIndex] = payload
  } else {
    submissions.unshift(payload)
  }

  saveSubmissions(submissions)
  return payload
}

export async function getSubmission(assignmentId, studentId) {
  return loadSubmissions().find(
    (submission) => submission.assignmentId === assignmentId && submission.studentId === studentId
  ) || null
}

export async function getSubmissionsForAssignment(assignmentId) {
  return loadSubmissions().filter((submission) => submission.assignmentId === assignmentId)
}

export async function getSubmissionById(id) {
  return loadSubmissions().find((submission) => submission.id === id) || getMockSubmissionById(id)
}

export async function getSubmissions() {
  return loadSubmissions()
}

export async function updateSubmission(id, updates) {
  const submissions = loadSubmissions()
  const index = submissions.findIndex((submission) => submission.id === id)
  if (index === -1) return null
  submissions[index] = {
    ...submissions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    gradedAt: updates.status === 'graded' || updates.score !== undefined ? new Date().toISOString() : submissions[index].gradedAt,
  }
  saveSubmissions(submissions)
  return submissions[index]
}

export async function getAssignmentDueLabel(assignment) {
  return formatAssignmentDue(assignment)
}

export default {
  getAssignments,
  getAssignmentsByClassroom,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  closeAssignment,
  getStudentAssignments,
  getStudentAssignment,
  createSubmission,
  saveSubmissionDraft,
  submitAssignment,
  getSubmission,
  getSubmissionsForAssignment,
  getSubmissionById,
  getSubmissions,
  getAssignmentDueLabel,
}
