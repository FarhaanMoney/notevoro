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
  const isProtected = url.pathname.startsWith('/dashboard')

  if (isProtected && !user) {
    const redirect = url.clone()
    redirect.pathname = '/login'
    redirect.searchParams.set('next', url.pathname)
    return NextResponse.redirect(redirect)
  }
  if (isAuthPage && user) {
    const redirect = url.clone()
    redirect.pathname = '/dashboard'
    redirect.search = ''
    return NextResponse.redirect(redirect)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
