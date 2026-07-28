import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ sessions: [] })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('atlas_sessions')
    .select('id, topic, progress, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
  return NextResponse.json({ sessions: data || [] })
}
