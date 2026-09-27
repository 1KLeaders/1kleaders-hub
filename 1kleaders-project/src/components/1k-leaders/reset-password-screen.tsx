'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

// Shown after a user opens the branded password-reset link (they are signed in via the recovery token)
export default function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const { profile, clearPasswordRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [done,     setDone]     = useState(false);

  async function handleSave() {
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
  }

  function finish() {
    clearPasswordRecovery();
    onDone();
  }

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex items-center justify-center p-4"
      style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <img src="/logos/logos_1KL-Hub_Horizontal_Dark.png" alt="1KL Hub" className="h-8 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-[#222]">Reset your password</h1>
          {profile?.email && <p className="text-[#7e7e7e] text-sm mt-1">for {profile.email}</p>}
        </div>

        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#222]">{done ? 'Password updated' : 'Choose a new password'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {done ? (
              <>
                <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  Your password has been changed. Use it next time you sign in.
                </div>
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold" onClick={finish}>
                  Continue to 1KL Hub
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-[#222]">New Password</Label>
                  <div className="relative mt-1">
                    <Input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                      className="pr-10 border-[#f0f0f0]" value={password}
                      onChange={e => setPassword(e.target.value)} autoFocus />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-2.5 text-[#9e9e9e]">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Confirm Password</Label>
                  <Input type="password" placeholder="Repeat password"
                    className="mt-1 border-[#f0f0f0]" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()} />
                </div>
                {error && <p className="text-sm text-[#e33b5f]">{error}</p>}
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold"
                  onClick={handleSave} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save New Password'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
