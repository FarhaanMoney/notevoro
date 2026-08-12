import {
  mockProfessionalProjects,
  mockProfessionalTasks,
  mockProfessionalDocuments,
  mockProfessionalResearch,
  mockProfessionalAIActivity,
  mockProfessionalFocusTime,
  mockProfessionalTeamMembers,
  mockProfessionalIntegrations,
} from './mock/professional-data'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function formatRelativeDate(dateString) {
  const now = new Date()
  const due = new Date(dateString)
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000)

  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}

export async function getDashboardOverview() {
  const projects = clone(mockProfessionalProjects)
  const tasks = clone(mockProfessionalTasks)

  const activeProjects = projects.filter((project) => project.progress < 100).length
  const tasksInProgress = tasks.filter((task) => ['in_progress', 'in_review'].includes(task.status)).length
  const tasksCompleted = tasks.filter((task) => task.status === 'completed').length
  const highPriority = tasks.filter((task) => task.priority === 'high' && task.status !== 'completed').length
  const focusTime = mockProfessionalFocusTime.reduce((sum, item) => sum + item.hours, 0)

  return {
    activeProjects,
    dueThisWeek: tasks.filter((task) => {
      const due = new Date(task.dueDate)
      const now = new Date()
      const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000)
      return diff >= 0 && diff <= 7 && task.status !== 'completed'
    }).length,
    tasksInProgress,
    highPriority,
    tasksCompleted,
    completedChange: 18,
    focusTime: `${Math.round(focusTime)}h ${Math.round((focusTime % 1) * 60)}m`,
    focusChange: 12,
  }
}

export async function getRecentProjects() {
  return clone(mockProfessionalProjects)
}

export async function getUpcomingDeadlines() {
  return clone(mockProfessionalTasks)
    .filter((task) => task.status !== 'completed')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 6)
    .map((task) => ({
      ...task,
      relativeDeadline: formatRelativeDate(task.dueDate),
    }))
}

export async function getTaskOverview() {
  const tasks = clone(mockProfessionalTasks)
  const total = tasks.length
  const summary = {
    todo: tasks.filter((task) => task.status === 'todo').length,
    in_progress: tasks.filter((task) => task.status === 'in_progress').length,
    in_review: tasks.filter((task) => task.status === 'in_review').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
  }

  return {
    total,
    ...summary,
  }
}

export async function getFocusTime() {
  return clone(mockProfessionalFocusTime)
}

export async function getAIActivity() {
  return clone(mockProfessionalAIActivity)
}

export async function getProjects() {
  return clone(mockProfessionalProjects)
}

export async function getProjectById(id) {
  return clone(mockProfessionalProjects.find((project) => project.id === id) || null)
}

export async function getTasks() {
  return clone(mockProfessionalTasks)
}

export async function getDocuments() {
  return clone(mockProfessionalDocuments)
}

export async function getResearchItems() {
  return clone(mockProfessionalResearch)
}

export async function getTeamMembers() {
  return clone(mockProfessionalTeamMembers)
}

export async function getIntegrations() {
  return clone(mockProfessionalIntegrations)
}

export async function searchProjects(query) {
  if (!query) return clone(mockProfessionalProjects)
  const normalized = query.toLowerCase()
  return clone(mockProfessionalProjects).filter((project) =>
    project.name.toLowerCase().includes(normalized) || project.category.toLowerCase().includes(normalized)
  )
}

export async function createProject(project) {
  return {
    id: `proj-${Date.now()}`,
    progress: 0,
    updatedAt: new Date().toISOString(),
    ...project,
  }
}

export async function createTask(task) {
  return {
    id: `task-${Date.now()}`,
    status: 'todo',
    ...task,
  }
}

export async function createDocument(document) {
  return {
    id: `doc-${Date.now()}`,
    updatedAt: new Date().toISOString(),
    status: 'draft',
    ...document,
  }
}
