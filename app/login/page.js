'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { GoogleButton } from '@/components/GoogleButton'
import { VoroThinking } from '@/components/voro/VoroThinking'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Welcome back!')
      
      // Get user profile to determine workspace type
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        console.log('[login] User authenticated:', user.id)
        const { data: profile, error: profileError } = await supabase.from('profiles').select('workspace_type').eq('id', user.id).maybeSingle()
        
        if (profileError) {
          console.error('[login] Profile query error:', profileError)
          console.error('[login] User ID:', user.id, 'Error details:', JSON.stringify(profileError))
          // DO NOT show error and return - this prevents login
          // Instead, use default workspace_type
          const defaultPath = '/dashboard'
          const next = params.get('next') || defaultPath
          console.log('[login] Profile error, redirecting to default:', next)
          router.push(next)
          return
        }
        
        if (!profile) {
          console.error('[login] PROFILE NOT FOUND for user ID:', user.id)
          console.error('[login] This indicates the profile creation trigger may have failed')
          // DO NOT show error and return - this prevents login
          // Instead, create profile and use default workspace_type
          try {
            await supabase.from('profiles').insert({
              id: user.id,
              email: user.email,
              display_name: user.email?.split('@')[0] || 'User',
              workspace_type: 'student'
            })
            console.log('[login] Created missing profile for user:', user.id)
          } catch (insertError) {
            console.error('[login] Failed to create profile:', insertError)
          }
          const defaultPath = '/dashboard'
          const next = params.get('next') || defaultPath
          console.log('[login] Profile missing, redirecting to default:', next)
          router.push(next)
          return
        }
        
        const workspaceType = profile?.workspace_type || 'student'
        console.log('[login] Profile workspace_type:', workspaceType)
        const defaultPath = workspaceType === 'educator' ? '/educator/dashboard' : '/dashboard'
        const next = params.get('next') || defaultPath
        console.log('[login] Redirecting to:', next)
        router.push(next)
      } else {
        console.log('[login] No user found, redirecting to /dashboard')
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err) {
      console.error('[login] Error:', err)
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Notevoro</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-8">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">Log in to keep learning.</p>

          <div className="mt-6 space-y-3">
            <GoogleButton label="Continue with Google" />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or email</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90">
              {loading ? <VoroThinking size="sm" className="text-white" /> : 'Log in with email'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            New to Notevoro? <Link href="/signup" className="text-primary hover:underline">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <VoroThinking size="lg" className="text-primary" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
