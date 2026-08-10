/**
 * Centralized mock classroom data for the Educator Workspace.
 * Replace MockClassroomRepository with SupabaseClassroomRepository in Phase 5.
 */

export const ASSIGNMENT_TYPES = ['Worksheet', 'Quiz', 'Test', 'Project', 'Reading', 'Custom']

export const RESOURCE_CATEGORIES = [
  'Lesson Plans',
  'Worksheets',
  'Quizzes',
  'Presentations',
  'Research',
  'Notes',
]

export const mockClassrooms = {
  'math-8a': {
    id: 'math-8a',
    name: 'Mathematics 8A',
    subject: 'Mathematics',
    grade: '8',
    description: 'Algebra foundations and problem-solving for Grade 8 students.',
    code: 'MATH8A-7K4P',
    studentCount: 24,
    classAverage: 82,
    activeAssignments: 8,
    completionRate: 76,
    nextDeadline: 'Aug 12, 4:00 PM',
    progressData: [
      { day: 'Mon', score: 76 },
      { day: 'Tue', score: 79 },
      { day: 'Wed', score: 81 },
      { day: 'Thu', score: 80 },
      { day: 'Fri', score: 82 },
    ],
    settings: {
      viewResources: true,
      submitLateWork: true,
      commentOnAssignments: false,
      viewAnnouncements: true,
    },
    announcements: [
      {
        id: 'ann-1',
        title: 'Class Announcement',
        message: 'Remember that your Algebra assignment is due Friday.',
        postedAt: '2026-08-08T10:00:00Z',
        author: 'You',
      },
    ],
    activities: [
      { id: 'act-1', icon: '📝', text: 'Sarah submitted "Algebraic Expressions"', time: '2 hours ago' },
      { id: 'act-2', icon: '🎯', text: 'Daniel completed "Linear Equations"', time: '3 hours ago' },
      { id: 'act-3', icon: '👤', text: 'Alex joined the classroom', time: '5 hours ago' },
      { id: 'act-4', icon: '📊', text: 'Class average increased to 82%', time: '1 day ago' },
      { id: 'act-5', icon: '⏰', text: 'Assignment "Fractions Review" is due tomorrow', time: '1 day ago' },
    ],
    needsAttention: [
      {
        id: 'stu-alex',
        name: 'Alex Johnson',
        reason: 'Last active 5 days ago',
        detail: '3 assignments missing',
        type: 'inactive',
      },
      {
        id: 'stu-sarah',
        name: 'Sarah Williams',
        reason: 'Average score: 54%',
        detail: '2 assignments missing',
        type: 'low-score',
      },
      {
        id: 'stu-daniel',
        name: 'Daniel Smith',
        reason: 'Hasn\'t submitted recent assignment',
        detail: 'Linear Equations overdue',
        type: 'missing',
      },
    ],
    students: [
      {
        id: 'stu-ahmed',
        name: 'Ahmed Khan',
        email: 'ahmed.khan@school.edu',
        average: 91,
        completed: 7,
        missing: 0,
        lastActive: '2 hours ago',
        progress: 95,
        status: 'high-performer',
        recentActivity: ['Submitted Algebraic Expressions', 'Scored 94% on Quiz'],
        performanceTrend: [78, 82, 85, 88, 91],
        notes: '',
      },
      {
        id: 'stu-sara',
        name: 'Sara Patel',
        email: 'sara.patel@school.edu',
        average: 88,
        completed: 6,
        missing: 1,
        lastActive: '4 hours ago',
        progress: 88,
        status: 'on-track',
        recentActivity: ['Completed Linear Equations', 'Viewed lesson plan'],
        performanceTrend: [80, 82, 85, 86, 88],
        notes: '',
      },
      {
        id: 'stu-john',
        name: 'John Smith',
        email: 'john.smith@school.edu',
        average: 78,
        completed: 5,
        missing: 2,
        lastActive: '1 day ago',
        progress: 72,
        status: 'on-track',
        recentActivity: ['Joined classroom', 'Started Quadratic Foundations'],
        performanceTrend: [70, 72, 75, 76, 78],
        notes: '',
      },
      {
        id: 'stu-emma',
        name: 'Emma Wilson',
        email: 'emma.wilson@school.edu',
        average: 85,
        completed: 7,
        missing: 0,
        lastActive: '6 hours ago',
        progress: 90,
        status: 'high-performer',
        recentActivity: ['Submitted all assignments on time'],
        performanceTrend: [82, 83, 84, 85, 85],
        notes: 'Strong participation in class discussions.',
      },
      {
        id: 'stu-michael',
        name: 'Michael Brown',
        email: 'michael.brown@school.edu',
        average: 93,
        completed: 8,
        missing: 0,
        lastActive: '1 hour ago',
        progress: 98,
        status: 'high-performer',
        recentActivity: ['Perfect score on Algebra Quiz'],
        performanceTrend: [88, 90, 91, 92, 93],
        notes: '',
      },
      {
        id: 'stu-alex',
        name: 'Alex Johnson',
        email: 'alex.johnson@school.edu',
        average: 62,
        completed: 3,
        missing: 3,
        lastActive: '5 days ago',
        progress: 45,
        status: 'needs-attention',
        recentActivity: ['Missed last 2 assignments'],
        performanceTrend: [70, 68, 65, 63, 62],
        notes: 'Schedule check-in meeting.',
      },
      {
        id: 'stu-sarah',
        name: 'Sarah Williams',
        email: 'sarah.williams@school.edu',
        average: 54,
        completed: 4,
        missing: 2,
        lastActive: '2 days ago',
        progress: 50,
        status: 'needs-attention',
        recentActivity: ['Submitted late work'],
        performanceTrend: [60, 58, 56, 55, 54],
        notes: '',
      },
      {
        id: 'stu-daniel',
        name: 'Daniel Smith',
        email: 'daniel.smith@school.edu',
        average: 71,
        completed: 5,
        missing: 1,
        lastActive: '3 days ago',
        progress: 65,
        status: 'missing-work',
        recentActivity: ['Has not submitted Linear Equations'],
        performanceTrend: [75, 74, 73, 72, 71],
        notes: '',
      },
    ],
    assignments: [
      {
        id: 'asgn-1',
        title: 'Algebraic Expressions',
        description: 'Practice simplifying and evaluating algebraic expressions.',
        subject: 'Algebra',
        instructions: 'Complete all problems showing your work.',
        dueDate: '2026-08-12',
        dueTime: '16:00',
        points: 100,
        type: 'Worksheet',
        status: 'active',
        submitted: 18,
        late: 2,
        missing: 4,
        total: 24,
        completion: 75,
      },
      {
        id: 'asgn-2',
        title: 'Linear Equations',
        description: 'Solve one-variable linear equations and word problems.',
        subject: 'Algebra',
        instructions: 'Show all steps for full credit.',
        dueDate: '2026-08-14',
        dueTime: '16:00',
        points: 100,
        type: 'Quiz',
        status: 'active',
        submitted: 11,
        late: 1,
        missing: 12,
        total: 24,
        completion: 46,
      },
      {
        id: 'asgn-3',
        title: 'Quadratic Foundations',
        description: 'Introduction to quadratic expressions and graphs.',
        subject: 'Algebra',
        instructions: 'Read chapter 5 and complete exercises 1-15.',
        dueDate: '2026-08-17',
        dueTime: '16:00',
        points: 50,
        type: 'Reading',
        status: 'active',
        submitted: 3,
        late: 0,
        missing: 21,
        total: 24,
        completion: 13,
      },
      {
        id: 'asgn-4',
        title: 'Fractions Review',
        description: 'Review fractions, decimals, and percentages.',
        subject: 'Arithmetic',
        instructions: 'Complete the review packet.',
        dueDate: '2026-08-11',
        dueTime: '16:00',
        points: 75,
        type: 'Worksheet',
        status: 'due-soon',
        submitted: 20,
        late: 0,
        missing: 4,
        total: 24,
        completion: 83,
      },
    ],
    resources: [
      {
        id: 'res-1',
        name: 'Algebra Unit Plan',
        type: 'Lesson Plans',
        date: '2026-08-01',
        description: '8-week algebra unit with daily objectives.',
      },
      {
        id: 'res-2',
        name: 'Expression Practice Sheet',
        type: 'Worksheets',
        date: '2026-08-05',
        description: '20 practice problems on algebraic expressions.',
      },
      {
        id: 'res-3',
        name: 'Linear Equations Quiz',
        type: 'Quizzes',
        date: '2026-08-07',
        description: '15-question quiz covering linear equations.',
      },
      {
        id: 'res-4',
        name: 'Graphing Quadratics',
        type: 'Presentations',
        date: '2026-08-06',
        description: 'Slide deck introducing parabolas and vertex form.',
      },
    ],
    analytics: {
      performanceDistribution: [
        { range: '90–100%', count: 5 },
        { range: '80–89%', count: 8 },
        { range: '70–79%', count: 6 },
        { range: '60–69%', count: 3 },
        { range: 'Below 60%', count: 2 },
      ],
      activeStudents: 21,
      missingWorkCount: 7,
    },
  },
  'bio-10b': {
    id: 'bio-10b',
    name: 'Biology 10B',
    subject: 'Biology',
    grade: '10',
    description: 'Cell biology, genetics, and ecology for Grade 10.',
    code: 'BIO10B-3X9Q',
    studentCount: 28,
    classAverage: 78,
    activeAssignments: 6,
    completionRate: 65,
    nextDeadline: 'Aug 14, 2:00 PM',
    progressData: [
      { day: 'Mon', score: 72 },
      { day: 'Tue', score: 74 },
      { day: 'Wed', score: 76 },
      { day: 'Thu', score: 77 },
      { day: 'Fri', score: 78 },
    ],
    settings: {
      viewResources: true,
      submitLateWork: false,
      commentOnAssignments: true,
      viewAnnouncements: true,
    },
    announcements: [],
    activities: [
      { id: 'act-b1', icon: '📝', text: 'Priya submitted "Cell Structure Lab"', time: '1 hour ago' },
      { id: 'act-b2', icon: '🎯', text: 'Marcus completed "Genetics Quiz"', time: '4 hours ago' },
    ],
    needsAttention: [
      {
        id: 'stu-lisa',
        name: 'Lisa Chen',
        reason: 'Average score: 58%',
        detail: '1 assignment missing',
        type: 'low-score',
      },
    ],
    students: [
      {
        id: 'stu-priya',
        name: 'Priya Sharma',
        email: 'priya.sharma@school.edu',
        average: 89,
        completed: 5,
        missing: 0,
        lastActive: '1 hour ago',
        progress: 92,
        status: 'high-performer',
        recentActivity: ['Submitted Cell Structure Lab'],
        performanceTrend: [82, 84, 86, 88, 89],
        notes: '',
      },
      {
        id: 'stu-marcus',
        name: 'Marcus Lee',
        email: 'marcus.lee@school.edu',
        average: 84,
        completed: 5,
        missing: 1,
        lastActive: '3 hours ago',
        progress: 85,
        status: 'on-track',
        recentActivity: ['Completed Genetics Quiz'],
        performanceTrend: [78, 80, 82, 83, 84],
        notes: '',
      },
      {
        id: 'stu-lisa',
        name: 'Lisa Chen',
        email: 'lisa.chen@school.edu',
        average: 58,
        completed: 3,
        missing: 1,
        lastActive: '4 days ago',
        progress: 48,
        status: 'needs-attention',
        recentActivity: ['Missed ecology assignment'],
        performanceTrend: [65, 62, 60, 59, 58],
        notes: 'Offer tutoring session.',
      },
    ],
    assignments: [
      {
        id: 'asgn-b1',
        title: 'Cell Structure Lab Report',
        description: 'Document observations from the microscope lab.',
        subject: 'Cell Biology',
        instructions: 'Include labeled diagrams and analysis.',
        dueDate: '2026-08-14',
        dueTime: '14:00',
        points: 100,
        type: 'Project',
        status: 'active',
        submitted: 18,
        late: 3,
        missing: 7,
        total: 28,
        completion: 64,
      },
      {
        id: 'asgn-b2',
        title: 'Genetics Quiz',
        description: 'Mendelian inheritance and Punnett squares.',
        subject: 'Genetics',
        instructions: 'Complete within 30 minutes.',
        dueDate: '2026-08-10',
        dueTime: '14:00',
        points: 50,
        type: 'Quiz',
        status: 'active',
        submitted: 22,
        late: 2,
        missing: 4,
        total: 28,
        completion: 79,
      },
    ],
    resources: [
      {
        id: 'res-b1',
        name: 'Cell Biology Slides',
        type: 'Presentations',
        date: '2026-08-02',
        description: 'Introductory presentation on cell organelles.',
      },
    ],
    analytics: {
      performanceDistribution: [
        { range: '90–100%', count: 4 },
        { range: '80–89%', count: 10 },
        { range: '70–79%', count: 8 },
        { range: '60–69%', count: 4 },
        { range: 'Below 60%', count: 2 },
      ],
      activeStudents: 24,
      missingWorkCount: 12,
    },
  },
}

