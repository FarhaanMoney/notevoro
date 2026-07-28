import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { QuizRunner } from '@/components/QuizRunner'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function QuizSetPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) notFound()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: set } = await supabase.from('quiz_sets').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!set) notFound()
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/dashboard/quizzes"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />All quizzes</Button></Link>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wide text-primary font-semibold mb-1">Quiz · {set.difficulty}</div>
        <h1 className="text-3xl font-bold">{set.topic}</h1>
        <p className="text-sm text-muted-foreground mt-1">{set.questions?.length || 0} questions</p>
      </div>
      <QuizRunner questions={set.questions || []} />
    </div>
  )
}
