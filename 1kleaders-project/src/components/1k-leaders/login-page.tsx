'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import type { Page } from './types';

interface Props { navigate: (page: Page) => void; type?: string; }

export default function LoginPage({ navigate }: Props) {
  const { signIn } = useAuth();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [resetSent,   setResetSent]   = useState(false);
  const [showReset,   setShowReset]   = useState(false);
  const { supabase: _ } = { supabase: null }; // unused — reset handled below

  async function handleSignIn() {
    setError(null);
    if (!email || !password) return setError('Please enter your email and password.');
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      // Make Supabase error messages friendlier
      if (error.includes('Invalid login credentials')) setError('Incorrect email or password.');
      else if (error.includes('Email not confirmed'))  setError('Please confirm your email before signing in.');
      else setError(error);
    }
    // On success, auth context updates session → page.tsx renders the hub automatically
  }

  async function handleForgotPassword() {
    if (!email) return setError('Enter your email address above first.');
    setLoading(true);
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    setLoading(false);
    setResetSent(true);
    setShowReset(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6] p-4" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="max-w-md w-full">
        <Button variant="ghost" onClick={() => navigate('landing')} className="mb-6 text-[#7e7e7e] hover:text-[#222]">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card className="border-[#f0f0f0] shadow-lg">
          <CardHeader className="text-center pb-2">
            <img src="/logo-red-mid.png" alt="1KLeaders" className="h-12 mx-auto mb-3 object-contain" />
            <CardTitle className="text-xl text-[#222]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Welcome Back
            </CardTitle>
            <p className="text-sm text-[#7e7e7e] mt-1">Sign in to your 1K Leaders account</p>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">

            {resetSent && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                Password reset email sent. Check your inbox.
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#222] font-medium text-sm">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-[#7e7e7e]" />
                <Input
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10 border-[#f0f0f0] focus:border-[#e33b5f] h-11"
                  value={email}
                  onChange={e => setEmail(e.target.value.replace(/\s/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[#222] font-medium text-sm">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowReset(v => !v)}
                  className="text-xs text-[#e33b5f] hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-[#7e7e7e]" />
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 border-[#f0f0f0] focus:border-[#e33b5f] h-11"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-3 text-[#7e7e7e]">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showReset && (
              <div className="p-3 bg-[#f6f6f6] rounded-lg border border-[#f0f0f0] space-y-2">
                <p className="text-xs text-[#7e7e7e]">Enter your email above and click below to receive a password reset link.</p>
                <Button size="sm" variant="outline" onClick={handleForgotPassword} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : null}
                  Send Reset Email
                </Button>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90 text-white font-bold h-11 text-base"
              onClick={handleSignIn}
              disabled={loading}
              style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
                : 'Sign In'
              }
            </Button>

            <Separator className="bg-[#f0f0f0]" />
            <div className="text-center">
              <p className="text-sm text-[#7e7e7e]">
                Don&apos;t have an account?{' '}
                <button onClick={() => navigate('waitlist')} className="text-[#e33b5f] font-medium hover:underline">Join the Waitlist</button>
              </p>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-[#7e7e7e] mt-4">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
