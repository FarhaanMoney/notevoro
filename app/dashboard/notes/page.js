import { createClient } from '@/lib/supabase/server'
import { NotesWorkspace } from '@/components/NotesWorkspace'

export default async function NotesPage() {
  const supabase = await createClient()
  let notes = []
  let folders = []
  let preview = false

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const [{ data: n }, { data: f }] = await Promise.all([
        supabase.from('notes').select('id, title, folder_id, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('folders').select('id, name, color').eq('user_id', user.id).order('created_at', { ascending: true }),
      ])
      notes = n || []
      folders = f || []
    }
  } else {
    preview = true
    folders = [
      { id: 'demo-f1', name: 'Biology', color: 'green' },
      { id: 'demo-f2', name: 'History', color: 'orange' },
    ]
    notes = [
      { id: 'demo-n1', title: 'Photosynthesis — my notes', folder_id: 'demo-f1', updated_at: new Date(Date.now() - 3600e3).toISOString() },
      { id: 'demo-n2', title: 'Cellular Respiration', folder_id: 'demo-f1', updated_at: new Date(Date.now() - 86400e3).toISOString() },
      { id: 'demo-n3', title: 'French Revolution timeline', folder_id: 'demo-f2', updated_at: new Date(Date.now() - 2*86400e3).toISOString() },
      { id: 'demo-n4', title: 'Quick idea', folder_id: null, updated_at: new Date(Date.now() - 300e3).toISOString() },
    ]
  }

  return <NotesWorkspace initialNotes={notes} initialFolders={folders} preview={preview} />
}
