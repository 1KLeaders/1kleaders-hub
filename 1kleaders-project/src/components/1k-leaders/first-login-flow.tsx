'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Check, Lock, User, FileText, LayoutDashboard, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const STEPS = [
  { id: 1, label: 'Set Password',    icon: Lock },
  { id: 2, label: 'Platform Terms',  icon: FileText },
  { id: 3, label: 'Your Profile',    icon: User },
  { id: 4, label: 'All Set',         icon: LayoutDashboard },
];

export default function FirstLoginFlow({ onComplete }: { onComplete: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [step,        setStep]       = useState(1);
  const [password,    setPassword]   = useState('');
  const [confirm,     setConfirm]    = useState('');
  const [showPw,      setShowPw]     = useState(false);
  const [termsAccepted, setTerms]    = useState(false);
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState<string | null>(null);

  // Step 3 profile fields
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName,  setLastName]  = useState(profile?.last_name  ?? '');
  const [bio,       setBio]       = useState(profile?.bio        ?? '');
  const [linkedin,  setLinkedin]  = useState(profile?.linkedin_url ?? '');
  const [city,      setCity]      = useState(profile?.city       ?? '');

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  async function handlePasswordReset() {
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setStep(2);
  }

  async function handleTerms() {
    if (!termsAccepted) return setError('You must accept the platform terms to continue.');
    setError(null);
    setStep(3);
  }

  async function handleProfile() {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) return setError('First and last name are required.');
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        bio:        bio.trim() || null,
        linkedin_url: linkedin.trim() || null,
        city:       city.trim() || null,
        is_first_login: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile!.id);
    setLoading(false);
    if (error) return setError(error.message);
    await refreshProfile();
    setStep(4);
  }

  async function handleFinish() {
    onComplete();
  }

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex items-center justify-center p-4" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <img src="/logo-red-mid.png" alt="1KLeaders" className="h-10 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-[#222]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
            Welcome to 1K Leaders
          </h1>
          <p className="text-[#7e7e7e] text-sm mt-1">Let's get your account set up</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                step > s.id  ? 'bg-[#e33b5f] text-white' :
                step === s.id ? 'bg-[#e33b5f] text-white ring-4 ring-[#e33b5f]/20' :
                'bg-[#f0f0f0] text-[#9e9e9e]'
              }`}>
                {step > s.id ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 transition-all ${step > s.id ? 'bg-[#e33b5f]' : 'bg-[#f0f0f0]'}`} />
              )}
            </div>
          ))}
        </div>
        <Progress value={progress} className="h-1" />

        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#222]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              {STEPS[step - 1].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Step 1 — Set Password */}
            {step === 1 && (
              <>
                <p className="text-sm text-[#7e7e7e]">Choose a secure password for your account. You won't be able to use the temporary password after this.</p>
                <div>
                  <Label className="text-[#222]">New Password</Label>
                  <div className="relative mt-1">
                    <Input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters" className="pr-10 border-[#f0f0f0]" value={password} onChange={e => setPassword(e.target.value)} />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-2.5 text-[#9e9e9e]">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">Confirm Password</Label>
                  <Input type="password" placeholder="Repeat password" className="mt-1 border-[#f0f0f0]" value={confirm} onChange={e => setConfirm(e.target.value)} />
                </div>
                {error && <p className="text-sm text-[#e33b5f]">{error}</p>}
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold" onClick={handlePasswordReset} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Set Password & Continue'}
                </Button>
              </>
            )}

            {/* Step 2 — Platform Terms */}
            {step === 2 && (
              <>
                <div className="bg-[#f6f6f6] rounded-lg p-4 text-xs text-[#555353] space-y-2 max-h-48 overflow-y-auto border border-[#f0f0f0]">
                  <p className="font-semibold text-[#222]">Platform Confidentiality & Terms of Use</p>
                  <p>All information, documents, ideas, startup profiles, and discussions on this platform are strictly confidential. By accessing this platform, you agree not to share, reproduce, or distribute any content without prior written consent from 1KL Holdings Limited.</p>
                  <p>As a partner or member, you acknowledge that any ideas submitted or discussed within the platform remain subject to the terms outlined in your signed partner agreement.</p>
                  <p>Violation of these terms may result in immediate suspension of your account and legal action in accordance with the laws of Abu Dhabi Global Markets (ADGM).</p>
                  <p>This platform is operated by 1KL Holdings Limited, a Special Purpose Vehicle incorporated under ADGM, Company Registration No: 34946.</p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 accent-[#e33b5f]" checked={termsAccepted} onChange={e => setTerms(e.target.checked)} />
                  <span className="text-sm text-[#555353]">I have read and agree to the platform confidentiality terms and conditions.</span>
                </label>
                {error && <p className="text-sm text-[#e33b5f]">{error}</p>}
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold" onClick={handleTerms}>
                  Accept & Continue
                </Button>
              </>
            )}

            {/* Step 3 — Profile */}
            {step === 3 && (
              <>
                <p className="text-sm text-[#7e7e7e]">Fill in your basic profile details. You can update everything else later from your profile page.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[#222]">First Name <span className="text-[#e33b5f]">*</span></Label>
                    <Input className="mt-1 border-[#f0f0f0]" value={firstName} onChange={e => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-[#222]">Last Name <span className="text-[#e33b5f]">*</span></Label>
                    <Input className="mt-1 border-[#f0f0f0]" value={lastName} onChange={e => setLastName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-[#222]">City</Label>
                  <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. Dubai" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <Label className="text-[#222]">LinkedIn URL</Label>
                  <Input className="mt-1 border-[#f0f0f0]" placeholder="https://linkedin.com/in/you" value={linkedin} onChange={e => setLinkedin(e.target.value.replace(/\s/g, ''))} />
                </div>
                <div>
                  <Label className="text-[#222]">Short Bio</Label>
                  <textarea className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none" rows={3} placeholder="Tell the community about yourself..." value={bio} onChange={e => setBio(e.target.value)} />
                </div>
                {error && <p className="text-sm text-[#e33b5f]">{error}</p>}
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold" onClick={handleProfile} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save Profile & Continue'}
                </Button>
              </>
            )}

            {/* Step 4 — All Set */}
            {step === 4 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#e33b5f]/10 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-[#e33b5f]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#222]">You're all set, {firstName}!</h3>
                  <p className="text-sm text-[#7e7e7e] mt-1">Your account is ready. Welcome to 1K Leaders.</p>
                </div>
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold" onClick={handleFinish}>
                  Go to My Dashboard
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
}
