import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { error } = await supabase.from('profiles').update({
    full_name: body.full_name,
    display_name: body.display_name,
    grade: body.grade,
    curriculum: body.curriculum,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return NextResponse.json({ profile: data })
}
