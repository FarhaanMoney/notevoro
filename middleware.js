import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const response = NextResponse.next({ request })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl
  const isAuthPage = url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')
  const isStudentRoute = url.pathname.startsWith('/dashboard')
  const isEducatorRoute = url.pathname.startsWith('/educator')

  // Get user's workspace type if authenticated
  let workspaceType = 'student'
  if (user) {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('workspace_type')
        .eq('id', user.id)
        .maybeSingle()
      
      if (profileError) {
        console.error('[middleware] Profile query error:', profileError)
        console.error('[middleware] User ID:', user.id, 'Error details:', JSON.stringify(profileError))
        // DO NOT redirect to login - this causes infinite loop
        // Instead, use default workspace_type and let the page handle the error
        workspaceType = 'student'
      } else if (!profile) {
        console.error('[middleware] PROFILE NOT FOUND for user ID:', user.id)
        console.error('[middleware] This indicates the profile creation trigger may have failed')
        // DO NOT redirect to login - this causes infinite loop
        // Instead, use default workspace_type and let the page handle the error
        workspaceType = 'student'
      } else {
        workspaceType = profile?.workspace_type || 'student'
      }
      
      console.log('[WORKSPACE ROUTING]', {
        pathname: url.pathname,
        userId: user.id,
        workspaceType,
        isEducatorRoute,
        isStudentRoute,
        decision: 'ALLOW'
      })
    } catch (err) {
      console.error('[middleware] Unexpected error fetching profile:', err)
      console.error('[middleware] User ID:', user.id, 'Error:', err.message)
      // DO NOT redirect to login - this causes infinite loop
      // Instead, use default workspace_type and let the page handle the error
      workspaceType = 'student'
    }
  }

  // Protect student routes
  if (isStudentRoute && !user) {
    const redirect = url.clone()
    redirect.pathname = '/login'
    redirect.searchParams.set('next', url.pathname)
    return NextResponse.redirect(redirect)
  }

  // Protect educator routes
  if (isEducatorRoute && !user) {
    const redirect = url.clone()
    redirect.pathname = '/login'
    redirect.searchParams.set('next', url.pathname)
    return NextResponse.redirect(redirect)
  }

  // Prevent students from accessing educator routes
  if (isEducatorRoute && user && workspaceType !== 'educator') {
    console.log('[middleware] Student attempting to access educator route, redirecting to /dashboard')
    const redirect = url.clone()
    redirect.pathname = '/dashboard'
    return NextResponse.redirect(redirect)
  }

  // Prevent educators from accessing student routes
  if (isStudentRoute && user && workspaceType === 'educator') {
    console.log('[middleware] Educator attempting to access student route, redirecting to /educator/dashboard')
    const redirect = url.clone()
    redirect.pathname = '/educator/dashboard'
    return NextResponse.redirect(redirect)
  }

  // Redirect authenticated users from auth pages to their correct workspace
  if (isAuthPage && user) {
    const redirect = url.clone()
    redirect.pathname = workspaceType === 'educator' ? '/educator/dashboard' : '/dashboard'
    redirect.search = ''
    console.log('[middleware] Redirecting authenticated user from auth page to:', redirect.pathname)
    return NextResponse.redirect(redirect)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/educator/:path*', '/login', '/signup'],
}