export const mockClassroomList = Object.values(mockClassrooms).map((c) => ({
  id: c.id,
  name: c.name,
  subject: c.subject,
  grade: c.grade,
  student_count: c.studentCount,
  completion: c.completionRate,
  next_deadline: c.nextDeadline,
  code: c.code,
}))

export function getMockClassroom(id) {
  return mockClassrooms[id] ? structuredClone(mockClassrooms[id]) : null
}

export function generateClassroomCode(subject, grade) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 4; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  return `${subject.substring(0, 4).toUpperCase()}${grade}-${suffix}`
}

export function formatDueDate(dateStr, timeStr) {
  const date = new Date(`${dateStr}T${timeStr || '12:00'}`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    (timeStr ? `, ${formatTime(timeStr)}` : '')
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function buildSubmissionRows(assignment, students) {
  const statuses = ['submitted', 'submitted', 'submitted', 'late', 'missing', 'submitted']
  return students.map((student, i) => {
    let status = statuses[i % statuses.length]
    if (i < assignment.submitted) status = 'submitted'
    else if (i < assignment.submitted + assignment.late) status = 'late'
    else status = 'missing'
    return {
      studentId: student.id,
      studentName: student.name,
      status,
      score: status === 'missing' ? null : Math.floor(Math.random() * 30) + 70,
    }
  })
}
