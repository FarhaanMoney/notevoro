import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkStorage, consumeUsage, logUsageRequest } from '@/lib/usage/usageEngine'

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
  const startTime = Date.now()
  const supabase = await createClient()
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  
  // Calculate approximate storage usage (in MB)
  const contentSize = (body.content_html?.length || 0) + (body.content_text?.length || 0) + (body.title?.length || 0)
  const estimatedSizeMB = Math.max(0.01, contentSize / 1024 / 1024) // Convert bytes to MB, minimum 0.01 MB
  
  // Check storage limit
  const storageCheck = await checkStorage(user.id, estimatedSizeMB)
  if (!storageCheck.allowed) {
    await logUsageRequest(user.id, 'storage', false, Date.now() - startTime, false)
    return NextResponse.json(storageCheck, { status: 429 })
  }
  
  const { data, error } = await supabase.from('notes').insert({
    user_id: user.id,
    title: body.title || 'Untitled',
    folder_id: body.folder_id || null,
    content_html: body.content_html || '',
    content_text: body.content_text || '',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  
  // Consume storage usage with actual size
  await consumeUsage(user.id, 'storage', estimatedSizeMB)
  await logUsageRequest(user.id, 'storage', true, Date.now() - startTime, true)
  
  return NextResponse.json({ note: data })
}
