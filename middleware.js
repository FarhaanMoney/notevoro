import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { resolveWorkspaceType } from '@/lib/auth/profile-recovery'

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

  console.log('[ROUTE DEBUG]', {
    pathname: url.pathname,
    userId: user?.id,
    isEducatorRoute,
    isStudentRoute
  })

  // null = unknown — must NOT be treated as student
  let workspaceType = null

  if (user) {
    try {
      const result = await resolveWorkspaceType(supabase, user)
      workspaceType = result.workspaceType

      if (result.recovered) {
        console.log('[middleware] Profile recovered for user:', user.id, workspaceType)
      }

      console.log('[WORKSPACE ROUTING]', {
        pathname: url.pathname,
        userId: user.id,
        workspaceType,
        isEducatorRoute,
        isStudentRoute,
        decision: workspaceType ? 'ROUTE' : 'ALLOW_UNKNOWN'
      })
    } catch (err) {
      console.error('[middleware] Unexpected error resolving workspace:', err)
      console.error('[middleware] User ID:', user.id, 'Error:', err.message)
    }
  }

  // Protect student routes
  if (isStudentRoute && !user) {
    console.log('[REDIRECT DEBUG]', {
      from: url.pathname,
      to: '/login',
      reason: 'Unauthenticated user accessing student route'
    })
    const redirect = url.clone()
    redirect.pathname = '/login'
    redirect.searchParams.set('next', url.pathname)
    return NextResponse.redirect(redirect)
  }

  // Protect educator routes
  if (isEducatorRoute && !user) {
    console.log('[REDIRECT DEBUG]', {
      from: url.pathname,
      to: '/login',
      reason: 'Unauthenticated user accessing educator route'
    })
    const redirect = url.clone()
    redirect.pathname = '/login'
    redirect.searchParams.set('next', url.pathname)
    return NextResponse.redirect(redirect)
  }

  // Only enforce workspace separation when workspace type is known
  if (isEducatorRoute && user && workspaceType && workspaceType !== 'educator') {
    console.log('[REDIRECT DEBUG]', {
      from: url.pathname,
      to: '/dashboard',
      reason: 'Non-educator attempting to access educator route',
      workspaceType
    })
    const redirect = url.clone()
    redirect.pathname = '/dashboard'
    return NextResponse.redirect(redirect)
  }

  if (isStudentRoute && user && workspaceType === 'educator') {
    console.log('[REDIRECT DEBUG]', {
      from: url.pathname,
      to: '/educator/dashboard',
      reason: 'Educator attempting to access student route',
      workspaceType
    })
    const redirect = url.clone()
    redirect.pathname = '/educator/dashboard'
    return NextResponse.redirect(redirect)
  }

  // Redirect authenticated users from auth pages to their correct workspace
  if (isAuthPage && user) {
    const redirectPath = workspaceType === 'educator' ? '/educator/dashboard' : '/dashboard'
    console.log('[REDIRECT DEBUG]', {
      from: url.pathname,
      to: redirectPath,
      reason: 'Authenticated user on auth page',
      workspaceType
    })
    const redirect = url.clone()
    redirect.pathname = redirectPath
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/educator/:path*', '/login', '/signup'],
}
