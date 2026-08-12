'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, GraduationCap, Users, Briefcase } from 'lucide-react'
import { toast } from 'sonner'
import { GoogleButton } from '@/components/GoogleButton'
import { VoroThinking } from '@/components/voro/VoroThinking'

const WORKSPACE_TYPES = [
  { value: 'student', label: 'Student', icon: GraduationCap, description: 'Study, learn, and grow with AI-powered tools' },
  { value: 'educator', label: 'Educator', icon: Users, description: 'Teach, manage classrooms, and create content' },
  { value: 'professional', label: 'Working Professional', icon: Briefcase, description: 'Manage projects, research, documents, and AI workflows' },
]

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    fullName: '', displayName: '', email: '', password: '', grade: '', curriculum: 'CBSE', workspaceType: 'student',
  })
  const [loading, setLoading] = useState(false)

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      console.log('[signup] Selected workspace_type:', form.workspaceType)
      
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.fullName, display_name: form.displayName || form.fullName, workspace_type: form.workspaceType } },
      })
      
      if (error) throw error
      if (data.user) {
        console.log('[signup] Auth user created:', data.user.id)
        console.log('[signup] Auth metadata workspace_type:', data.user.user_metadata?.workspace_type)
        
        // Wait for profile update to complete
        const profileResponse = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name: form.fullName, display_name: form.displayName || form.fullName, grade: form.grade, curriculum: form.curriculum, workspace_type: form.workspaceType }),
        })
        const profileData = await profileResponse.json()
        console.log('[signup] Profile update response:', profileData)
        
        // Verify the profile was updated correctly
        if (profileData.profile) {
          console.log('[signup] Verified profile workspace_type:', profileData.profile.workspace_type)
        }
      }
      toast.success('Account created! Welcome to Notevoro.')
      
      // Use window.location.href for full page reload to ensure session is established
      // This avoids middleware timing issues with router.push
      const redirectPath = form.workspaceType === 'educator'
        ? '/educator/dashboard'
        : form.workspaceType === 'professional'
        ? '/professional/dashboard'
        : '/dashboard'
      console.log('[signup] Using window.location.href to redirect to:', redirectPath, 'based on workspace_type:', form.workspaceType)
      window.location.href = redirectPath
    } catch (err) {
      console.error('[signup] Error:', err)
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
          <p className="text-sm text-muted-foreground mt-1">Choose your workspace and get started.</p>

          <div className="mt-6 space-y-3">
            <GoogleButton label="Sign up with Google" workspaceType={form.workspaceType} />
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">or email</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>

          {/* Workspace Type Selection */}
          <div className="mt-6">
            <Label className="text-sm font-semibold">How will you use Notevoro?</Label>
            <div className="grid grid-cols-1 gap-2 mt-3">
              {WORKSPACE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => update('workspaceType', type.value)}
                  className={`p-3 rounded-lg border text-left transition ${
                    form.workspaceType === type.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card/40 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <type.icon className={`w-5 h-5 ${form.workspaceType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{type.label}</div>
                      <div className="text-[11px] text-muted-foreground">{type.description}</div>
                    </div>
                    {form.workspaceType === type.value && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
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
              {loading ? <VoroThinking size="sm" className="text-white" /> : 'Create account'}
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
