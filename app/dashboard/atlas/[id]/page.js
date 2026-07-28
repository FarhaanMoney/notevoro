import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AtlasSession } from '@/components/AtlasSession'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function AtlasSessionPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) notFound()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: session } = await supabase.from('atlas_sessions').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!session) notFound()

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/dashboard/atlas"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />All sessions</Button></Link>
      <AtlasSession session={session} />
    </div>
  )
}
