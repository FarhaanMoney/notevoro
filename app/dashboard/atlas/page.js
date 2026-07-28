import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AtlasLauncher } from '@/components/AtlasLauncher'
import { Card } from '@/components/ui/card'
import { GraduationCap, ArrowRight, CheckCircle2, PlayCircle } from 'lucide-react'

export default async function AtlasPage() {
  const supabase = await createClient()
  let sessions = []

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('atlas_sessions').select('id, topic, progress, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(12)
      sessions = data || []
    }
  } else {
    sessions = [
      { id: 'demo-1', topic: 'The French Revolution', progress: { concept_idx: 2, completed: false }, updated_at: new Date(Date.now() - 3600e3).toISOString() },
      { id: 'demo-2', topic: 'Photosynthesis', progress: { concept_idx: 4, completed: true }, updated_at: new Date(Date.now() - 86400e3).toISOString() },
    ]
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-3">
          <GraduationCap className="w-3 h-3" /> Adaptive tutor
        </div>
        <h1 className="text-3xl font-bold">Professor Atlas</h1>
        <p className="text-muted-foreground mt-1">Your private AI tutor. Teaches step-by-step — explanation, analogy, check-in, mini-quiz, checkpoint. Adapts as you learn.</p>
      </div>

      <AtlasLauncher />

      {sessions.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your sessions</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {sessions.map((s) => {
              const done = s.progress?.completed
              const idx = s.progress?.concept_idx ?? 0
              return (
                <Link key={s.id} href={`/dashboard/atlas/${s.id}`}>
                  <Card className="p-4 hover:border-primary/40 transition cursor-pointer group">
                    <div className="flex items-center gap-3">
                      {done
                        ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : <PlayCircle className="w-5 h-5 text-primary" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.topic}</div>
                        <div className="text-xs text-muted-foreground">{done ? 'Completed' : `Concept ${idx + 1} of 4`} · {new Date(s.updated_at).toLocaleDateString()}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition" />
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
