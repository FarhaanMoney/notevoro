import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { Folder, FileText, MessagesSquare, BookOpen, GraduationCap, Search, Presentation as PresIcon } from 'lucide-react'

const ITEM_ICON = { note: FileText, chat: MessagesSquare, pack: BookOpen, atlas: GraduationCap, research: Search, presentation: PresIcon }

export default async function FoldersPage() {
  const supabase = await createClient()
  let folders = []
  let counts = {}
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const [{ data: fs }, { data: notes }, { data: chats }, { data: packs }, { data: atlas }, { data: research }, { data: pres }] = await Promise.all([
        supabase.from('folders').select('*').eq('user_id', user.id),
        supabase.from('notes').select('id').eq('user_id', user.id),
        supabase.from('chats').select('id').eq('user_id', user.id),
        supabase.from('study_packs').select('id').eq('user_id', user.id),
        supabase.from('atlas_sessions').select('id').eq('user_id', user.id),
        supabase.from('research_reports').select('id').eq('user_id', user.id),
        supabase.from('presentations').select('id').eq('user_id', user.id),
      ])
      folders = fs || []
      counts = { note: notes?.length || 0, chat: chats?.length || 0, pack: packs?.length || 0, atlas: atlas?.length || 0, research: research?.length || 0, presentation: pres?.length || 0 }
    }
  } else {
    folders = [{ id: 'demo-f1', name: 'Biology', color: 'green' }, { id: 'demo-f2', name: 'History', color: 'orange' }]
    counts = { note: 4, chat: 2, pack: 3, atlas: 2, research: 2, presentation: 2 }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Folders</h1>
        <p className="text-muted-foreground mt-1">All your learning content, organized.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {[
          { key: 'note', label: 'Notes', href: '/dashboard/notes' },
          { key: 'chat', label: 'AI Chats', href: '/dashboard/chat' },
          { key: 'pack', label: 'Study Packs', href: '/dashboard/study-pack' },
          { key: 'atlas', label: 'Atlas Sessions', href: '/dashboard/atlas' },
          { key: 'research', label: 'Research Reports', href: '/dashboard/research' },
          { key: 'presentation', label: 'Presentations', href: '/dashboard/presentations' },
        ].map((c) => {
          const Icon = ITEM_ICON[c.key]
          return (
            <Link key={c.key} href={c.href}>
              <Card className="p-5 hover:border-primary/40 transition cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{counts[c.key] || 0} items</div>
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your custom folders</h2>
      {folders.length === 0 ? (
        <Card className="p-8 text-center bg-card/40 border-dashed">
          <Folder className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No custom folders yet. Create one from the Notes page.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-3">
          {folders.map((f) => (
            <Card key={f.id} className="p-4">
              <Folder className={`w-5 h-5 mb-2 ${{green:'text-green-400',orange:'text-orange-400',blue:'text-blue-400',pink:'text-pink-400'}[f.color] || 'text-violet-400'}`} />
              <div className="font-medium">{f.name}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
