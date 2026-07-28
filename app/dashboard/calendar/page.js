import { createClient } from '@/lib/supabase/server'
import { CalendarView } from '@/components/CalendarView'

export default async function CalendarPage() {
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
      { id: 'e1', title: 'Physics Midterm', event_type: 'exam', event_date: d(3), description: 'Chapters 1-5' },
      { id: 'e2', title: 'History Essay Due', event_type: 'assignment', event_date: d(7), description: '2000 words' },
      { id: 'e3', title: 'Study group meetup', event_type: 'reminder', event_date: d(1) },
    ]
  }
  return <CalendarView initialEvents={events} preview={preview} />
}
