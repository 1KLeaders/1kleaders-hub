'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ExternalLink, ChevronRight, ChevronDown, Users, TrendingUp, MapPin, Globe, Rocket, Plus, Pencil, Eye, EyeOff, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole } from './types';

interface Props { role?: DashboardRole; navigate?: (page: string) => void; }

type TeamMember = { name: string; role: string; bio?: string };
type Financials  = { raise_target?: string; raise_currency?: string; stage?: string; arr_target?: string; arr_year?: number };

type Startup = {
  id: string;
  name: string;
  tagline: string | null;
  sector: string | null;
  stage: string | null;
  status: string;
  location: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  description: string | null;
  problem: string | null;
  solution: string | null;
  market_size: string | null;
  traction: string | null;
  team: TeamMember[] | null;
  financials: Financials | null;
  deck_url: string | null;
  is_visible: boolean;
  sort_order: number;
};

const STATUS_COLOR: Record<string, string> = {
  Active:  'bg-emerald-100 text-emerald-700',
  Stealth: 'bg-amber-100 text-amber-700',
  Exited:  'bg-stone-100 text-stone-500',
};

export default function StartupsPage({ role, navigate }: Props) {
  const isAdmin = ['admin', 'super-admin', 'developer'].includes(role ?? '');
  const [startups, setStartups]   = useState<Startup[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [editId,   setEditId]     = useState<string | null>(null);
  const [form,     setForm]       = useState<Partial<Startup>>({});
  const [saving,   setSaving]     = useState(false);

  async function fetchStartups() {
    setLoading(true);
    let q = supabase.from('startups').select('*').order('sort_order');
    if (!isAdmin) q = q.eq('is_visible', true);
    const { data } = await q;
    setStartups((data ?? []) as Startup[]);
    setLoading(false);
  }

  useEffect(() => { fetchStartups(); }, []);

  async function saveStartup() {
    if (!form.name?.trim()) return;
    setSaving(true);
    if (editId) {
      await supabase.from('startups').update(form).eq('id', editId);
      setStartups(prev => prev.map(s => s.id === editId ? { ...s, ...form } as Startup : s));
    } else {
      const { data } = await supabase.from('startups').insert({ ...form, sort_order: startups.length + 1 }).select().single();
      if (data) setStartups(prev => [...prev, data as Startup]);
    }
    setSaving(false);
    setEditId(null);
    setForm({});
  }

  async function toggleVisible(s: Startup) {
    await supabase.from('startups').update({ is_visible: !s.is_visible }).eq('id', s.id);
    setStartups(prev => prev.map(x => x.id === s.id ? { ...x, is_visible: !x.is_visible } : x));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-[#9e9e9e]">
      <Loader2 className="w-5 h-5 animate-spin" />Loading startups...
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-[#222] flex items-center gap-3">
              <Rocket className="w-7 h-7 text-[#e33b5f]" />Portfolio Startups
            </h1>
            <p className="text-[#7e7e7e] mt-1">Ventures incubated and built by 1K Leaders.</p>
          </div>
          {isAdmin && (
            <Button className="bg-[#e33b5f] text-white" size="sm"
              onClick={() => { setForm({}); setEditId('new'); }}>
              <Plus className="w-4 h-4 mr-1" />Add Startup
            </Button>
          )}
        </div>
      </div>

      {/* Admin create form */}
      {isAdmin && editId === 'new' && (
        <div className="border border-[#f0f0f0] rounded-2xl p-6 space-y-4 bg-[#f6f6f6]">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#222]">New Startup</h3>
            <button onClick={() => setEditId(null)}><X className="w-4 h-4 text-[#9e9e9e]" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: 'Name *', key: 'name' }, { label: 'Tagline', key: 'tagline' },
              { label: 'Sector', key: 'sector' }, { label: 'Stage', key: 'stage' },
              { label: 'Location', key: 'location' }, { label: 'Website', key: 'website' },
              { label: 'Primary Color', key: 'primary_color', placeholder: '#222222' },
              { label: 'Accent Color', key: 'accent_color', placeholder: '#e33b5f' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">{f.label}</label>
                <Input className="border-[#e8e8e8]" placeholder={f.placeholder}
                  value={(form as any)[f.key] ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
          </div>
          {[
            { label: 'Description', key: 'description' },
            { label: 'Problem', key: 'problem' },
            { label: 'Solution', key: 'solution' },
            { label: 'Market Size', key: 'market_size' },
            { label: 'Traction', key: 'traction' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">{f.label}</label>
              <textarea className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm resize-none" rows={3}
                value={(form as any)[f.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
            </div>
          ))}
          <Button className="bg-[#e33b5f] text-white" onClick={saveStartup} disabled={saving || !form.name?.trim()}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Create Startup
          </Button>
        </div>
      )}

      {/* Startup cards */}
      <div className="space-y-4">
        {startups.map(s => {
          const isEditing = editId === s.id;
          const primary = s.primary_color ?? '#222222';
          const accent  = s.accent_color  ?? '#e33b5f';

          return (
            <div key={s.id} className="border border-[#f0f0f0] rounded-2xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-0 cursor-pointer" onClick={() => !isEditing && navigate?.(`startup-${s.id}`)}>
                {/* Color stripe */}
                <div className="w-2 self-stretch flex-shrink-0" style={{ backgroundColor: primary }} />
                {/* Logo / initial */}
                <div className="w-16 h-16 flex items-center justify-center flex-shrink-0 ml-4"
                  style={{ backgroundColor: primary + '15' }}>
                  {s.logo_url
                    ? <img src={s.logo_url} alt={s.name} className="w-10 h-10 object-contain" />
                    : <span className="text-xl font-black" style={{ color: primary }}>{s.name[0]}</span>
                  }
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 px-5 py-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="font-bold text-lg text-[#222]">{s.name}</h2>
                    <Badge className={STATUS_COLOR[s.status] ?? STATUS_COLOR.Active}>{s.status}</Badge>
                    {!s.is_visible && isAdmin && <Badge className="bg-stone-100 text-stone-500 text-xs">Hidden</Badge>}
                  </div>
                  {s.tagline && <p className="text-sm text-[#7e7e7e] italic">{s.tagline}</p>}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {s.sector   && <span className="text-xs text-[#9e9e9e] flex items-center gap-1"><TrendingUp className="w-3 h-3" />{s.sector}</span>}
                    {s.location && <span className="text-xs text-[#9e9e9e] flex items-center gap-1"><MapPin className="w-3 h-3" />{s.location}</span>}
                    {s.stage    && <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: accent }}>{s.stage}</span>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2 pr-4 flex-shrink-0">
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg border border-[#f0f0f0] flex items-center justify-center hover:border-[#e33b5f]/30 transition">
                      <Globe className="w-3.5 h-3.5 text-[#9e9e9e]" />
                    </a>
                  )}
                  {isAdmin && (
                    <>
                      <button onClick={e => { e.stopPropagation(); setEditId(s.id); setForm(s); setOpenId(null); }}
                        className="w-8 h-8 rounded-lg border border-[#f0f0f0] flex items-center justify-center hover:border-[#e33b5f]/30 transition">
                        <Pencil className="w-3.5 h-3.5 text-[#9e9e9e]" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); toggleVisible(s); }}
                        className="w-8 h-8 rounded-lg border border-[#f0f0f0] flex items-center justify-center hover:border-[#e33b5f]/30 transition">
                        {s.is_visible ? <EyeOff className="w-3.5 h-3.5 text-[#9e9e9e]" /> : <Eye className="w-3.5 h-3.5 text-[#9e9e9e]" />}
                      </button>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#9e9e9e]" />
                </div>
              </div>

              {/* Inline edit form — only shows when editing, not on card click */}
              {isEditing && editId !== 'new' && (
                <div className="border-t border-[#f0f0f0] p-6 space-y-4 bg-[#f6f6f6]">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Name', key: 'name' }, { label: 'Tagline', key: 'tagline' },
                      { label: 'Sector', key: 'sector' }, { label: 'Stage', key: 'stage' },
                      { label: 'Status', key: 'status' }, { label: 'Location', key: 'location' },
                      { label: 'Website', key: 'website' }, { label: 'Logo URL', key: 'logo_url' },
                      { label: 'Primary Color', key: 'primary_color' }, { label: 'Accent Color', key: 'accent_color' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">{f.label}</label>
                        <Input className="border-[#e8e8e8] bg-white text-sm"
                          value={(form as any)[f.key] ?? ''}
                          onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                      </div>
                    ))}
                  </div>
                  {[
                    { label: 'Description', key: 'description' },
                    { label: 'Problem', key: 'problem' },
                    { label: 'Solution', key: 'solution' },
                    { label: 'Market Size', key: 'market_size' },
                    { label: 'Traction', key: 'traction' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider block mb-1">{f.label}</label>
                      <textarea className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm resize-none bg-white" rows={3}
                        value={(form as any)[f.key] ?? ''}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Button className="bg-[#e33b5f] text-white" onClick={saveStartup} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save
                    </Button>
                    <Button variant="outline" onClick={() => { setEditId(null); setForm({}); }}>Cancel</Button>
                  </div>
                </div>
              )}
              )}
            </div>
          );
        })}
      </div>

      {startups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Rocket className="w-10 h-10 text-[#9e9e9e]" />
          <p className="text-sm text-[#9e9e9e]">No startups yet.</p>
        </div>
      )}
    </div>
  );
}
