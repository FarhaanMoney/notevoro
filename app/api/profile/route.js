import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ensureUserRecords } from '@/lib/auth/user-init'

export async function GET(request) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error

    if (!profile) {
      const initialized = await ensureUserRecords(user.id, user.email, user.user_metadata)
      if (!initialized) {
        return NextResponse.json({ profile: null })
      }

      const { data: createdProfile, error: createdProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (createdProfileError) throw createdProfileError
      return NextResponse.json({ profile: createdProfile })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[Profile] Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  return handleProfileWrite(request, 'POST')
}

export async function PUT(request) {
  return handleProfileWrite(request, 'PUT')
}

async function handleProfileWrite(request, method) {
  try {
    const supabase = await createClient()
    if (!supabase) return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    const body = await request.json().catch(() => ({}))
    const { display_name, full_name, grade, curriculum, avatar_url, email, userId } = body

    const targetUser = user || (userId ? { id: userId, email: email || null, user_metadata: {} } : null)
    if (!targetUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureUserRecords(targetUser.id, targetUser.email || email || '', targetUser.user_metadata || {})

    const upsertData = {
      id: targetUser.id,
      email: email ?? targetUser.email,
      updated_at: new Date().toISOString(),
    }

    if (display_name !== undefined) upsertData.display_name = display_name
    if (full_name !== undefined) upsertData.full_name = full_name
    if (grade !== undefined) upsertData.grade = grade
    if (curriculum !== undefined) upsertData.curriculum = curriculum
    if (avatar_url !== undefined) upsertData.avatar_url = avatar_url

    const client = supabaseAdmin || supabase
    const { data: profile, error } = await client
      .from('profiles')
      .upsert(upsertData, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ profile, message: 'Profile updated successfully' })
  } catch (error) {
    console.error('[Profile] Error updating profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}