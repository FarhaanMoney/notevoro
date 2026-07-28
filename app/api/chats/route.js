import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('chats').select('id, title, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50)
  return NextResponse.json({ chats: data || [] })
}
