import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StudyPackViewer } from '@/components/StudyPackViewer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function StudyPackDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: pack } = await supabase.from('study_packs').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!pack) notFound()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/dashboard/study-pack"><Button variant="ghost" size="sm" className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />New pack</Button></Link>
      <StudyPackViewer pack={pack} />
    </div>
  )
}
