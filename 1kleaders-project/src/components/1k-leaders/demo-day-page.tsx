'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Rocket, Calendar, MapPin, Plus, Loader2, RefreshCw,
  Lightbulb, Trophy, Clock, Star, Eye, EyeOff, Pencil, X, Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole } from './types';

interface Props { role?: DashboardRole; }

type DemoDay = {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  description: string | null;
  is_live: boolean;
  cohort_id: string | null;
};

type DemoStartup = {
  id: string;
  demo_day_id: string;
  idea_id: string | null;
  pitch_order: number | null;
  pitch_time_mins: number;
  status: string;
  idea?: {
    title: string;
    sector: string | null;
    tagline: string | null;
    vep_score: number | null;
    problem: string | null;
    solution: string | null;
    founder_name: string | null;
  };
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-[#f0f0f0] text-[#555353]',
  pitched:   'bg-blue-100 text-blue-700',
  winner:    'bg-yellow-100 text-yellow-700',
};

export default function DemoDayPage({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin = ['admin', 'super-admin', 'developer'].includes(role ?? '');

  const [demoDays,   setDemoDays]   = useState<DemoDay[]>([]);
  const [selected,   setSelected]   = useState<DemoDay | null>(null);
  const [startups,   setStartups]   = useState<DemoStartup[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingSt,  setLoadingSt]  = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);

  // Approved ideas for adding to demo day
  const [ideas,      setIdeas]      = useState<{ id: string; title: string }[]>([]);

  // Form
  const [fTitle, setFTitle] = useState('');
  const [fDate,  setFDate]  = useState('');
  const [fLoc,   setFLoc]   = useState('');
  const [fDesc,  setFDesc]  = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  // Add startup form
  const [addIdeaId,    setAddIdeaId]    = useState('');
  const [addingStartup, setAddingStartup] = useState(false);

  async function fetchDemoDays() {
    setLoading(true);
    const query = supabase.from('demo_day_events').select('*').order('date', { ascending: true });
    const { data } = isAdmin ? await query : await query.eq('is_live', true);
    setDemoDays((data ?? []) as DemoDay[]);

    // Fetch approved ideas for admin
    if (isAdmin) {
      const { data: ideaData } = await supabase.from('ideas').select('id, title').eq('status', 'Approved');
      setIdeas((ideaData ?? []) as { id: string; title: string }[]);
    }
    setLoading(false);
  }

  async function fetchStartups(demoDayId: string) {
    setLoadingSt(true);
    const { data } = await supabase
      .from('demo_day_startups')
      .select('*, ideas(title, sector, tagline, vep_score, problem, solution, founder_name)')
      .eq('demo_day_id', demoDayId)
      .order('pitch_order', { nullsFirst: false });
    setStartups((data ?? []).map((s: any) => ({ ...s, idea: s.ideas })) as DemoStartup[]);
    setLoadingSt(false);
  }

  useEffect(() => { fetchDemoDays(); }, []);

  async function saveEvent() {
    if (!fTitle.trim()) return;
    setSaving(true);
    const payload = { title: fTitle.trim(), date: fDate || null, location: fLoc.trim() || null, description: fDesc.trim() || null };
    if (editId) {
      const { data } = await supabase.from('demo_day_events').update(payload).eq('id', editId).select().single();
      if (data) setDemoDays(prev => prev.map(d => d.id === editId ? data as DemoDay : d));
    } else {
      const { data } = await supabase.from('demo_day_events').insert({ ...payload, is_live: false }).select().single();
      if (data) setDemoDays(prev => [...prev, data as DemoDay]);
    }
    setSaving(false);
    setShowForm(false); setEditId(null);
    setFTitle(''); setFDate(''); setFLoc(''); setFDesc('');
  }

  async function toggleLive(day: DemoDay) {
    await supabase.from('demo_day_events').update({ is_live: !day.is_live }).eq('id', day.id);
    setDemoDays(prev => prev.map(d => d.id === day.id ? { ...d, is_live: !d.is_live } : d));
    if (selected?.id === day.id) setSelected(prev => prev ? { ...prev, is_live: !prev.is_live } : prev);
  }

  async function addStartup() {
    if (!addIdeaId || !selected) return;
    setAddingStartup(true);
    const { data } = await supabase.from('demo_day_startups').insert({
      demo_day_id: selected.id, idea_id: addIdeaId,
      pitch_order: startups.length + 1, pitch_time_mins: 5, status: 'scheduled',
    }).select('*, ideas(title, sector, tagline, vep_score, problem, solution, founder_name)').single();
    if (data) setStartups(prev => [...prev, { ...data, idea: (data as any).ideas } as DemoStartup]);
    setAddIdeaId('');
    setAddingStartup(false);
  }

  async function updateStartupStatus(id: string, status: string) {
    await supabase.from('demo_day_startups').update({ status }).eq('id', id);
    setStartups(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }

  // ── SELECTED DEMO DAY VIEW ────────────────────────────────────
  if (selected) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-sm text-[#7e7e7e] hover:text-[#222]">← All Demo Days</button>
        </div>

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#111] to-[#333] p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#e33b5f]/10 rounded-full -translate-y-32 translate-x-32" />
          <p className="text-xs font-bold tracking-widest text-[#f07969] uppercase mb-3">Demo Day</p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">{selected.title}</h1>
          {selected.description && <p className="text-white/70 max-w-xl mb-4">{selected.description}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-white/60">
            {selected.date && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(selected.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
            {selected.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{selected.location}</span>}
          </div>
          {isAdmin && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs gap-1.5"
                onClick={() => toggleLive(selected)}>
                {selected.is_live ? <><EyeOff className="w-3.5 h-3.5" />Hide from Partners</> : <><Eye className="w-3.5 h-3.5" />Make Live</>}
              </Button>
            </div>
          )}
        </div>

        {/* Add startup — admin only */}
        {isAdmin && (
          <Card className="border-[#f0f0f0]">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Add Startup to Lineup</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Select value={addIdeaId} onValueChange={setAddIdeaId}>
                  <SelectTrigger className="flex-1 border-[#f0f0f0]"><SelectValue placeholder="Select an approved idea…" /></SelectTrigger>
                  <SelectContent>
                    {ideas.filter(i => !startups.some(s => s.idea_id === i.id)).map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="bg-[#e33b5f] text-white flex-shrink-0" onClick={addStartup} disabled={!addIdeaId || addingStartup}>
                  {addingStartup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Startups lineup */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#222] flex items-center gap-2">
            <Rocket className="w-5 h-5 text-[#e33b5f]" /> Pitch Lineup
            <Badge className="bg-[#f0f0f0] text-[#555353]">{startups.length} startups</Badge>
          </h2>
          {loadingSt ? (
            <div className="flex items-center gap-2 text-[#7e7e7e] py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : startups.length === 0 ? (
            <Card className="border-dashed border-[#f0f0f0]">
              <CardContent className="p-8 text-center">
                <Rocket className="w-10 h-10 text-[#9e9e9e] mx-auto mb-2" />
                <p className="text-sm text-[#9e9e9e]">{isAdmin ? 'Add startups to the lineup above.' : 'The lineup will be announced soon.'}</p>
              </CardContent>
            </Card>
          ) : startups.map((s, i) => (
            <Card key={s.id} className={`border-[#f0f0f0] overflow-hidden ${s.status === 'winner' ? 'border-yellow-300 border-2' : ''}`}>
              {s.status === 'winner' && (
                <div className="bg-yellow-50 px-4 py-1.5 flex items-center gap-2 border-b border-yellow-200">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                  <p className="text-xs font-bold text-yellow-700">Demo Day Winner</p>
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#e33b5f]/10 flex items-center justify-center font-bold text-[#e33b5f] flex-shrink-0">
                    {s.pitch_order ?? i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-bold text-[#222]">{s.idea?.title ?? 'Untitled'}</h3>
                        {s.idea?.tagline && <p className="text-sm text-[#7e7e7e] italic mt-0.5">"{s.idea.tagline}"</p>}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {s.idea?.sector && <Badge variant="secondary" className="text-xs">{s.idea.sector}</Badge>}
                          {s.idea?.founder_name && <span className="text-xs text-[#9e9e9e]">by {s.idea.founder_name}</span>}
                          {s.idea?.vep_score != null && (
                            <span className="text-xs font-medium text-purple-600 flex items-center gap-0.5">
                              <Star className="w-3 h-3" /> VEP: {s.idea.vep_score}/100
                            </span>
                          )}
                          <span className="text-xs text-[#9e9e9e] flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {s.pitch_time_mins} min
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <Select value={s.status} onValueChange={v => updateStartupStatus(s.id, v)}>
                          <SelectTrigger className={`w-36 h-7 text-xs ${statusColors[s.status] ?? ''}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="pitched">Pitched</SelectItem>
                            <SelectItem value="winner">Winner 🏆</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {!isAdmin && <Badge className={`text-xs ${statusColors[s.status] ?? ''}`}>{s.status}</Badge>}
                    </div>
                    {s.idea?.problem && <p className="text-xs text-[#7e7e7e] mt-2 line-clamp-2">{s.idea.problem}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ── DEMO DAY LIST VIEW ──────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <Rocket className="w-6 h-6 text-[#e33b5f]" /> Demo Day
          </h1>
          <p className="text-[#7e7e7e]">Startup pitch events and showcase</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchDemoDays} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isAdmin && (
            <Button className="bg-[#e33b5f] text-white" onClick={() => setShowForm(v => !v)}>
              {showForm ? <><X className="w-4 h-4 mr-1" />Cancel</> : <><Plus className="w-4 h-4 mr-1" />New Demo Day</>}
            </Button>
          )}
        </div>
      </div>

      {/* Admin form */}
      {isAdmin && showForm && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#e33b5f]">{editId ? 'Edit Demo Day' : 'New Demo Day'}</CardTitle>
              <button onClick={() => { setShowForm(false); setEditId(null); }}><X className="w-5 h-5 text-[#9e9e9e]" /></button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Title <span className="text-[#e33b5f]">*</span></Label>
              <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. 1K Leaders Demo Day — Cohort 2025" value={fTitle} onChange={e => setFTitle(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" className="mt-1 border-[#f0f0f0]" value={fDate} onChange={e => setFDate(e.target.value)} />
              </div>
              <div>
                <Label>Location</Label>
                <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. ADGM, Abu Dhabi" value={fLoc} onChange={e => setFLoc(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none resize-none" rows={2}
                value={fDesc} onChange={e => setFDesc(e.target.value)} />
            </div>
            <Button className="bg-[#e33b5f] text-white" onClick={saveEvent} disabled={saving || !fTitle.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editId ? 'Save Changes' : 'Create Demo Day'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Demo day cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : demoDays.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-10 text-center space-y-3">
            <Rocket className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">No Demo Days yet</h3>
            <p className="text-sm text-[#7e7e7e]">
              {isAdmin ? 'Create your first Demo Day event above.' : 'Demo Day events will appear here when announced.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {demoDays.map(day => (
            <Card key={day.id} className="border-[#f0f0f0] hover:shadow-md transition overflow-hidden cursor-pointer"
              onClick={() => { setSelected(day); fetchStartups(day.id); }}>
              <div className="h-2 bg-gradient-to-r from-[#e33b5f] to-[#f07969]" />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="font-bold text-[#222]">{day.title}</h3>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {day.is_live
                      ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">Live</Badge>
                      : <Badge className="bg-[#f0f0f0] text-[#9e9e9e] text-xs">Draft</Badge>
                    }
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); setEditId(day.id); setFTitle(day.title); setFDate(day.date ?? ''); setFLoc(day.location ?? ''); setFDesc(day.description ?? ''); setShowForm(true); }}
                        className="w-6 h-6 rounded border border-[#f0f0f0] flex items-center justify-center hover:border-[#e33b5f]/30">
                        <Pencil className="w-3 h-3 text-[#9e9e9e]" />
                      </button>
                    )}
                  </div>
                </div>
                {day.description && <p className="text-sm text-[#7e7e7e] mb-3 line-clamp-2">{day.description}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-[#9e9e9e]">
                  {day.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(day.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                  {day.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{day.location}</span>}
                </div>
                <p className="text-xs text-[#e33b5f] font-medium mt-3">View lineup →</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
