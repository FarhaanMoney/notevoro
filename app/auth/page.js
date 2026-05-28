'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('login');
  const [step, setStep] = useState('auth');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [personalization, setPersonalization] = useState({ goal: '', subjects: '', style: '' });
  const [themeError, setThemeError] = useState(null);
  const googleBtnRef = useRef(null);

  async function routeAfterAuth(session) {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      if (!response.ok) {
        router.replace('/dashboard');
        return;
      }
      const data = await response.json();
      const isOnboardingComplete = data.user?.personalization?.onboarding_completed || data.user?.onboardingStep === 'completed' || Boolean(data.user?.onboardingCompletedAt);
      if (!isOnboardingComplete) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    } catch (error) {
      console.error('Route after auth failed:', error);
      router.replace('/dashboard');
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabaseBrowser().auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        console.log('Auth state change: SIGNED_IN');
        await routeAfterAuth(session);
      } else {
        console.log('No session found');
      }
    });
    
    return () => subscription.unsubscribe();
  }, [router]);

  // Fallback session check on page load
  useEffect(() => {
    async function checkSession() {
      try {
        const sb = supabaseBrowser();
        const { data: { session } } = await sb.auth.getSession();
        
        if (session?.user) {
          console.log('Session found on page load, routing after auth');
          await routeAfterAuth(session);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setThemeError(error.message);
      }
    }
    
    const timeoutId = setTimeout(() => {
      console.log('Session check timeout, proceeding with normal flow');
    }, 5000); // 5 second timeout
    
    checkSession();
    
    return () => clearTimeout(timeoutId);
  }, [router]);

  async function googleSignIn() {
    try {
      setLoading(true);
      const sb = supabaseBrowser();
      const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
      
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${base}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error('Auth error:', error);
        throw error;
      }
    } catch (e) {
      toast.error('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast.error('Authentication timed out. Please try again.');
    }, 30000);
    
    try {
      const sb = supabaseBrowser();
      
      if (tab === 'login') {
        console.log('Attempting login with email:', form.email);
        const { data, error } = await sb.auth.signInWithPassword({ 
          email: form.email, 
          password: form.password 
        });
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('Auth error:', error);
          throw error;
        }

        if (data?.session) {
          await routeAfterAuth(data.session);
          return;
        }

        console.log('Login successful, waiting for auth state change');
        toast.success('Welcome back!');
        return;
      }
      
      console.log('Attempting signup with email:', form.email);
      const { data, error } = await sb.auth.signUp({ 
        email: form.email, 
        password: form.password,
        options: {
          data: {
            name: form.name,
          },
        },
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('Auth error:', error);
        throw error;
      }
      
      if (data?.session) {
        await routeAfterAuth(data.session);
        return;
      }

      console.log('Signup successful, waiting for OTP verification');
      setStep('otp');
      toast.success('Verification code sent to your email!');
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('Authentication error:', e);
      toast.error(e.message || 'Authentication failed');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast.error('OTP verification timed out. Please try again.');
    }, 30000);
    
    try {
      const sb = supabaseBrowser();
      console.log('Verifying OTP for email:', form.email);
      
      const { data, error } = await sb.auth.verifyOtp({
        email: form.email,
        token: otp,
        type: 'signup',
      });
      
      clearTimeout(timeoutId);
      
      if (error) {
        console.error('OTP verification error:', error);
        throw error;
      }

      if (data?.session) {
        await routeAfterAuth(data.session);
        return;
      }
      
      console.log('OTP verification successful, waiting for auth state change');
      toast.success('Welcome to Notevoro AI!');
    } catch (e) {
      clearTimeout(timeoutId);
      console.error('OTP verification error:', e);
      toast.error(e.message || 'Invalid verification code');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: form.email,
          name: form.name 
        }),
      });
      
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to resend code');
      
      toast.success('New verification code sent to your email!');
    } catch (e) {
      toast.error(e.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/60 to-black relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 via-blue-800/20 to-black/20 animate-pulse"></div>
      
      {/* Floating gradient orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl animate-blob"></div>
      <div className="absolute top-40 right-20 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      
      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Logo and title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent mb-2">
              Notevoro AI
            </h1>
            <p className="text-zinc-300 text-lg">Your AI Study Partner</p>
          </div>

          {/* Auth card */}
          <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <Tabs value={tab} onValueChange={(value) => { setTab(value); setStep('auth'); setOtp(''); }} className="w-full">
              <TabsList className="grid grid-cols-2 bg-zinc-900/50 border border-white/5 mb-6">
                <TabsTrigger value="login" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300">Login</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-300">Sign up</TabsTrigger>
              </TabsList>

              {step === 'auth' && (
                <form onSubmit={submit} className="space-y-4">
                  {tab === 'signup' && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-zinc-300">Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your name"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 pl-10"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-zinc-300">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className="bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {tab === 'login' ? 'Signing in...' : 'Creating account...'}
                      </>
                    ) : (
                      tab === 'login' ? 'Sign In' : 'Create Account'
                    )}
                  </Button>
                </form>
              )}

              {step === 'otp' && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-xl font-semibold text-white mb-2">Verify your email</h3>
                    <p className="text-zinc-400">We sent a code to {form.email}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="otp" className="text-zinc-300">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="bg-zinc-900/50 border-white/10 text-white placeholder-zinc-500 text-center text-2xl tracking-widest"
                      maxLength={6}
                      required
                    />
                  </div>

                  <Button
                    onClick={verifyOtp}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 rounded-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Email'
                    )}
                  </Button>
                  
                  <Button
                    onClick={resendOtp}
                    disabled={loading}
                    variant="outline"
                    className="w-full bg-transparent border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white font-medium py-3 rounded-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                </div>
              )}

              {/* Google Sign In */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-transparent text-zinc-400">Or continue with</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  onClick={googleSignIn}
                  disabled={loading}
                  className="w-full mt-4 bg-zinc-900/50 hover:bg-zinc-900/70 border border-white/10 text-white font-medium py-3 rounded-lg transition-all duration-200"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-zinc-400 text-sm">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
