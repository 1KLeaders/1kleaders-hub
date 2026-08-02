'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { GraduationCap, ChevronRight, RefreshCw, Loader2, Search, X, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  submitted:   { label: 'Submitted',   color: 'bg-blue-100 text-blue-700' },
  reviewing:   { label: 'Reviewing',   color: 'bg-amber-100 text-amber-700' },
  shortlisted: { label: 'Shortlisted', color: 'bg-purple-100 text-purple-700' },
  accepted:    { label: 'Accepted ✓',  color: 'bg-emerald-100 text-emerald-700' },
  rejected:    { label: 'Rejected',    color: 'bg-stone-100 text-stone-500' },
};

type Application = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  mobile: string | null;
  city: string | null;
  university: string | null;
  major: string | null;
  academic_year: string | null;
  grad_year: string | null;
  linkedin: string | null;
  ai_skill_level: string | null;
  tools: string[] | null;
  interests: string[] | null;
  why_join: string | null;
  challenge_option: string | null;
  challenge_response: string | null;
  why_select_you: string | null;
  become_after: string | null;
  anything_else: string | null;
  status: string;
  reviewer_notes: string | null;
};

export default function FellowshipApplications() {
  const { profile } = useAuth();
  const [apps,       setApps]       = useState<Application[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected,   setSelected]   = useState<Application | null>(null);
  const [notes,      setNotes]      = useState('');
  const [saving,     setSaving]     = useState(false);

  async function fetchApps() {
    setLoading(true);
    const { data } = await supabase
      .from('fellowship_applications')
      .select('*')
      .order('created_at', { ascending: false });
    setApps((data ?? []) as Application[]);
    setLoading(false);
  }

  useEffect(() => { fetchApps(); }, []);

  async function updateStatus(id: string, status: string) {
    setSaving(true);
    await supabase.from('fellowship_applications').update({ status, reviewer_notes: notes }).eq('id', id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status, reviewer_notes: notes } : a));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status, reviewer_notes: notes } : prev);
    setSaving(false);
  }

  function downloadCSV() {
    const rows = [
      ['Name', 'Email', 'University', 'Major', 'Year', 'City', 'AI Level', 'Status', 'Submitted'],
      ...apps.map(a => [
        a.full_name, a.email, a.university ?? '', a.major ?? '',
        a.academic_year ?? '', a.city ?? '', a.ai_skill_level ?? '',
        a.status, new Date(a.created_at).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'fellowship-applications.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = apps.filter(a => {
    if (statusFilter !== 'All' && a.status !== statusFilter) return false;
    if (search && !a.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !a.email.toLowerCase().includes(search.toLowerCase()) &&
        !(a.university ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Detail view
  if (selected) {
    const sc = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.submitted;
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-sm text-[#7e7e7e] hover:text-[#222]">← All Applications</button>
          <ChevronRight className="w-4 h-4 text-[#d0d0d0]" />
          <span className="text-sm font-medium text-[#222] truncate">{selected.full_name}</span>
        </div>

        <Card className="border-[#f0f0f0]">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-[#222]">{selected.full_name}</h2>
                <p className="text-sm text-[#7e7e7e]">{selected.email} · {selected.mobile}</p>
                <p className="text-sm text-[#7e7e7e]">{selected.university} — {selected.major} ({selected.academic_year})</p>
                <p className="text-xs text-[#9e9e9e] mt-1">{selected.city} · Grad: {selected.grad_year}</p>
              </div>
              <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
            </div>

            {selected.linkedin && (
              <a href={selected.linkedin} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#e33b5f] hover:underline">LinkedIn →</a>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'AI Skill Level', value: selected.ai_skill_level },
                { label: 'Tools Used', value: selected.tools?.join(', ') },
                { label: 'Interests', value: selected.interests?.join(', ') },
                { label: 'Challenge Track', value: selected.challenge_option },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">{f.label}</p>
                  <p className="text-sm text-[#444] mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>

            {[
              { label: 'Why do you want to join?', value: selected.why_join },
              { label: 'Challenge Response', value: selected.challenge_response },
              { label: 'Why should we select you?', value: selected.why_select_you },
              { label: 'What do you hope to become?', value: selected.become_after },
              { label: 'Anything else?', value: selected.anything_else },
            ].filter(f => f.value).map(f => (
              <div key={f.label} className="border-t border-[#f0f0f0] pt-3">
                <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">{f.label}</p>
                <p className="text-sm text-[#444] whitespace-pre-line leading-relaxed">{f.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[#f0f0f0]">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Review Decision</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Internal reviewer notes..." rows={3} className="border-[#f0f0f0] text-sm"
              value={notes || selected.reviewer_notes || ''}
              onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-2 flex-wrap">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <Button key={key} size="sm" variant={selected.status === key ? 'default' : 'outline'}
                  className={selected.status === key ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'text-xs'}
                  onClick={() => updateStatus(selected.id, key)} disabled={saving}>
                  {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  {cfg.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-[#e33b5f]" /> Fellowship Applications
          </h1>
          <p className="text-[#7e7e7e]">{loading ? '—' : `${apps.length} total applications`}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={downloadCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button size="sm" variant="outline" onClick={fetchApps} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Card key={key} className="border-[#f0f0f0]">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-[#222]">{apps.filter(a => a.status === key).length}</p>
              <Badge className={`text-xs mt-1 ${cfg.color}`}>{cfg.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search by name, email, university..." className="pl-9 border-[#f0f0f0]"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 border-[#f0f0f0]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading applications...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-10 text-center space-y-3">
            <GraduationCap className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <p className="text-sm text-[#7e7e7e]">No applications found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-0">
            {filtered.map(app => {
              const sc = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.submitted;
              return (
                <div key={app.id} className="flex items-center gap-4 p-4 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition cursor-pointer"
                  onClick={() => { setSelected(app); setNotes(app.reviewer_notes ?? ''); }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-sm text-[#222]">{app.full_name}</p>
                      <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                    </div>
                    <p className="text-xs text-[#7e7e7e]">{app.university} · {app.major} · {app.city}</p>
                    <p className="text-xs text-[#9e9e9e]">{new Date(app.created_at).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#9e9e9e] flex-shrink-0" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
