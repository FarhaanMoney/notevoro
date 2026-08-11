import { mockClassrooms, mockClassroomList } from '@/lib/educator/mock/classroom-data'

export const RESOURCE_TYPES = [
  { id: 'lesson', label: 'Lesson Plan' },
  { id: 'worksheet', label: 'Worksheet' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'presentation', label: 'Presentation' },
  { id: 'research', label: 'Research' },
  { id: 'notes', label: 'Notes' },
]

export const RESOURCE_SUBJECTS = [
  'Biology',
  'Mathematics',
  'History',
  'Science',
  'English',
  'Physics',
  'Chemistry',
]

export const RESOURCE_GRADES = ['6', '7', '8', '9', '10', '11', '12']

export const RESOURCE_STATUSES = ['active', 'draft', 'archived']

export const RESOURCE_TAGS = [
  'photosynthesis',
  'cell-division',
  'algebra',
  'climate',
  'world-war-ii',
  'metric-system',
  'classroom-rules',
  'exam-prep',
  'vocabulary',
  'research-skill',
]

const now = new Date()
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

export const mockResources = [
  {
    id: 'res-photosynthesis',
    title: 'Photosynthesis Lesson Plan',
    description: 'A strong lesson sequence for Grade 10 biology that covers energy flow, chloroplast structure, and lab practice.',
    type: 'lesson',
    subject: 'Biology',
    grade: '10',
    tags: ['photosynthesis', 'biology', 'ecosystems'],
    classroomIds: ['bio-10b'],
    assignmentIds: ['asgn-bio-1'],
    createdAt: daysAgo(8),
    updatedAt: daysAgo(2),
    status: 'active',
    owner: 'You',
    shared: { withClassrooms: ['bio-10b'], withEducators: [], withStudents: true },
    favorite: true,
    collectionIds: ['favorites', 'bio-resources'],
  },
  {
    id: 'res-algebra-worksheet',
    title: 'Algebra Worksheet Set',
    description: 'A set of scaffolded exercises for linear equations, inequalities, and word problems with teacher notes.',
    type: 'worksheet',
    subject: 'Mathematics',
    grade: '8',
    tags: ['algebra', 'linear-equations', 'worksheet'],
    classroomIds: ['math-8a'],
    assignmentIds: ['asgn-math-1', 'asgn-math-2'],
    createdAt: daysAgo(12),
    updatedAt: daysAgo(6),
    status: 'active',
    owner: 'You',
    shared: { withClassrooms: ['math-8a'], withEducators: ['teach-jones'], withStudents: false },
    favorite: false,
    collectionIds: ['math-resources'],
  },
  {
    id: 'res-cell-division-quiz',
    title: 'Cell Division Quiz',
    description: 'A short formative quiz to assess student understanding of mitosis and meiosis processes.',
    type: 'quiz',
    subject: 'Biology',
    grade: '10',
    tags: ['cell-division', 'quiz', 'assessment'],
    classroomIds: ['bio-10b'],
    assignmentIds: ['asgn-bio-2'],
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
    status: 'draft',
    owner: 'You',
    shared: { withClassrooms: [], withEducators: [], withStudents: false },
    favorite: false,
    collectionIds: [],
  },
  {
    id: 'res-climate-presentation',
    title: 'Climate Change Presentation',
    description: 'A visually rich presentation for Science class that examines causes, impacts, and student action projects.',
    type: 'presentation',
    subject: 'Science',
    grade: '9',
    tags: ['climate', 'presentation', 'environment'],
    classroomIds: ['sci-9a'],
    assignmentIds: [],
    createdAt: daysAgo(20),
    updatedAt: daysAgo(9),
    status: 'active',
    owner: 'You',
    shared: { withClassrooms: ['sci-9a'], withEducators: ['teach-lee'], withStudents: true },
    favorite: true,
    collectionIds: ['favorites', 'exam-prep'],
  },
  {
    id: 'res-wwii-research',
    title: 'World War II Research Guide',
    description: 'A teacher-led research guide with source recommendations, analysis prompts, and citation support.',
    type: 'research',
    subject: 'History',
    grade: '10',
    tags: ['world-war-ii', 'research', 'history'],
    classroomIds: ['hist-10b'],
    assignmentIds: ['asgn-hist-1'],
    createdAt: daysAgo(18),
    updatedAt: daysAgo(5),
    status: 'active',
    owner: 'You',
    shared: { withClassrooms: ['hist-10b'], withEducators: [], withStudents: true },
    favorite: false,
    collectionIds: ['history-resources'],
  },
  {
    id: 'res-classroom-rules',
    title: 'Classroom Rules & Expectations',
    description: 'A flexible notes resource for establishing norms, routines, and classroom agreement language.',
    type: 'notes',
    subject: 'English',
    grade: '9',
    tags: ['classroom-rules', 'culture', 'classroom-management'],
    classroomIds: [],
    assignmentIds: [],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(14),
    status: 'archived',
    owner: 'You',
    shared: { withClassrooms: [], withEducators: [], withStudents: false },
    favorite: false,
    collectionIds: ['favorites'],
  },
  {
    id: 'res-metric-cheatsheet',
    title: 'Metric System Cheat Sheet',
    description: 'A quick reference card for conversions, prefixes, and classroom math support.',
    type: 'notes',
    subject: 'Mathematics',
    grade: '7',
    tags: ['metric-system', 'cheat-sheet', 'math'],
    classroomIds: ['math-8a'],
    assignmentIds: [],
    createdAt: daysAgo(22),
    updatedAt: daysAgo(7),
    status: 'active',
    owner: 'You',
    shared: { withClassrooms: ['math-8a'], withEducators: [], withStudents: true },
    favorite: false,
    collectionIds: ['math-resources'],
  },
]

export const mockCollections = [
  {
    id: 'favorites',
    name: '⭐ Favorites',
    description: 'Quick access to your most-used lesson materials.',
  },
  {
    id: 'exam-prep',
    name: '📝 Exam Preparation',
    description: 'Resources designed for review weeks and assessment cycles.',
  },
  {
    id: 'bio-resources',
    name: '🧪 Biology Resources',
    description: 'Lesson plans, quizzes, and learning guides for biology units.',
  },
  {
    id: 'math-resources',
    name: '📐 Mathematics Resources',
    description: 'Worksheets and notes for math learning pathways.',
  },
  {
    id: 'history-resources',
    name: '📚 History Resources',
    description: 'Research guides and historical lesson materials.',
  },
]

export function getMockResources() {
  return structuredClone(mockResources)
}

export function getMockCollections() {
  return structuredClone(mockCollections)
}

export function getMockResource(id) {
  return structuredClone(mockResources.find((resource) => resource.id === id) || null)
}

export function getMockCollection(id) {
  return structuredClone(mockCollections.find((collection) => collection.id === id) || null)
}

export function getClassroomName(id) {
  return mockClassrooms[id]?.name || mockClassroomList.find((room) => room.id === id)?.name || 'Unknown Classroom'
}
