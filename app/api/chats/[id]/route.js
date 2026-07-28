import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: chat } = await supabase.from('chats').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: messages } = await supabase.from('messages').select('id, role, content, created_at').eq('chat_id', id).order('created_at', { ascending: true })
  return NextResponse.json({ chat, messages: messages || [] })
}

export async function DELETE(_req, { params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await supabase.from('chats').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
