import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { TestLauncher } from '@/components/TestLauncher'
import { FileText, ArrowRight, Clock, CheckCircle2, PlayCircle } from 'lucide-react'

export default async function TestsPage() {
  const supabase = await createClient()
  let tests = []
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('practice_tests').select('id, title, subject, duration_minutes, questions, result, completed_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      tests = data || []
    }
  } else {
    tests = [
      { id: 'demo-1', title: 'Physics — Kinematics Practice', subject: 'Physics', duration_minutes: 45, questions: new Array(20), result: { score_pct: 75 }, completed_at: new Date().toISOString(), created_at: new Date().toISOString() },
      { id: 'demo-2', title: 'World History Midterm Prep', subject: 'History', duration_minutes: 60, questions: new Array(25), result: null, completed_at: null, created_at: new Date(Date.now()-86400e3).toISOString() },
    ]
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary mb-3">
          <FileText className="w-3 h-3" /> Realistic exams
        </div>
        <h1 className="text-3xl font-bold">Practice Tests</h1>
        <p className="text-muted-foreground mt-1">Timed, graded, and analyzed. Find your weak topics and level up before your real exam.</p>
      </div>

      <TestLauncher />

      {tests.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Your tests</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {tests.map((t) => {
              const done = !!t.completed_at
              return (
                <Link key={t.id} href={`/dashboard/tests/${t.id}`}>
                  <Card className="p-4 hover:border-primary/40 transition cursor-pointer group">
                    <div className="flex items-center gap-3">
                      {done ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <PlayCircle className="w-5 h-5 text-primary" />}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{t.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock className="w-3 h-3" />{t.duration_minutes} min · {t.questions?.length || 0} Qs
                          {done && t.result && <> · <span className={t.result.score_pct >= 60 ? 'text-green-400' : 'text-amber-400'}>{t.result.score_pct}%</span></>}
                        </div>
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
