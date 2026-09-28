'use client';
// "Your Details" — the same information the public registration (waitlist) page collects.
// Asked after first login for accounts created by the admin-started onboarding (profiles.needs_registration).
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { industries, expertiseDomains, jobLevels, leaderProfiles, genders, countries, phonePrefixes } from './waitlist-form';

// preview: developer walkthrough — validates but doesn't save
export default function RegistrationDetailsStep({ onDone, preview }: { onDone: () => void; preview?: boolean }) {
  const { profile, refreshProfile } = useAuth();
  const p = profile as any;

  const [firstName, setFirstName] = useState<string>(p?.first_name ?? '');
  const [lastName,  setLastName]  = useState<string>(p?.last_name ?? '');
  const [phoneCountry, setPhoneCountry] = useState<string>(p?.phone_country_code || 'AE(+971)');
  const [phone,     setPhone]     = useState<string>(p?.phone_number ?? '');
  const [linkedin,  setLinkedin]  = useState<string>(p?.linkedin_url ?? '');
  const [orgName,   setOrgName]   = useState<string>(p?.org_name ?? '');
  const [orgWebsite, setOrgWebsite] = useState<string>(p?.org_website ?? '');
  const [orgCountry, setOrgCountry] = useState<string>(p?.org_country ?? '');
  const [jobTitle,  setJobTitle]  = useState<string>(p?.job_title ?? '');
  const [jobLevel,  setJobLevel]  = useState<string>(p?.job_level ?? '');
  const [years,     setYears]     = useState<string>(p?.years_experience?.toString() ?? '');
  const [nationality, setNationality] = useState<string>(p?.nationality ?? '');
  const [gender,    setGender]    = useState<string>(p?.gender ?? '');
  const [dob,       setDob]       = useState<string>(p?.date_of_birth ?? '');
  const [city,      setCity]      = useState<string>(p?.city ?? '');
  const [country,   setCountry]   = useState<string>(p?.country ?? '');
  const [selIndustries, setSelIndustries] = useState<string[]>(p?.org_industries ?? []);
  const [selExpertise,  setSelExpertise]  = useState<string[]>(p?.expertise_domains ?? []);
  const [selProfiles,   setSelProfiles]   = useState<string[]>(p?.leader_profiles ?? []);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  async function save() {
    if (!profile) return;
    const missing = [
      !firstName.trim() && 'first name', !lastName.trim() && 'last name', !phone.trim() && 'phone',
      !nationality && 'nationality', !dob && 'date of birth', !orgName.trim() && 'organisation',
      !jobLevel && 'job level', selExpertise.length === 0 && 'expertise',
    ].filter(Boolean);
    if (missing.length) return setError(`Please fill in: ${missing.join(', ')}.`);
    if (preview) return onDone();
    setSaving(true); setError(null);
    const { error } = await supabase.from('profiles').update({
      first_name: firstName.trim(), last_name: lastName.trim(),
      phone_country_code: phoneCountry, phone_number: phone.trim(),
      linkedin_url: linkedin.trim() || null, org_name: orgName.trim(), org_website: orgWebsite.trim() || null,
      org_country: orgCountry || null, org_industries: selIndustries, job_title: jobTitle.trim() || null,
      job_level: jobLevel, years_experience: years ? Number(years) : null,
      nationality, gender: gender || null, date_of_birth: dob, city: city.trim() || null, country: country || null,
      expertise_domains: selExpertise, leader_profiles: selProfiles,
      needs_registration: false, updated_at: new Date().toISOString(),
    }).eq('id', profile.id);
    setSaving(false);
    if (error) return setError(error.message);
    await refreshProfile();
    onDone();
  }

  const chip = (on: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-medium border transition flex items-center gap-1 ${on ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`;
  const req = <span className="text-[#e33b5f]">*</span>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#7e7e7e]">Tell us about yourself. This is the same information we ask everyone who registers with 1K Leaders.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label className="text-[#222] text-xs">First name {req}</Label><Input className="mt-1 border-[#f0f0f0]" value={firstName} onChange={e => setFirstName(e.target.value)} /></div>
        <div><Label className="text-[#222] text-xs">Last name {req}</Label><Input className="mt-1 border-[#f0f0f0]" value={lastName} onChange={e => setLastName(e.target.value)} /></div>
        <div className="sm:col-span-2">
          <Label className="text-[#222] text-xs">Phone {req}</Label>
          <div className="flex gap-2 mt-1">
            <Select value={phoneCountry} onValueChange={setPhoneCountry}>
              <SelectTrigger className="w-32 border-[#f0f0f0]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60">{phonePrefixes.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
            </Select>
            <Input className="flex-1 border-[#f0f0f0]" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <div className="sm:col-span-2"><Label className="text-[#222] text-xs">LinkedIn</Label><Input className="mt-1 border-[#f0f0f0]" placeholder="https://linkedin.com/in/..." value={linkedin} onChange={e => setLinkedin(e.target.value)} /></div>
        <div><Label className="text-[#222] text-xs">Date of birth {req}</Label><Input className="mt-1 border-[#f0f0f0]" type="date" value={dob} onChange={e => setDob(e.target.value)} /></div>
        <div>
          <Label className="text-[#222] text-xs">Gender</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{genders.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#222] text-xs">Nationality {req}</Label>
          <Select value={nationality} onValueChange={setNationality}>
            <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="max-h-60">{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#222] text-xs">Country of residence</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="max-h-60">{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2"><Label className="text-[#222] text-xs">City</Label><Input className="mt-1 border-[#f0f0f0]" value={city} onChange={e => setCity(e.target.value)} /></div>
      </div>

      <div className="border-t border-[#f0f0f0] pt-4 grid sm:grid-cols-2 gap-3">
        <div><Label className="text-[#222] text-xs">Organisation {req}</Label><Input className="mt-1 border-[#f0f0f0]" value={orgName} onChange={e => setOrgName(e.target.value)} /></div>
        <div><Label className="text-[#222] text-xs">Organisation website</Label><Input className="mt-1 border-[#f0f0f0]" value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} /></div>
        <div><Label className="text-[#222] text-xs">Job title</Label><Input className="mt-1 border-[#f0f0f0]" value={jobTitle} onChange={e => setJobTitle(e.target.value)} /></div>
        <div>
          <Label className="text-[#222] text-xs">Job level {req}</Label>
          <Select value={jobLevel} onValueChange={setJobLevel}>
            <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>{jobLevels.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[#222] text-xs">Organisation country</Label>
          <Select value={orgCountry} onValueChange={setOrgCountry}>
            <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent className="max-h-60">{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="text-[#222] text-xs">Years of experience</Label><Input className="mt-1 border-[#f0f0f0]" type="number" min={0} value={years} onChange={e => setYears(e.target.value)} /></div>
      </div>

      <div>
        <Label className="text-[#222] text-xs">Industries</Label>
        <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto">
          {industries.map(i => <button key={i} type="button" className={chip(selIndustries.includes(i))} onClick={() => toggle(selIndustries, setSelIndustries, i)}>{selIndustries.includes(i) && <Check className="w-3 h-3" />}{i}</button>)}
        </div>
      </div>
      <div>
        <Label className="text-[#222] text-xs">Expertise (where would you like to innovate?) {req}</Label>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {expertiseDomains.map(d => <button key={d} type="button" className={chip(selExpertise.includes(d))} onClick={() => toggle(selExpertise, setSelExpertise, d)}>{selExpertise.includes(d) && <Check className="w-3 h-3" />}{d}</button>)}
        </div>
      </div>
      <div>
        <Label className="text-[#222] text-xs">Which describes you?</Label>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {leaderProfiles.map(lp => {
            const on = selProfiles.includes(lp.value);
            return (
              <button key={lp.value} type="button" onClick={() => toggle(selProfiles, setSelProfiles, lp.value)}
                className={`text-left p-3 rounded-lg border transition ${on ? 'border-[#e33b5f] bg-[#e33b5f]/5' : 'border-[#f0f0f0] hover:border-[#e33b5f]/30'}`}>
                <p className="text-sm font-semibold text-[#222]">{lp.label}</p>
                <p className="text-xs text-[#7e7e7e]">{lp.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-[#e33b5f]">{error}</p>}
      <Button className="w-full bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white font-bold" onClick={save} disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save & Continue'}
      </Button>
    </div>
  );
}
