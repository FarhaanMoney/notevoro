import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('educator_id', user.id)

    if (error) throw error
    return NextResponse.json({ classrooms: data || [] })
  } catch (err) {
    console.error('[Classrooms] GET error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { name, subject, grade, description } = body
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

    // generate code server-side
    const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const base = (subject || name).toString().substring(0, 4).toUpperCase()
    const classroom_code = `${base}${grade || ''}-${codeSuffix}`

    const payload = {
      educator_id: user.id,
      name,
      subject: subject || null,
      grade: grade || null,
      description: description || null,
      classroom_code,
    }

    const { data, error } = await supabase
      .from('classrooms')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[Classrooms] create error', error)
      return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 })
    }

    return NextResponse.json({ classroom: data })
  } catch (err) {
    console.error('[Classrooms] POST error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
