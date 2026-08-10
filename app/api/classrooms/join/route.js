import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { code } = body
    if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find classroom
    const { data: classroom } = await supabase.from('classrooms').select('*').ilike('classroom_code', code).maybeSingle()
    if (!classroom) return NextResponse.json({ error: 'Invalid classroom code' }, { status: 404 })
    if (!classroom.is_active) return NextResponse.json({ error: 'Classroom is not active' }, { status: 400 })

    // Prevent duplicate membership
    const { data: existing } = await supabase.from('classroom_memberships').select('*').eq('classroom_id', classroom.id).eq('student_id', user.id).maybeSingle()
    if (existing) return NextResponse.json({ message: 'Already joined', classroom })

    // Create membership
    const { data, error } = await supabase.from('classroom_memberships').insert({ classroom_id: classroom.id, student_id: user.id }).select().maybeSingle()
    if (error) throw error

    return NextResponse.json({ message: 'Joined', classroom })
  } catch (err) {
    console.error('[Classrooms:join] POST error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
