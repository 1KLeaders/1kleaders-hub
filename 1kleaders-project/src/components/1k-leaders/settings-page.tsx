'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Lock, Bell, Shield, Save, Loader2, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

const industries = [
  'Advanced Manufacturing','Aerospace','Agriculture','Agtech','Education','Energy',
  'Enterprise & AI','Financial Services','Fintech','Food & Beverage','Healthcare & Wellness',
  'Logistics and Supply Chain','Media & Advertising','Medtech','Mobility','Real Estate Tech',
  'Robotics','Security','Smart Cities','Sustainability','Technology','Tourism','Other',
];

const jobLevels = ['C-Level','EVP/SVP','VP','Director','Manager','Associate','Co-Founder','Other'];

const expertiseDomains = [
  'Marketing','Technology','Finance','Strategy and Management','Operations','Legal',
  'Compliance and Risk','Sales','Human Resources','Product Development','Data Analytics','Other',
];

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();

  // Profile fields
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [phone,        setPhone]        = useState('');
  const [city,         setCity]         = useState('');
  const [country,      setCountry]      = useState('');
  const [linkedin,     setLinkedin]     = useState('');
  const [bio,          setBio]          = useState('');
  const [orgName,      setOrgName]      = useState('');
  const [orgWebsite,   setOrgWebsite]   = useState('');
  const [jobTitle,     setJobTitle]     = useState('');
  const [jobLevel,     setJobLevel]     = useState('');
  const [yearsExp,     setYearsExp]     = useState<number | ''>('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedExpertise,  setSelectedExpertise]  = useState<string[]>([]);
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);

  // Password fields
  const [newPassword,  setNewPassword]  = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [showPw,       setShowPw]       = useState(false);

  // UI state
  const [saving,       setSaving]       = useState(false);
  const [savingPw,     setSavingPw]     = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved,      setPwSaved]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [pwError,      setPwError]      = useState<string | null>(null);

  // Populate fields from profile
  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name   ?? '');
    setLastName(profile.last_name     ?? '');
    setPhone(`${profile.phone_country_code ?? ''} ${profile.phone_number ?? ''}`.trim());
    setCity(profile.city              ?? '');
    setCountry(profile.country        ?? '');
    setLinkedin(profile.linkedin_url  ?? '');
    setBio(profile.bio                ?? '');
    setOrgName(profile.org_name       ?? '');
    setOrgWebsite(profile.org_website ?? '');
    setJobTitle(profile.job_title     ?? '');
    setJobLevel(profile.job_level     ?? '');
    setYearsExp(profile.years_experience ?? '');
    setSelectedIndustries(profile.org_industries ?? []);
    setSelectedExpertise(profile.expertise_domains ?? []);
    setWhatsappOptIn(profile.whatsapp_opt_in ?? false);
  }, [profile]);

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item]);
  };

  async function saveProfile() {
    if (!profile) return;
    setError(null);
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name:        firstName.trim()  || null,
        last_name:         lastName.trim()   || null,
        city:              city.trim()       || null,
        country:           country.trim()    || null,
        linkedin_url:      linkedin.trim()   || null,
        bio:               bio.trim()        || null,
        org_name:          orgName.trim()    || null,
        org_website:       orgWebsite.trim() || null,
        job_title:         jobTitle.trim()   || null,
        job_level:         jobLevel         || null,
        years_experience:  yearsExp !== ''   ? Number(yearsExp) : null,
        org_industries:    selectedIndustries,
        expertise_domains: selectedExpertise,
        whatsapp_opt_in:   whatsappOptIn,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) return setError(error.message);
    await refreshProfile();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  async function savePassword() {
    setPwError(null);
    if (newPassword.length < 8) return setPwError('Password must be at least 8 characters.');
    if (newPassword !== confirmPw) return setPwError('Passwords do not match.');
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPw(false);
    if (error) return setPwError(error.message);
    setNewPassword('');
    setConfirmPw('');
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3000);
  }

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">Settings</h1>
        <p className="text-[#7e7e7e]">Manage your account preferences and profile</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-[#f6f6f6] p-1 rounded-lg">
          {[
            { value: 'profile',       label: 'Profile',       icon: User },
            { value: 'account',       label: 'Account',       icon: Lock },
            { value: 'notifications', label: 'Notifications', icon: Bell },
            { value: 'privacy',       label: 'Privacy',       icon: Shield },
          ].map(t => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs data-[state=active]:bg-white">
              <t.icon className="w-3 h-3 mr-1" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base">Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-lg font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm" disabled>Change Photo</Button>
                  <p className="text-xs text-[#9e9e9e] mt-1">Photo upload coming soon</p>
                </div>
              </div>

              <Separator />
              <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Personal</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>First Name <span className="text-[#e33b5f]">*</span></Label>
                  <Input className="mt-1 border-[#f0f0f0]" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label>Last Name <span className="text-[#e33b5f]">*</span></Label>
                  <Input className="mt-1 border-[#f0f0f0]" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>City</Label>
                  <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. Dubai" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. UAE" value={country} onChange={e => setCountry(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>LinkedIn URL</Label>
                <Input className="mt-1 border-[#f0f0f0]" placeholder="https://linkedin.com/in/you" value={linkedin} onChange={e => setLinkedin(e.target.value.replace(/\s/g, ''))} />
              </div>
              <div>
                <Label>Bio</Label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none"
                  rows={3}
                  placeholder="Tell the community about yourself..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                />
              </div>

              <Separator />
              <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Organization</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Company / Organization</Label>
                  <Input className="mt-1 border-[#f0f0f0]" value={orgName} onChange={e => setOrgName(e.target.value)} />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input className="mt-1 border-[#f0f0f0]" placeholder="https://..." value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Job Title</Label>
                  <Input className="mt-1 border-[#f0f0f0]" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                </div>
                <div>
                  <Label>Job Level</Label>
                  <Select value={jobLevel} onValueChange={setJobLevel}>
                    <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{jobLevels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Years of Experience</Label>
                <Input
                  type="number" min={0} max={60} className="mt-1 border-[#f0f0f0] w-32"
                  value={yearsExp} onChange={e => setYearsExp(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)))}
                />
              </div>

              <div>
                <Label className="mb-2 block">Industry / Sector</Label>
                <div className="flex flex-wrap gap-2">
                  {industries.map(ind => (
                    <button key={ind} type="button" onClick={() => toggleItem(selectedIndustries, setSelectedIndustries, ind)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${selectedIndustries.includes(ind) ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Expertise Domains</Label>
                <div className="flex flex-wrap gap-2">
                  {expertiseDomains.map(d => (
                    <button key={d} type="button" onClick={() => toggleItem(selectedExpertise, setSelectedExpertise, d)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${selectedExpertise.includes(d) ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={saveProfile} disabled={saving}>
                {saving    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                : profileSaved ? <><Check className="w-4 h-4 mr-2" />Saved!</>
                : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Account Tab ── */}
        <TabsContent value="account">
          <Card>
            <CardHeader><CardTitle className="text-base">Account Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email Address</Label>
                <Input className="mt-1 border-[#f0f0f0] bg-[#f6f6f6]" value={profile?.email ?? ''} disabled />
                <p className="text-xs text-[#9e9e9e] mt-1">Contact an admin to change your email address.</p>
              </div>
              <Separator />
              <p className="text-sm font-medium text-[#222]">Change Password</p>
              <div>
                <Label>New Password</Label>
                <div className="relative mt-1">
                  <Input type={showPw ? 'text' : 'password'} className="border-[#f0f0f0] pr-10" placeholder="Min. 8 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-2.5 text-[#9e9e9e]">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input type="password" className="mt-1 border-[#f0f0f0]" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
              </div>
              {pwError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{pwError}
                </div>
              )}
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={savePassword} disabled={savingPw}>
                {savingPw  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</>
                : pwSaved   ? <><Check className="w-4 h-4 mr-2" />Password Updated!</>
                : <><Save className="w-4 h-4 mr-2" />Update Password</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Notifications Tab ── */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Email Notifications',   desc: 'Receive updates via email' },
                { label: 'Action Required Alerts', desc: 'High-priority admin notifications' },
                { label: 'Platform Notifications', desc: 'In-app notification alerts' },
                { label: 'Calendar Reminders',     desc: 'Meeting and event reminders' },
                { label: 'Partner Activity',       desc: 'Notifications about partner actions' },
              ].map(n => (
                <div key={n.label} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                  <div><p className="font-medium text-sm">{n.label}</p><p className="text-xs text-[#7e7e7e]">{n.desc}</p></div>
                  <Switch defaultChecked />
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">WhatsApp Notifications</p>
                  <p className="text-xs text-[#7e7e7e]">Receive action-required alerts via WhatsApp</p>
                </div>
                <Switch checked={whatsappOptIn} onCheckedChange={setWhatsappOptIn} />
              </div>
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={saveProfile} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Preferences</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Privacy Tab ── */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader><CardTitle className="text-base">Privacy Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Profile Visibility',     desc: 'Make your profile visible to other members' },
                { label: 'Activity Status',         desc: 'Show when you are online' },
                { label: 'Investment Visibility',   desc: 'Allow partners to see your investment activity' },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                  <div><p className="font-medium text-sm">{p.label}</p><p className="text-xs text-[#7e7e7e]">{p.desc}</p></div>
                  <Switch defaultChecked />
                </div>
              ))}
              <p className="text-xs text-[#9e9e9e]">Privacy preferences will be saved to your profile in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
