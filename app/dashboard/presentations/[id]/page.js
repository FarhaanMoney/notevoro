import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PresentationViewer } from '@/components/PresentationViewer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function PresentationDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) notFound()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: deck } = await supabase.from('presentations').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!deck) notFound()
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/dashboard/presentations"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />All decks</Button></Link>
      <PresentationViewer deck={deck} />
    </div>
  )
}
