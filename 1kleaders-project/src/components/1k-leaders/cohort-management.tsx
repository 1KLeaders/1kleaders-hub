'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Pencil, ChevronDown, ChevronUp, Loader2, RefreshCw,
  Lightbulb, Users, Calendar, Lock, Unlock, Archive,
  CheckCircle2, Clock, X, Save, AlertCircle, BarChart3
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

type CohortStatus = 'draft' | 'open' | 'review' | 'closed' | 'archived';

type Cohort = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  status: CohortStatus;
  opens_at: string | null;
  closes_at: string | null;
  review_starts_at: string | null;
  results_at: string | null;
  max_ideas: number;
  eligible_roles: string[];
  eligible_subroles: string[];
  require_subrole: boolean;
  idea_count: number;
  approved_count: number;
};

type CohortIdea = {
  id: string;
  title: string;
  status: string;
  sector: string | null;
  vep_score: number | null;
  submitter_name: string;
  created_at: string;
};

const statusConfig: Record<CohortStatus, { label: string; color: string; icon: any; next: CohortStatus | null }> = {
  draft:    { label: 'Draft',          color: 'bg-stone-100 text-stone-600',     icon: Clock,        next: 'open' },
  open:     { label: 'Open',           color: 'bg-emerald-100 text-emerald-700', icon: Unlock,       next: 'review' },
  review:   { label: 'Under Review',   color: 'bg-amber-100 text-amber-700',     icon: BarChart3,    next: 'closed' },
  closed:   { label: 'Closed',         color: 'bg-[#e33b5f]/10 text-[#c02d4f]', icon: Lock,         next: 'archived' },
  archived: { label: 'Archived',       color: 'bg-stone-100 text-stone-400',     icon: Archive,      next: null },
};

const statusTransitionLabel: Partial<Record<CohortStatus, string>> = {
  draft:  'Open for Submissions',
  open:   'Close & Start Review',
  review: 'Close Cohort',
  closed: 'Archive',
};

const ROLE_OPTIONS    = ['user','shareholder','admin','super-admin','developer'];
const SUBROLE_OPTIONS = ['idea-owner','founder','vep-builder','mab-builder'];

function EmptyForm(): Cohort {
  return {
    id: '', created_at: '', updated_at: '',
    name: '', description: '', status: 'draft',
    opens_at: '', closes_at: '', review_starts_at: '', results_at: '',
    max_ideas: 50,
    eligible_roles: ['user','shareholder'],
    eligible_subroles: ['idea-owner'],
    require_subrole: true,
    idea_count: 0, approved_count: 0,
  };
}

