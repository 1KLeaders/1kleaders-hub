'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Rocket, Edit, Save, Loader2, Check, Globe, Linkedin, Users, Target, DollarSign, Calendar, FileText, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

const stages = ['Idea', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth', 'Exit'];
const sectors = ['Technology','FinTech','HealthTech','EdTech','CleanTech','PropTech','AgTech','Logistics','Media','Other'];

export default function StartupPage() {
  const { profile, refreshProfile } = useAuth();
  const isFounder = profile?.subroles?.includes('founder');

  const [editing, setEditing] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Startup fields — stored in profile's org fields + a startup_data JSON column
  // For now we use existing profile fields + local state for extras
  const [name,        setName]        = useState(profile?.org_name          ?? '');
  const [website,     setWebsite]     = useState(profile?.org_website        ?? '');
  const [sector,      setSector]      = useState(profile?.org_industries?.[0] ?? '');
  const [stage,       setStage]       = useState('Seed');
  const [tagline,     setTagline]     = useState('');
  const [problem,     setProblem]     = useState('');
  const [solution,    setSolution]    = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [newMember,   setNewMember]   = useState('');
  const [linkedin,    setLinkedin]    = useState(profile?.linkedin_url ?? '');
  const [seeking,     setSeeking]     = useState('');

  const addMember = () => {
    if (newMember.trim()) { setTeamMembers(p => [...p, newMember.trim()]); setNewMember(''); }
  };
  const removeMember = (i: number) => setTeamMembers(p => p.filter((_, idx) => idx !== i));

  async function save() {
    if (!profile) return;
    setSaving(true);
    await supabase.from('profiles').update({
      org_name:     name.trim() || null,
      org_website:  website.trim() || null,
      org_industries: sector ? [sector] : [],
      linkedin_url: linkedin.trim() || null,
      updated_at:   new Date().toISOString(),
    }).eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!isFounder) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Rocket className="w-12 h-12 text-[#9e9e9e]" />
        <h2 className="text-xl font-bold text-[#222]">Founder Access Required</h2>
        <p className="text-[#7e7e7e] max-w-sm">Your startup page is available to users with the Founder badge. Contact an admin to have it added to your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#222]">{name || 'My Startup'}</h1>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs mt-0.5">🚀 Founder</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="w-4 h-4" /> Saved</span>}
          {!editing
            ? <Button variant="outline" onClick={() => setEditing(true)}><Edit className="w-4 h-4 mr-2" />Edit Startup</Button>
            : <>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={save} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                </Button>
              </>
          }
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <Card className="lg:col-span-2 border-[#f0f0f0]">
          <CardHeader className="pb-3"><CardTitle className="text-base">Startup Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Startup Name</Label><Input className="mt-1 border-[#f0f0f0]" value={name} onChange={e => setName(e.target.value)} /></div>
                  <div><Label>Stage</Label>
                    <Select value={stage} onValueChange={setStage}>
                      <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Tagline</Label><Input className="mt-1 border-[#f0f0f0]" placeholder="One-sentence pitch" value={tagline} onChange={e => setTagline(e.target.value)} /></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Sector</Label>
                    <Select value={sector} onValueChange={setSector}>
                      <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Website</Label><Input className="mt-1 border-[#f0f0f0]" placeholder="https://..." value={website} onChange={e => setWebsite(e.target.value)} /></div>
                </div>
                <div><Label>LinkedIn</Label><Input className="mt-1 border-[#f0f0f0]" placeholder="https://linkedin.com/company/..." value={linkedin} onChange={e => setLinkedin(e.target.value)} /></div>
                <Separator />
                <div><Label>Problem</Label>
                  <textarea className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none" rows={3} placeholder="What problem are you solving?" value={problem} onChange={e => setProblem(e.target.value)} />
                </div>
                <div><Label>Solution</Label>
                  <textarea className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none" rows={3} placeholder="How are you solving it?" value={solution} onChange={e => setSolution(e.target.value)} />
                </div>
                <div><Label>What are you seeking?</Label>
                  <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. $500K seed funding, technical co-founder" value={seeking} onChange={e => setSeeking(e.target.value)} />
                </div>
                <Separator />
                <div>
                  <Label className="mb-2 block">Team Members</Label>
                  <div className="flex gap-2 mb-2">
                    <Input className="border-[#f0f0f0] flex-1" placeholder="Name, Role" value={newMember} onChange={e => setNewMember(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMember()} />
                    <Button size="sm" variant="outline" onClick={addMember}><Plus className="w-4 h-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {teamMembers.map((m, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 bg-[#f6f6f6] rounded-full text-xs text-[#444]">
                        {m} <button onClick={() => removeMember(i)}><X className="w-3 h-3 text-[#9e9e9e] hover:text-red-500" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {tagline && <p className="text-[#555353] italic">"{tagline}"</p>}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Stage',   value: stage,   icon: Target },
                    { label: 'Sector',  value: sector || '—',  icon: Rocket },
                    { label: 'Seeking', value: seeking || '—', icon: DollarSign },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                      <p className="text-xs text-[#9e9e9e] mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-[#222] truncate">{value}</p>
                    </div>
                  ))}
                </div>
                {problem && (
                  <>
                    <Separator />
                    <div><p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Problem</p><p className="text-sm text-[#444]">{problem}</p></div>
                  </>
                )}
                {solution && (
                  <div><p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Solution</p><p className="text-sm text-[#444]">{solution}</p></div>
                )}
                {teamMembers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Team</p>
                      <div className="flex flex-wrap gap-2">
                        {teamMembers.map((m, i) => <Badge key={i} variant="secondary" className="text-xs">{m}</Badge>)}
                      </div>
                    </div>
                  </>
                )}
                {!tagline && !problem && !solution && teamMembers.length === 0 && (
                  <p className="text-sm text-[#9e9e9e] text-center py-4">Click "Edit Startup" to fill in your startup details.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="border-[#f0f0f0]">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Links</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {website
                ? <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#e33b5f] hover:underline"><Globe className="w-4 h-4" />{website}</a>
                : <p className="text-xs text-[#9e9e9e]">No website added</p>
              }
              {linkedin && <a href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#0077b5] hover:underline"><Linkedin className="w-4 h-4" />LinkedIn</a>}
            </CardContent>
          </Card>
          <Card className="border-[#f0f0f0]">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-[#9e9e9e] mb-3">Upload your pitch deck, Lean Canvas, or other documents.</p>
              <Button variant="outline" size="sm" className="w-full" disabled><FileText className="w-4 h-4 mr-2" />Upload Document</Button>
              <p className="text-xs text-[#9e9e9e] mt-2 text-center">Document upload coming soon</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
