// Client-facing repository that talks to server API endpoints.
// This keeps UI components decoupled from Supabase and allows swapping implementations.

export async function getEducatorClassrooms() {
  const res = await fetch('/api/educator/classrooms')
  if (!res.ok) throw new Error('Failed to load classrooms')
  return res.json()
}

export async function getClassroomById(id) {
  const res = await fetch(`/api/educator/classrooms/${id}`)
  if (!res.ok) throw new Error('Failed to load classroom')
  return res.json()
}

export async function createClassroom(payload) {
  const res = await fetch('/api/educator/classrooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to create classroom')
  return res.json()
}

export async function updateClassroom(id, payload) {
  const res = await fetch(`/api/educator/classrooms/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Failed to update classroom')
  return res.json()
}

export async function deleteClassroom(id) {
  const res = await fetch(`/api/educator/classrooms/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete classroom')
  return res.json()
}

export async function joinClassroomByCode(code) {
  const res = await fetch('/api/classrooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  if (!res.ok) throw new Error('Failed to join classroom')
  return res.json()
}

export async function getClassroomStudents(id) {
  const res = await fetch(`/api/educator/classrooms/${id}/students`)
  if (!res.ok) throw new Error('Failed to load students')
  return res.json()
}

export default {
  getEducatorClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  joinClassroomByCode,
  getClassroomStudents,
}
