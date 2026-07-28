import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ sets: [] })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('quiz_sets').select('id, topic, difficulty, questions, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
  return NextResponse.json({ sets: data || [] })
}
