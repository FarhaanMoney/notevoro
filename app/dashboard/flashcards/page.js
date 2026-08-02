import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { GenericLauncher } from '@/components/GenericLauncher'
import { Layers, ArrowRight } from 'lucide-react'

export default async function FlashcardsPage() {
  const supabase = await createClient()
  let sets = []
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('flashcard_sets').select('id, topic, cards, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(24)
      sets = data || []
    }
  } else {
    sets = [
      { id: 'demo-1', topic: 'Cell Biology', cards: new Array(15), created_at: new Date().toISOString() },
      { id: 'demo-2', topic: 'World Capitals', cards: new Array(20), created_at: new Date(Date.now()-86400e3).toISOString() },
    ]
  }
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-3"><Layers className="w-3 h-3" /> Spaced repetition ready</div>
        <h1 className="text-3xl font-bold">Flashcards</h1>
        <p className="text-muted-foreground mt-1">Generate high-quality flashcard sets on any topic. Study, flip, review.</p>
      </div>
      <GenericLauncher
        endpoint="/api/flashcards/generate"
        placeholder="Topic for flashcards... e.g. Cell Biology, Spanish verbs, Capitals"
        suggestions={['Cell Biology','French vocabulary','World Capitals','Chemistry formulas','Historical dates']}
        buttonLabel="Generate cards"
        loadingLabel="Creating cards..."
        redirectPath="/dashboard/flashcards"
        includeCount={true}
        statusType="flashcards"
      />
      {sets.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your sets</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sets.map((s) => (
              <Link key={s.id} href={`/dashboard/flashcards/${s.id}`}>
                <Card className="p-4 hover:border-primary/40 transition cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.topic}</div>
                      <div className="text-xs text-muted-foreground">{s.cards?.length || 0} cards</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
