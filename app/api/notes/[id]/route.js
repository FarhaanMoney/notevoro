import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkStorage, consumeUsage, logUsageRequest } from '@/lib/usage/usageEngine'

export async function GET(_req, { params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('notes').select('*').eq('id', id).eq('user_id', user.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ note: data })
}

export async function PATCH(request, { params }) {
  const startTime = Date.now()
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  
  // Get current note to calculate size difference
  const { data: currentNote } = await supabase.from('notes').select('content_html, content_text, title').eq('id', id).eq('user_id', user.id).single()
  if (!currentNote) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  
  // Calculate size difference
  const currentSize = (currentNote.content_html?.length || 0) + (currentNote.content_text?.length || 0) + (currentNote.title?.length || 0)
  const newSize = ((body.content_html || currentNote.content_html)?.length || 0) + 
                  ((body.content_text || currentNote.content_text)?.length || 0) + 
                  ((body.title || currentNote.title)?.length || 0)
  const sizeDifferenceMB = Math.max(0, (newSize - currentSize) / 1024 / 1024)
  
  // Check storage limit if content is growing
  if (sizeDifferenceMB > 0) {
    const storageCheck = await checkStorage(user.id, sizeDifferenceMB)
    if (!storageCheck.allowed) {
      await logUsageRequest(user.id, 'storage', false, Date.now() - startTime, false)
      return NextResponse.json(storageCheck, { status: 429 })
    }
  }
  
  const patch = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) patch.title = body.title
  if (body.content_html !== undefined) patch.content_html = body.content_html
  if (body.content_text !== undefined) patch.content_text = body.content_text
  if (body.folder_id !== undefined) patch.folder_id = body.folder_id
  const { error } = await supabase.from('notes').update(patch).eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  
  // Update storage usage if content grew
  if (sizeDifferenceMB > 0) {
    await consumeUsage(user.id, 'storage', sizeDifferenceMB)
    await logUsageRequest(user.id, 'storage', true, Date.now() - startTime, true)
  }
  
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req, { params }) {
  const { id } = await params
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
