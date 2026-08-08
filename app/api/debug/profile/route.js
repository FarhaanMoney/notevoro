import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const url = new URL(request.url)
  const userId = url.searchParams.get('userId')
  
  if (!userId) {
    return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
  }
  
  try {
    const supabase = await createClient()
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Check if profile exists (with RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    
    // Get current authenticated user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    return NextResponse.json({
      userId,
      currentUser: currentUser ? {
        id: currentUser.id,
        email: currentUser.email
      } : null,
      profile: profile || null,
      profileError: profileError ? {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details
      } : null,
      summary: {
        profileExists: !!profile,
        profileWorkspaceType: profile?.workspace_type,
        isCurrentUser: currentUser?.id === userId,
        canAccessProfile: !!profile || !profileError
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
