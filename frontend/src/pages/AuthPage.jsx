import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { confirmForgotPassword, confirmSignUp, forgotPassword, providerName, signIn, signUp } from '../lib/auth';
import { useApp } from '../lib/store';
import { Icon } from '../lib/icons';
import { Logo } from './BrainLayout';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const loadMe = useApp((s) => s.loadMe);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const finish = async () => { await loadMe(); nav(loc.state?.from || '/dashboard', { replace: true }); };
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      if (mode === 'login') { await signIn(form); await finish(); }
      else if (mode === 'signup') { const r = await signUp(form); if (r.needsConfirmation) setMode('confirm'); else await finish(); }
      else if (mode === 'confirm') { await confirmSignUp(form.email, form.code); await signIn(form); await finish(); }
      else if (mode === 'forgot') { await forgotPassword(form.email); toast.success('Reset code sent'); setMode('reset'); }
      else if (mode === 'reset') { await confirmForgotPassword(form.email, form.code, form.password); toast.success('Password updated'); setMode('login'); }
    } catch (ex) { setErr(ex.response?.data?.error?.message || ex.message || 'Authentication failed'); } finally { setBusy(false); }
  };
  const title = { login: 'Welcome back', signup: 'Create your account', confirm: 'Verify your email', forgot: 'Recover your password', reset: 'Set a new password' }[mode];
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]" data-testid="auth-page">
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden" style={{ background: 'linear-gradient(160deg,#14121f 0%,#231b4d 55%,#3b2a8c 100%)' }}>
        <Logo size={30} />
        <div className="relative z-10">
          <div className="text-white/60 text-sm font-semibold tracking-wide uppercase">Give your thoughts a new place to live</div>
          <h1 className="text-white text-[44px] font-extrabold leading-[1.05] mt-4 tracking-tight">Your workspace<br />is <span className="text-[#c4b5fd]">yours.</span></h1>
          <p className="text-white/70 mt-5 max-w-md text-[15px] leading-relaxed">Unlimited locally. Powerful in the cloud. Intelligent with Voro. Spaces for everything you're working on — notes, tasks, projects, learning, meetings and your team, all connected.</p>
          <div className="flex gap-6 mt-10 text-white/80 text-xs font-semibold">{[['shield-check', 'Local-first ownership'], ['users', 'Real-time collaboration'], ['sparkles', 'Space-aware Voro']].map(([i, t]) => <div key={t} className="flex items-center gap-2"><Icon name={i} size={14} className="text-[#c4b5fd]" /> {t}</div>)}</div>
        </div>
        <div className="text-white/40 text-xs">© Notevoro</div>
        <div className="absolute -right-24 top-1/3 w-[420px] h-[420px] rounded-full opacity-60" style={{ background: 'radial-gradient(circle at 30% 30%, #a78bfa 0%, #6e56f5 35%, transparent 70%)', filter: 'blur(10px)' }} aria-hidden />
        <div className="absolute right-24 bottom-24 w-2 h-2 rounded-full bg-[#f9a8d4]" /><div className="absolute right-40 top-40 w-1.5 h-1.5 rounded-full bg-[#c4b5fd]" />
      </div>
      <div className="flex items-center justify-center p-8 bg-white">
        <form onSubmit={submit} className="w-full max-w-[380px] fade-up" data-testid="auth-form">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h2 className="text-[26px] font-extrabold tracking-tight">{title}</h2>
          <p className="text-sm nv-muted mt-1">{mode === 'login' ? 'Enter your Brain.' : mode === 'signup' ? 'Start with a Personal Space. Free forever locally.' : mode === 'confirm' ? `We sent a code to ${form.email}` : 'We will send a verification code to your email.'}</p>
          <div className="mt-6 space-y-3">
            {mode === 'signup' && <input className="nv-input h-11" placeholder="Full name" value={form.name} onChange={set('name')} required data-testid="auth-name-input" />}
            {mode !== 'confirm' && mode !== 'reset' && <input className="nv-input h-11" type="email" placeholder="Email" value={form.email} onChange={set('email')} required data-testid="auth-email-input" />}
            {(mode === 'confirm' || mode === 'reset') && <input className="nv-input h-11" placeholder="Verification code" value={form.code} onChange={set('code')} required data-testid="auth-code-input" />}
            {mode !== 'forgot' && mode !== 'confirm' && <input className="nv-input h-11" type="password" placeholder={mode === 'reset' ? 'New password' : 'Password'} value={form.password} onChange={set('password')} required minLength={8} data-testid="auth-password-input" />}
          </div>
          {err && <div className="mt-3 text-xs text-[#ee5a5a] bg-[#fff4f4] border border-[#fbd5d5] rounded-lg p-2.5" data-testid="auth-error">{err}</div>}
          <button className="nv-btn nv-btn-primary w-full h-11 mt-5 text-sm" disabled={busy} data-testid="auth-submit-button">{busy ? <Icon name="loader-2" className="spin" size={16} /> : null} {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Continue'}</button>
          <div className="flex justify-between mt-5 text-xs nv-muted">
            {mode === 'login' ? <><button type="button" className="nv-link" onClick={() => setMode('signup')} data-testid="auth-switch-signup">Create an account</button><button type="button" className="nv-link" onClick={() => setMode('forgot')} data-testid="auth-forgot">Forgot password?</button></> : <button type="button" className="nv-link" onClick={() => setMode('login')} data-testid="auth-switch-login">Back to sign in</button>}
          </div>
          <div className="mt-8 text-[11px] nv-faint flex items-center gap-1.5"><Icon name="lock" size={11} /> Identity: {providerName() === 'cognito' ? 'AWS Cognito' : providerName() === 'local' ? 'Local provider (development)' : 'Not configured'}</div>
        </form>
      </div>
    </div>
  );
}
