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
    
    // Get current authenticated user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    // Check if profile exists (with RLS - as the authenticated user)
    let profile = null
    let profileError = null
    let profileWithRLS = null
    
    if (currentUser) {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      profileWithRLS = result.data
      profileError = result.error
    }
    
    // Try to get auth user metadata (this should work regardless of RLS)
    let authUserMetadata = null
    if (currentUser && currentUser.id === userId) {
      authUserMetadata = currentUser.user_metadata
    }
    
    return NextResponse.json({
      userId,
      currentUser: currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        user_metadata: currentUser.user_metadata
      } : null,
      profileWithRLS: profileWithRLS || null,
      profileError: profileError ? {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      } : null,
      authUserMetadata: authUserMetadata,
      summary: {
        profileExists: !!profileWithRLS,
        profileWorkspaceType: profileWithRLS?.workspace_type,
        authMetadataWorkspaceType: authUserMetadata?.workspace_type,
        isCurrentUser: currentUser?.id === userId,
        canAccessProfile: !!profileWithRLS || !profileError,
        rlsBlocking: !!profileError && !profileWithRLS
      }
    })
  } catch (error) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }
}
