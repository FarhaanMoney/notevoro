import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { GenericLauncher } from '@/components/GenericLauncher'
import { HelpCircle, ArrowRight } from 'lucide-react'

export default async function QuizzesPage() {
  const supabase = await createClient()
  let sets = []
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('quiz_sets').select('id, topic, difficulty, questions, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(24)
      sets = data || []
    }
  } else {
    sets = [
      { id: 'demo-1', topic: 'Trigonometry', difficulty: 'medium', questions: new Array(10), created_at: new Date().toISOString() },
    ]
  }
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-3"><HelpCircle className="w-3 h-3" /> Adaptive difficulty</div>
        <h1 className="text-3xl font-bold">Quizzes</h1>
        <p className="text-muted-foreground mt-1">Practice with adaptive MCQ quizzes. Choose difficulty. Get explanations.</p>
      </div>
      <GenericLauncher
        endpoint="/api/quizzes/generate"
        placeholder="Quiz topic... e.g. Trigonometry, French Revolution, Photosynthesis"
        suggestions={['Trigonometry','French Revolution','Photosynthesis','JavaScript basics','Periodic table']}
        buttonLabel="Generate quiz"
        loadingLabel="Building quiz..."
        redirectPath="/dashboard/quizzes"
        includeCount
        includeDifficulty
      />
      {sets.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your quizzes</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sets.map((s) => (
              <Link key={s.id} href={`/dashboard/quizzes/${s.id}`}>
                <Card className="p-4 hover:border-primary/40 transition cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{s.topic}</div>
                      <div className="text-xs text-muted-foreground">{s.questions?.length || 0} Qs · {s.difficulty}</div>
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
