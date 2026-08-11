import { mockClassrooms } from '@/lib/educator/mock/classroom-data'
import { v4 as uuidv4 } from 'uuid'

const ASSIGNMENT_STATUSES = ['draft', 'assigned', 'closed']
const SUBMISSION_STATUSES = ['not_started', 'in_progress', 'submitted', 'late', 'graded', 'returned']

function getClassroomStudentIds(classroomId) {
  const classroom = mockClassrooms[classroomId]
  return classroom?.students?.map((student) => student.id) || []
}

const defaultAssignments = [
  {
    id: 'asgn-1',
    classroomId: 'math-8a',
    educatorId: 'ed-1',
    createdBy: 'ed-1',
    title: 'Algebraic Expressions',
    description: 'Practice simplifying and evaluating algebraic expressions with positive and negative values.',
    instructions: 'Show all your work for each question and simplify each expression completely. Use the answer key to check your work.',
    subject: 'Algebra',
    dueDate: '2026-08-12',
    dueTime: '16:00',
    points: 100,
    status: 'assigned',
    submissionType: 'online_text',
    allowLateSubmission: true,
    assignedStudentIds: getClassroomStudentIds('math-8a'),
    resources: [
      { id: 'res-2', name: 'Expression Practice Sheet', type: 'Worksheets' },
      { id: 'res-1', name: 'Algebra Unit Plan', type: 'Lesson Plans' },
    ],
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-02T09:15:00.000Z',
  },
  {
    id: 'asgn-2',
    classroomId: 'math-8a',
    educatorId: 'ed-1',
    createdBy: 'ed-1',
    title: 'Linear Equations',
    description: 'Solve one-variable linear equations and word problems using algebraic methods.',
    instructions: 'Write each equation, solve for the variable, and show your steps clearly. Review the examples before submitting.',
    subject: 'Algebra',
    dueDate: '2026-08-14',
    dueTime: '16:00',
    points: 100,
    status: 'assigned',
    submissionType: 'file_upload',
    allowLateSubmission: false,
    assignedStudentIds: getClassroomStudentIds('math-8a').slice(0, 20),
    resources: [
      { id: 'res-3', name: 'Linear Equations Quiz', type: 'Quizzes' },
    ],
    createdAt: '2026-08-03T10:25:00.000Z',
    updatedAt: '2026-08-05T13:40:00.000Z',
  },
  {
    id: 'asgn-3',
    classroomId: 'math-8a',
    educatorId: 'ed-1',
    createdBy: 'ed-1',
    title: 'Quadratic Foundations',
    description: 'Read chapter 5 and complete the warm-up problems on parabolas and vertex form.',
    instructions: 'Use the guided notes and answer the question set on page 78. Attach your handwritten work as a photo if needed.',
    subject: 'Algebra',
    dueDate: '2026-08-17',
    dueTime: '16:00',
    points: 50,
    status: 'assigned',
    submissionType: 'online_text',
    allowLateSubmission: true,
    assignedStudentIds: getClassroomStudentIds('math-8a'),
    resources: [
      { id: 'res-4', name: 'Graphing Quadratics', type: 'Presentations' },
    ],
    createdAt: '2026-08-04T09:10:00.000Z',
    updatedAt: '2026-08-05T14:20:00.000Z',
  },
  {
    id: 'asgn-4',
    classroomId: 'math-8a',
    educatorId: 'ed-1',
    createdBy: 'ed-1',
    title: 'Fractions Review',
    description: 'Review fractions, decimals, and percentages with mixed practice problems.',
    instructions: 'Complete the worksheet and check difficult problems with a partner before submitting.',
    subject: 'Arithmetic',
    dueDate: '2026-08-11',
    dueTime: '16:00',
    points: 75,
    status: 'draft',
    submissionType: 'online_text',
    allowLateSubmission: true,
    assignedStudentIds: getClassroomStudentIds('math-8a'),
    resources: [],
    createdAt: '2026-08-06T08:00:00.000Z',
    updatedAt: '2026-08-06T08:00:00.000Z',
  },
  {
    id: 'asgn-b1',
    classroomId: 'bio-10b',
    educatorId: 'ed-1',
    createdBy: 'ed-1',
    title: 'Cell Structure Lab Report',
    description: 'Document your microscope observations and explain the function of each organelle.',
    instructions: 'Submit your lab report as a PDF including labeled diagrams and analysis of findings.',
    subject: 'Cell Biology',
    dueDate: '2026-08-14',
    dueTime: '14:00',
    points: 100,
    status: 'assigned',
    submissionType: 'file_upload',
    allowLateSubmission: false,
    assignedStudentIds: getClassroomStudentIds('bio-10b'),
    resources: [
      { id: 'res-b1', name: 'Cell Biology Slides', type: 'Presentations' },
    ],
    createdAt: '2026-08-02T10:40:00.000Z',
    updatedAt: '2026-08-04T12:00:00.000Z',
  },
  {
    id: 'asgn-b2',
    classroomId: 'bio-10b',
    educatorId: 'ed-1',
    createdBy: 'ed-1',
    title: 'Genetics Quiz',
    description: 'Mendelian inheritance and Punnett squares quiz covering basic genetics concepts.',
    instructions: 'Complete the quiz independently and submit your answer sheet as a PDF.',
    subject: 'Genetics',
    dueDate: '2026-08-10',
    dueTime: '14:00',
    points: 50,
    status: 'assigned',
    submissionType: 'online_text',
    allowLateSubmission: false,
    assignedStudentIds: getClassroomStudentIds('bio-10b').slice(0, 24),
    resources: [],
    createdAt: '2026-08-03T11:15:00.000Z',
    updatedAt: '2026-08-03T11:15:00.000Z',
  },
]

