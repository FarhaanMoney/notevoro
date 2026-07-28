import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ notes: [], folders: [] })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [{ data: notes }, { data: folders }] = await Promise.all([
    supabase.from('notes').select('id, title, folder_id, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }),
    supabase.from('folders').select('id, name, color, created_at').eq('user_id', user.id).order('created_at', { ascending: true }),
  ])
  return NextResponse.json({ notes: notes || [], folders: folders || [] })
}

export async function POST(request) {
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { data, error } = await supabase.from('notes').insert({
    user_id: user.id,
    title: body.title || 'Untitled',
    folder_id: body.folder_id || null,
    content_html: body.content_html || '',
    content_text: body.content_text || '',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ note: data })
}
