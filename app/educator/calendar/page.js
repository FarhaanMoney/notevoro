import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/CalendarView'

export default async function EducatorCalendarPage() {
  const supabase = await createClient()
  let events = []
  let preview = false
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('calendar_events').select('*').eq('user_id', user.id).order('event_date', { ascending: true })
      events = data || []
    }
  } else {
    preview = true
    const today = new Date()
    const d = (offset) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset).toISOString().slice(0, 10)
    events = [
      { id: 'e1', title: 'Math Lesson - Algebra', event_type: 'lesson', event_date: d(1), description: 'Chapter 5' },
      { id: 'e2', title: 'Assignment Due - Biology', event_type: 'assignment', event_date: d(3), description: 'Cell division project' },
      { id: 'e3', title: 'Parent-teacher meeting', event_type: 'reminder', event_date: d(5) },
    ]
  }
  return <CalendarView initialEvents={events} preview={preview} />
}