export default function CohortManagement() {
  const { profile } = useAuth();
  const [cohorts,     setCohorts]     = useState<Cohort[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [ideas,       setIdeas]       = useState<Record<string, CohortIdea[]>>({});
  const [loadingIdeas,setLoadingIdeas]= useState<string | null>(null);

  // Form state
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [form,        setForm]        = useState<Cohort>(EmptyForm());
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function fetchCohorts() {
    setLoading(true);
    const { data } = await supabase
      .from('cohorts')
      .select('*')
      .order('created_at', { ascending: false });
    setCohorts((data ?? []) as Cohort[]);
    setLoading(false);
  }

  useEffect(() => { fetchCohorts(); }, []);

  async function fetchIdeasForCohort(cohortId: string) {
    if (ideas[cohortId]) return;
    setLoadingIdeas(cohortId);
    const { data: ideaData } = await supabase
      .from('ideas')
      .select('id, title, status, sector, vep_score, submitted_by, created_at')
      .eq('cohort_id', cohortId)
      .order('vep_score', { ascending: false, nullsFirst: false });

    if (ideaData && ideaData.length > 0) {
      const userIds = [...new Set(ideaData.map(i => i.submitted_by))];
      const { data: profiles } = await supabase.from('profiles')
        .select('id, first_name, last_name').in('id', userIds);
      const nameMap = Object.fromEntries(
        (profiles ?? []).map(p => [p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown'])
      );
      setIdeas(prev => ({
        ...prev,
        [cohortId]: ideaData.map(i => ({ ...i, submitter_name: nameMap[i.submitted_by] ?? '—' })),
      }));
    } else {
      setIdeas(prev => ({ ...prev, [cohortId]: [] }));
    }
    setLoadingIdeas(null);
  }

  function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    fetchIdeasForCohort(id);
  }

  function openNewForm() {
    setEditingId(null);
    setForm(EmptyForm());
    setError(null);
    setShowForm(true);
  }

  function openEditForm(c: Cohort, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(c.id);
    setForm({ ...c });
    setError(null);
    setShowForm(true);
  }

  async function saveCohort() {
    if (!form.name.trim()) return setError('Cohort name is required.');
    setSaving(true);
    setError(null);

    const payload = {
      name:              form.name.trim(),
      description:       form.description?.trim() || null,
      status:            form.status,
      opens_at:          form.opens_at || null,
      closes_at:         form.closes_at || null,
      review_starts_at:  form.review_starts_at || null,
      results_at:        form.results_at || null,
      max_ideas:         form.max_ideas,
      eligible_roles:    form.eligible_roles,
      eligible_subroles: form.eligible_subroles,
      require_subrole:   form.require_subrole,
      created_by:        profile?.id,
    };

    if (editingId) {
      const { data, error } = await supabase.from('cohorts').update(payload).eq('id', editingId).select().single();
      if (error) { setError(error.message); setSaving(false); return; }
      setCohorts(prev => prev.map(c => c.id === editingId ? data as Cohort : c));
    } else {
      const { data, error } = await supabase.from('cohorts').insert(payload).select().single();
      if (error) { setError(error.message); setSaving(false); return; }
      setCohorts(prev => [data as Cohort, ...prev]);
    }

    setSaving(false);
    setShowForm(false);
    setEditingId(null);
  }

  async function advanceStatus(cohort: Cohort, e: React.MouseEvent) {
    e.stopPropagation();
    const next = statusConfig[cohort.status].next;
    if (!next) return;
    const { data } = await supabase.from('cohorts').update({ status: next }).eq('id', cohort.id).select().single();
    if (data) setCohorts(prev => prev.map(c => c.id === cohort.id ? data as Cohort : c));
  }

  async function updateIdeaStatus(ideaId: string, status: string, cohortId: string) {
    await supabase.from('ideas').update({ status }).eq('id', ideaId);
    setIdeas(prev => ({
      ...prev,
      [cohortId]: (prev[cohortId] ?? []).map(i => i.id === ideaId ? { ...i, status } : i),
    }));
  }

  const f = form;
  const setF = (patch: Partial<Cohort>) => setForm(prev => ({ ...prev, ...patch }));

  // Stats
  const total    = cohorts.length;
  const openNow  = cohorts.filter(c => c.status === 'open').length;
  const inReview = cohorts.filter(c => c.status === 'review').length;
  const totalIdeas = cohorts.reduce((s, c) => s + (c.idea_count ?? 0), 0);

  const ideaStatusColors: Record<string, string> = {
    'Submitted':             'bg-blue-100 text-blue-700',
    'Under Quality Review':  'bg-amber-100 text-amber-700',
    'Quality Approved':      'bg-emerald-100 text-emerald-700',
    'Assigned to VEP':       'bg-purple-100 text-purple-700',
    'Under VEP Evaluation':  'bg-purple-100 text-purple-700',
    'VEP Complete':          'bg-purple-100 text-purple-700',
    'Moved to MAB':          'bg-[#e33b5f]/10 text-[#c02d4f]',
    'Approved':              'bg-emerald-100 text-emerald-700',
    'Rejected':              'bg-red-100 text-red-700',
    'Parked':                'bg-stone-100 text-stone-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Cohort Management</h1>
          <p className="text-[#7e7e7e]">Create and manage idea submission cohorts</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchCohorts} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={openNewForm}>
            <Plus className="w-4 h-4 mr-2" /> New Cohort
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Cohorts',  value: loading ? '—' : total,      icon: Calendar },
          { label: 'Open Now',       value: loading ? '—' : openNow,    icon: Unlock },
          { label: 'Under Review',   value: loading ? '—' : inReview,   icon: BarChart3 },
          { label: 'Total Ideas',    value: loading ? '—' : totalIdeas, icon: Lightbulb },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className="w-5 h-5 text-[#e33b5f]" />
              <div>
                <div className="text-xl font-bold text-[#222]">{s.value}</div>
                <div className="text-xs text-[#7e7e7e]">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cohort Form */}
      {showForm && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-[#e33b5f]">
                {editingId ? 'Edit Cohort' : 'New Cohort'}
              </CardTitle>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-[#9e9e9e]" /></button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Cohort Name <span className="text-[#e33b5f]">*</span></Label>
                <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. Cohort 1 — Q1 2025" value={f.name} onChange={e => setF({ name: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <textarea className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none" rows={2}
                  placeholder="What is this cohort focused on?" value={f.description ?? ''} onChange={e => setF({ description: e.target.value })} />
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Timeline</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Submissions Open</Label>
                <Input type="datetime-local" className="mt-1 border-[#f0f0f0]" value={f.opens_at?.slice(0,16) ?? ''} onChange={e => setF({ opens_at: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">Submissions Close</Label>
                <Input type="datetime-local" className="mt-1 border-[#f0f0f0]" value={f.closes_at?.slice(0,16) ?? ''} onChange={e => setF({ closes_at: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">Review Starts</Label>
                <Input type="datetime-local" className="mt-1 border-[#f0f0f0]" value={f.review_starts_at?.slice(0,16) ?? ''} onChange={e => setF({ review_starts_at: e.target.value })} />
              </div>
              <div>
                <Label className="text-sm">Results Announced</Label>
                <Input type="datetime-local" className="mt-1 border-[#f0f0f0]" value={f.results_at?.slice(0,16) ?? ''} onChange={e => setF({ results_at: e.target.value })} />
              </div>
            </div>

            <Separator />
            <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Eligibility</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Max Submissions</Label>
                <Input type="number" min={1} max={500} className="mt-1 border-[#f0f0f0] w-32"
                  value={f.max_ideas} onChange={e => setF({ max_ideas: parseInt(e.target.value) || 50 })} />
              </div>
              <div>
                <Label className="text-sm">Require Idea Owner Badge</Label>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => setF({ require_subrole: true })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${f.require_subrole ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0]'}`}>
                    Yes — Badge Required
                  </button>
                  <button onClick={() => setF({ require_subrole: false })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${!f.require_subrole ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0]'}`}>
                    No — Open to All
                  </button>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm mb-2 block">Eligible Roles</Label>
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map(r => (
                  <button key={r} onClick={() => setF({
                    eligible_roles: f.eligible_roles.includes(r)
                      ? f.eligible_roles.filter(x => x !== r)
                      : [...f.eligible_roles, r]
                  })}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${f.eligible_roles.includes(r) ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <div className="flex gap-2">
              <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={saveCohort} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />{editingId ? 'Save Changes' : 'Create Cohort'}</>}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cohort list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading cohorts...
        </div>
      ) : cohorts.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-10 text-center space-y-3">
            <Lightbulb className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">No cohorts yet</h3>
            <p className="text-sm text-[#7e7e7e]">Create a cohort to open the platform for idea submissions.</p>
            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={openNewForm}>
              <Plus className="w-4 h-4 mr-2" /> Create First Cohort
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {cohorts.map(c => {
            const cfg       = statusConfig[c.status];
            const Icon      = cfg.icon;
            const isExpanded = expanded === c.id;
            const pct       = c.max_ideas > 0 ? Math.min(100, Math.round((c.idea_count / c.max_ideas) * 100)) : 0;
            const cohortIdeas = ideas[c.id] ?? [];

            return (
              <Card key={c.id} className="border-[#f0f0f0] overflow-hidden">
                {/* Cohort header row */}
                <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#fafafa] transition" onClick={() => toggleExpand(c.id)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-[#222]">{c.name}</p>
                      <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                    {c.description && <p className="text-xs text-[#7e7e7e] mt-0.5 truncate">{c.description}</p>}
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      {c.opens_at && (
                        <span className="text-xs text-[#9e9e9e] flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(c.opens_at).toLocaleDateString()} – {c.closes_at ? new Date(c.closes_at).toLocaleDateString() : 'TBD'}
                        </span>
                      )}
                      <span className="text-xs text-[#9e9e9e] flex items-center gap-1">
                        <Lightbulb className="w-3 h-3" />{c.idea_count ?? 0} / {c.max_ideas} ideas
                      </span>
                    </div>
                    {c.status === 'open' && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 w-32" />
                        <span className="text-[10px] text-[#9e9e9e]">{pct}% full</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cfg.next && (
                      <Button size="sm" variant="outline" className="h-8 text-xs hidden sm:flex"
                        onClick={e => advanceStatus(c, e)}>
                        {statusTransitionLabel[c.status]}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={e => openEditForm(c, e)}>
                      <Pencil className="w-3.5 h-3.5 text-[#9e9e9e]" />
                    </Button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9e9e9e]" /> : <ChevronDown className="w-4 h-4 text-[#9e9e9e]" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-[#f0f0f0] bg-[#fafafa]">
                    {/* Mobile advance button */}
                    {cfg.next && (
                      <div className="p-3 pb-0 sm:hidden">
                        <Button size="sm" className="w-full bg-[#e33b5f] text-white h-8 text-xs" onClick={e => advanceStatus(c, e)}>
                          {statusTransitionLabel[c.status]}
                        </Button>
                      </div>
                    )}

                    {/* Timeline & eligibility info */}
                    <div className="grid sm:grid-cols-2 gap-4 p-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Timeline</p>
                        {[
                          { label: 'Opens',        value: c.opens_at },
                          { label: 'Closes',       value: c.closes_at },
                          { label: 'Review Starts',value: c.review_starts_at },
                          { label: 'Results',      value: c.results_at },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-xs">
                            <span className="text-[#7e7e7e]">{label}</span>
                            <span className="font-medium text-[#222]">{value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Eligibility</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#7e7e7e]">Badge required</span>
                          <span className="font-medium text-[#222]">{c.require_subrole ? 'Yes — Idea Owner' : 'No'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#7e7e7e]">Eligible roles</span>
                          <span className="font-medium text-[#222]">{c.eligible_roles?.join(', ') || 'All'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[#7e7e7e]">Max ideas</span>
                          <span className="font-medium text-[#222]">{c.max_ideas}</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Ideas in this cohort */}
                    <div className="p-4">
                      <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-3">
                        Ideas ({c.idea_count ?? 0})
                      </p>
                      {loadingIdeas === c.id ? (
                        <div className="flex items-center gap-2 text-[#7e7e7e] text-sm py-4">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading ideas...
                        </div>
                      ) : cohortIdeas.length === 0 ? (
                        <p className="text-sm text-[#9e9e9e]">No ideas submitted to this cohort yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {cohortIdeas.map(idea => (
                            <div key={idea.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#f0f0f0] flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium text-[#222] truncate">{idea.title}</p>
                                  <Badge className={`text-xs ${ideaStatusColors[idea.status] ?? 'bg-stone-100 text-stone-500'}`}>{idea.status}</Badge>
                                  {idea.sector && <Badge variant="outline" className="text-xs">{idea.sector}</Badge>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5 text-xs text-[#7e7e7e]">
                                  <span>{idea.submitter_name}</span>
                                  {idea.vep_score != null && <span className="text-[#e33b5f] font-medium">VEP: {idea.vep_score}/100</span>}
                                  <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              {/* Quick status update */}
                              <select
                                className="text-xs border border-[#f0f0f0] rounded-lg px-2 py-1 bg-white text-[#444] focus:outline-none focus:ring-1 focus:ring-[#e33b5f]/30"
                                value={idea.status}
                                onChange={e => updateIdeaStatus(idea.id, e.target.value, c.id)}
                              >
                                {['Submitted','Under Quality Review','Quality Approved','Assigned to VEP','Under VEP Evaluation','VEP Complete','Moved to MAB','Under MAB Evaluation','MAB Complete','Approved','Rejected','Parked'].map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
