import { getMockResources, getMockCollections } from '@/lib/educator/mock/resource-data'

const STORAGE_KEY = 'notevoro_resources'
const COLLECTION_KEY = 'notevoro_resource_collections'

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function loadResources() {
  if (typeof window === 'undefined') return getMockResources()
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? safeParse(raw, getMockResources()) : getMockResources()
}

function saveResources(resources) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(resources))
}

function loadCollections() {
  if (typeof window === 'undefined') return getMockCollections()
  const raw = window.localStorage.getItem(COLLECTION_KEY)
  return raw ? safeParse(raw, getMockCollections()) : getMockCollections()
}

function saveCollections(collections) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(COLLECTION_KEY, JSON.stringify(collections))
}

function generateId(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

async function getResources() {
  return loadResources()
}

async function getResource(id) {
  return loadResources().find((resource) => resource.id === id) || null
}

async function createResource(data) {
  const resources = loadResources()
  const resource = {
    id: generateId('res'),
    title: data.title || 'Untitled Resource',
    description: data.description || '',
    type: data.type || 'lesson',
    subject: data.subject || 'Science',
    grade: data.grade || '10',
    tags: data.tags || [],
    classroomIds: data.classroomIds || [],
    assignmentIds: data.assignmentIds || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: data.status || 'active',
    owner: 'You',
    shared: data.shared || { withClassrooms: [], withEducators: [], withStudents: false },
    favorite: Boolean(data.favorite),
    collectionIds: data.collectionIds || [],
  }
  resources.unshift(resource)
  saveResources(resources)
  return resource
}

async function updateResource(id, updates) {
  const resources = loadResources()
  const index = resources.findIndex((resource) => resource.id === id)
  if (index === -1) return null
  resources[index] = {
    ...resources[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  saveResources(resources)
  return resources[index]
}

async function deleteResource(id) {
  const resources = loadResources()
  const updated = resources.filter((resource) => resource.id !== id)
  saveResources(updated)
  return true
}

async function duplicateResource(id) {
  const resources = loadResources()
  const source = resources.find((resource) => resource.id === id)
  if (!source) return null
  const copy = {
    ...structuredClone(source),
    id: generateId('res'),
    title: `Copy of ${source.title}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    favorite: false,
    shared: { withClassrooms: [], withEducators: [], withStudents: false },
  }
  resources.unshift(copy)
  saveResources(resources)
  return copy
}

async function archiveResource(id) {
  return updateResource(id, { status: 'archived' })
}

async function restoreResource(id) {
  return updateResource(id, { status: 'active' })
}

async function toggleFavorite(id) {
  const resources = loadResources()
  const index = resources.findIndex((resource) => resource.id === id)
  if (index === -1) return null
  resources[index].favorite = !resources[index].favorite
  resources[index].updatedAt = new Date().toISOString()
  saveResources(resources)
  return resources[index]
}

async function addToClassroom(id, classroomId) {
  const resources = loadResources()
  const index = resources.findIndex((resource) => resource.id === id)
  if (index === -1) return null
  const existing = new Set(resources[index].classroomIds)
  existing.add(classroomId)
  resources[index].classroomIds = Array.from(existing)
  resources[index].updatedAt = new Date().toISOString()
  saveResources(resources)
  return resources[index]
}

async function addToAssignment(id, assignmentId) {
  const resources = loadResources()
  const index = resources.findIndex((resource) => resource.id === id)
  if (index === -1) return null
  const existing = new Set(resources[index].assignmentIds)
  existing.add(assignmentId)
  resources[index].assignmentIds = Array.from(existing)
  resources[index].updatedAt = new Date().toISOString()
  saveResources(resources)
  return resources[index]
}

async function shareResource(id, sharePayload) {
  const resources = loadResources()
  const index = resources.findIndex((resource) => resource.id === id)
  if (index === -1) return null
  resources[index].shared = {
    ...resources[index].shared,
    ...sharePayload,
  }
  resources[index].updatedAt = new Date().toISOString()
  saveResources(resources)
  return resources[index]
}

async function getCollections() {
  return loadCollections()
}

async function createCollection(data) {
  const collections = loadCollections()
  const collection = {
    id: generateId('col'),
    name: data.name || 'Untitled Collection',
    description: data.description || '',
  }
  collections.unshift(collection)
  saveCollections(collections)
  return collection
}

async function updateCollection(id, updates) {
  const collections = loadCollections()
  const index = collections.findIndex((collection) => collection.id === id)
  if (index === -1) return null
  collections[index] = { ...collections[index], ...updates }
  saveCollections(collections)
  return collections[index]
}

async function deleteCollection(id) {
  const collections = loadCollections()
  const updated = collections.filter((collection) => collection.id !== id)
  saveCollections(updated)
  return true
}

export {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  duplicateResource,
  archiveResource,
  restoreResource,
  toggleFavorite,
  addToClassroom,
  addToAssignment,
  shareResource,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
}

export default {
  getResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  duplicateResource,
  archiveResource,
  restoreResource,
  toggleFavorite,
  addToClassroom,
  addToAssignment,
  shareResource,
  getCollections,
  createCollection,
  updateCollection,
  deleteCollection,
}
