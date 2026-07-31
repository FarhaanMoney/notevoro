'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { GoogleButton } from '@/components/GoogleButton'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: '', displayName: '', email: '', password: '', grade: '', curriculum: 'CBSE',
  })
  const [loading, setLoading] = useState(false)

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, display_name: form.displayName || form.fullName } },
      })
      if (error) throw error
      if (data.user) {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: form.fullName, display_name: form.displayName || form.fullName, grade: form.grade, curriculum: form.curriculum }),
        })
      }
      toast.success('Account created! Welcome to Notevoro.')
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      toast.error(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center glow">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Notevoro</span>
        </Link>
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-8">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalize your learning in 60 seconds.</p>

          <div className="mt-6 space-y-3">
            <GoogleButton label="Sign up with Google" />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or email</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Aarav" />
              </div>
              <div className="space-y-2">
                <Label>Display name</Label>
                <Input value={form.displayName} onChange={(e) => update('displayName', e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@school.edu" />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" required minLength={6} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Grade</Label>
                <Input value={form.grade} onChange={(e) => update('grade', e.target.value)} placeholder="e.g. 10, 12, Freshman" />
              </div>
              <div className="space-y-2">
                <Label>Curriculum</Label>
                <Select value={form.curriculum} onValueChange={(v) => update('curriculum', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['CBSE','ICSE','IGCSE','IB','College','University','Other'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-violet-500 to-pink-500 hover:opacity-90">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create account'}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground text-center mt-6">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
