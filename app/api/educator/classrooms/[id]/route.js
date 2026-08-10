import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request, { params }) {
  try {
    const { id } = params
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Ownership check: ensure educator owns it or is member
    if (data.educator_id !== user.id) {
      // check membership
      const { data: member } = await supabase.from('classroom_memberships').select('*').eq('classroom_id', id).eq('student_id', user.id).maybeSingle()
      if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ classroom: data })
  } catch (err) {
    console.error('[Classroom:id] GET error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json().catch(() => ({}))
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ensure ownership
    const { data: existing } = await supabase.from('classrooms').select('educator_id').eq('id', id).maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.educator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updates = {}
    for (const key of ['name', 'subject', 'grade', 'description', 'is_active']) {
      if (body[key] !== undefined) updates[key] = body[key]
    }
    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase.from('classrooms').update(updates).eq('id', id).select().maybeSingle()
    if (error) throw error
    return NextResponse.json({ classroom: data })
  } catch (err) {
    console.error('[Classroom:id] PATCH error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await supabase.from('classrooms').select('educator_id').eq('id', id).maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.educator_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.from('classrooms').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Classroom:id] DELETE error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
