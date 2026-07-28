import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TestRunner } from '@/components/TestRunner'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function TestDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) notFound()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: test } = await supabase.from('practice_tests').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!test) notFound()
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/dashboard/tests"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />All tests</Button></Link>
      <TestRunner test={test} />
    </div>
  )
}
