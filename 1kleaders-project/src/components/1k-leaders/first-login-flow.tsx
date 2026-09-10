'use client';
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Check, Lock, User, FileText, LayoutDashboard, Eye, EyeOff, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const STEPS = [
  { id: 1, label: 'Set Password',   icon: Lock },
  { id: 2, label: 'Platform Terms', icon: FileText },
  { id: 3, label: 'Your Profile',   icon: User },
  { id: 4, label: 'All Set',        icon: LayoutDashboard },
];

export default function FirstLoginFlow({ onComplete }: { onComplete: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [step,          setStep]        = useState(1);
  const [password,      setPassword]    = useState('');
  const [confirm,       setConfirm]     = useState('');
  const [showPw,        setShowPw]      = useState(false);
  const [termsAccepted, setTerms]       = useState(false);
  const [loading,       setLoading]     = useState(false);
  const [error,         setError]       = useState<string | null>(null);

  // Step 3
  const [bio,           setBio]         = useState(profile?.bio ?? '');
  const [photoUrl,      setPhotoUrl]    = useState(profile?.profile_photo_url ?? '');
  const [uploading,     setUploading]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function uploadPhoto(file: File) {
    setUploading(true);
    const ext  = file.name.split('.').pop();
    const path = `avatars/${profile!.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setPhotoUrl(publicUrl);
    }
    setUploading(false);
  }

  async function handleProfile() {
    setError(null);
    setLoading(true);
    await supabase.from('profiles').update({
      bio:               bio.trim() || null,
      profile_photo_url: photoUrl   || null,
      is_first_login:    false,
      updated_at:        new Date().toISOString(),
    }).eq('id', profile!.id);
    setLoading(false);
    await refreshProfile();
    setStep(4);
  }

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex items-center justify-center p-4"
      style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      <div className="max-w-lg w-full space-y-6">

        {/* Logo + heading */}
        <div className="text-center">
          <img src="/logos/logos_1KL-Hub_Horizontal_Dark.png" alt="1KL Hub" className="h-8 mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-[#222]">Welcome to 1K Leaders</h1>
          <p className="text-[#7e7e7e] text-sm mt-1">Let's get your account set up</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between gap-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                step > s.id   ? 'bg-[#e33b5f] text-white' :
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
            <CardTitle className="text-lg text-[#222]">{STEPS[step - 1].label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Step 1 — Set Password */}
            {step === 1 && (
              <>
                <p className="text-sm text-[#7e7e7e]">Choose a secure password for your account.</p>
                <div>
                  <Label className="text-[#222]">New Password</Label>
                  <div className="relative mt-1">
                    <Input type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                      className="pr-10 border-[#f0f0f0]" value={password}
                      onChange={e => setPassword(e.target.value)} />
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
                    onKeyDown={e => e.key === 'Enter' && handlePasswordReset()} />
                </div>
                {error && <p className="text-sm text-[#e33b5f]">{error}</p>}
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold"
                  onClick={handlePasswordReset} disabled={loading}>
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
                  <input type="checkbox" className="mt-0.5 accent-[#e33b5f]"
                    checked={termsAccepted} onChange={e => setTerms(e.target.checked)} />
                  <span className="text-sm text-[#555353]">I have read and agree to the platform confidentiality terms and conditions.</span>
                </label>
                {error && <p className="text-sm text-[#e33b5f]">{error}</p>}
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold"
                  onClick={handleTerms}>
                  Accept & Continue
                </Button>
              </>
            )}

            {/* Step 3 — Profile Photo + Bio only */}
            {step === 3 && (
              <>
                <p className="text-sm text-[#7e7e7e]">Add a profile photo and a short bio so the community knows who you are. You can always update these later.</p>

                {/* Profile photo */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-[#e33b5f]/10 flex items-center justify-center border-2 border-[#f0f0f0]">
                      {photoUrl
                        ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                        : <User className="w-10 h-10 text-[#e33b5f]/40" />
                      }
                    </div>
                    <button onClick={() => fileRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#e33b5f] flex items-center justify-center shadow-lg hover:bg-[#c02d4f] transition">
                      {uploading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.target.value = ''; }} />
                  <button onClick={() => fileRef.current?.click()}
                    className="text-xs text-[#e33b5f] hover:underline">
                    {photoUrl ? 'Change photo' : 'Upload profile photo'}
                  </button>
                </div>

                {/* Bio */}
                <div>
                  <Label className="text-[#222]">Short Bio <span className="text-[#9e9e9e] font-normal">(optional)</span></Label>
                  <textarea
                    className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none"
                    rows={3} placeholder="Tell the community about yourself..."
                    value={bio} onChange={e => setBio(e.target.value)} />
                </div>

                {error && <p className="text-sm text-[#e33b5f]">{error}</p>}
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold"
                  onClick={handleProfile} disabled={loading}>
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save & Continue'}
                </Button>
                <button onClick={handleProfile} className="w-full text-xs text-[#9e9e9e] hover:text-[#555353] transition">
                  Skip for now
                </button>
              </>
            )}

            {/* Step 4 — All Set */}
            {step === 4 && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#e33b5f]/10 flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-[#e33b5f]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#222]">You're all set, {profile?.first_name}!</h3>
                  <p className="text-sm text-[#7e7e7e] mt-1">Your account is ready. Welcome to 1K Leaders.</p>
                </div>
                <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold"
                  onClick={onComplete}>
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
