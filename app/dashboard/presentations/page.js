import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { PresentationLauncher } from '@/components/PresentationLauncher'
import { Presentation, ArrowRight } from 'lucide-react'

export default async function PresentationsPage() {
  const supabase = await createClient()
  let decks = []
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('presentations').select('id, topic, theme, slides, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(12)
      decks = data || []
    }
  } else {
    decks = [
      { id: 'demo-1', topic: 'The Water Cycle', theme: 'blue', slides: new Array(9), created_at: new Date().toISOString() },
      { id: 'demo-2', topic: 'Introduction to Machine Learning', theme: 'violet', slides: new Array(11), created_at: new Date(Date.now()-86400e3).toISOString() },
    ]
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-3">
          <Presentation className="w-3 h-3" /> AI slide decks
        </div>
        <h1 className="text-3xl font-bold">Presentations</h1>
        <p className="text-muted-foreground mt-1">Generate polished slide decks with speaker notes. Present in-app or export to PPTX/PDF.</p>
      </div>

      <PresentationLauncher />

      {decks.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your decks</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {decks.map((d) => (
              <Link key={d.id} href={`/dashboard/presentations/${d.id}`}>
                <Card className="p-4 hover:border-primary/40 transition cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${themeGrad(d.theme)} flex items-center justify-center`}>
                      <Presentation className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{d.topic}</div>
                      <div className="text-xs text-muted-foreground">{d.slides?.length || 0} slides · {new Date(d.created_at).toLocaleDateString()}</div>
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

function themeGrad(t) {
  return { violet:'from-violet-500 to-pink-500', blue:'from-blue-500 to-cyan-500', green:'from-emerald-500 to-teal-500', orange:'from-orange-500 to-amber-500' }[t] || 'from-violet-500 to-pink-500'
}
