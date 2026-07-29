'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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
      const next = params.get('next') || '/dashboard'
      router.push(next)
      router.refresh()
    } catch (err) {
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
          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Logging in...</> : 'Log in'}
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
    <Suspense fallback={<div className="min-h-screen gradient-bg flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