const defaultSubmissions = [
  {
    id: 'sub-1',
    assignmentId: 'asgn-1',
    studentId: 'stu-ahmed',
    content: 'Completed worksheet solutions with detailed steps for each algebraic expression.',
    attachments: [],
    status: 'submitted',
    submittedAt: '2026-08-11T14:10:00.000Z',
    updatedAt: '2026-08-11T14:10:00.000Z',
    score: 95,
    feedback: 'Great work — clear and accurate.',
    gradedAt: '2026-08-12T09:20:00.000Z',
    gradedBy: 'ed-1',
  },
  {
    id: 'sub-2',
    assignmentId: 'asgn-1',
    studentId: 'stu-sara',
    content: 'Worked through expressions and simplified correctly except question 8.',
    attachments: [],
    status: 'graded',
    submittedAt: '2026-08-11T14:25:00.000Z',
    updatedAt: '2026-08-12T11:00:00.000Z',
    score: 88,
    feedback: 'Nice progress, review the negative sign handling on question 8.',
    gradedAt: '2026-08-12T11:00:00.000Z',
    gradedBy: 'ed-1',
  },
  {
    id: 'sub-3',
    assignmentId: 'asgn-1',
    studentId: 'stu-john',
    content: 'Started the assignment but only completed half of the questions.',
    attachments: [],
    status: 'in_progress',
    submittedAt: null,
    updatedAt: '2026-08-11T15:40:00.000Z',
    score: null,
    feedback: '',
    gradedAt: null,
    gradedBy: null,
  },
  {
    id: 'sub-4',
    assignmentId: 'asgn-2',
    studentId: 'stu-ahmed',
    content: 'Uploaded quiz answers PDF and confirmed all equations were solved as instructed.',
    attachments: [{ id: 'att-1', name: 'linear-quiz.pdf', type: 'application/pdf' }],
    status: 'submitted',
    submittedAt: '2026-08-14T13:10:00.000Z',
    updatedAt: '2026-08-14T13:10:00.000Z',
    score: null,
    feedback: '',
    gradedAt: null,
    gradedBy: null,
  },
  {
    id: 'sub-5',
    assignmentId: 'asgn-b2',
    studentId: 'stu-priya',
    content: 'Answered genetics questions and explained Punnett square results.',
    attachments: [],
    status: 'late',
    submittedAt: '2026-08-10T15:10:00.000Z',
    updatedAt: '2026-08-10T15:10:00.000Z',
    score: null,
    feedback: '',
    gradedAt: null,
    gradedBy: null,
  },
]

export const SUBMISSION_TYPES = ['online_text', 'file_upload', 'multiple_choice', 'project']

export function getMockAssignments() {
  return structuredClone(defaultAssignments)
}

export function getMockAssignment(id) {
  return structuredClone(defaultAssignments.find((assignment) => assignment.id === id) || null)
}

export function getMockSubmissions() {
  return structuredClone(defaultSubmissions)
}

export function getMockSubmissionById(id) {
  return structuredClone(defaultSubmissions.find((submission) => submission.id === id) || null)
}

export function getMockStudentIdByEmail(email) {
  const lowercase = String(email).toLowerCase()
  const mapping = {
    'ahmed.khan@school.edu': 'stu-ahmed',
    'sara.patel@school.edu': 'stu-sara',
    'john.smith@school.edu': 'stu-john',
    'emma.wilson@school.edu': 'stu-emma',
    'michael.brown@school.edu': 'stu-michael',
    'priya.sharma@school.edu': 'stu-priya',
    'marcus.lee@school.edu': 'stu-marcus',
    'lisa.chen@school.edu': 'stu-lisa',
  }
  return mapping[lowercase] || 'stu-ahmed'
}

export function formatAssignmentDue(assignment) {
  if (!assignment) return 'TBD'
  const time = assignment.dueTime ? ` ${assignment.dueTime}` : ''
  return `${assignment.dueDate}${time}`
}

export function isStudentAssigned(assignment, studentId) {
  if (!assignment) return false
  if (!assignment.assignedStudentIds || assignment.assignedStudentIds.length === 0) return true
  return assignment.assignedStudentIds.includes(studentId)
}

export { ASSIGNMENT_STATUSES, SUBMISSION_STATUSES }
