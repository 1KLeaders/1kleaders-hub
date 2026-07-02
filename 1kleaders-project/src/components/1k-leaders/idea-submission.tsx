'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, CheckCircle, Save, Clock, Lightbulb, ArrowRight, Loader2, RefreshCw, Eye, Trash2 } from 'lucide-react';
import type { DashboardRole } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { role: DashboardRole; navigate: (page: string) => void; }

const SECTORS = ['FinTech','HealthTech','EdTech','PropTech','CleanTech','AgriTech','E-Commerce','SaaS','AI/ML','Logistics','Energy','Other'];
const REV_MODELS = ['SaaS Subscription','Marketplace','Freemium','Licensing','Direct Sales','Advertising','Other'];
const STAGES = ['Idea Stage','Pre-Seed','Seed','Series A','Growth'];
const SECTIONS = ['Basic Info','Problem & Solution','Market & Business','Team','Documents'];

const statusColors: Record<string, string> = {
  Draft:                   'bg-stone-100 text-stone-600',
  Submitted:               'bg-blue-100 text-blue-700',
  'Under Quality Review':  'bg-amber-100 text-amber-700',
  'Quality Approved':      'bg-emerald-100 text-emerald-700',
  Approved:                'bg-[#e33b5f]/10 text-[#c02d4f]',
  Rejected:                'bg-red-100 text-red-700',
  Parked:                  'bg-stone-100 text-stone-500',
};

type DbIdea = {
  id: string;
  created_at: string;
  title: string;
  status: string;
  sector: string | null;
  stage: string | null;
  tagline: string | null;
};

export default function IdeaSubmission({ role, navigate }: Props) {
  const { profile } = useAuth();
  const canSubmit = profile?.subroles?.includes('idea-owner') || role === 'admin' || role === 'super-admin' || role === 'developer';

  // Active cohort
  const [activeCohort,    setActiveCohort]    = useState<{ id: string; name: string; closes_at: string | null; max_ideas: number; idea_count: number } | null>(null);
  const [cohortLoading,   setCohortLoading]   = useState(true);
  const [cohortFull,      setCohortFull]      = useState(false);

  // My ideas list
  const [myIdeas,    setMyIdeas]    = useState<DbIdea[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm,   setShowForm]   = useState(false);

  // Form state
  const [section,    setSection]    = useState(1);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftId,    setDraftId]    = useState<string | null>(null);
  const [saveMsg,    setSaveMsg]    = useState('');

  // Section 1
  const [title,       setTitle]       = useState('');
  const [sector,      setSector]      = useState('');
  const [otherSector, setOtherSector] = useState('');
  const [tagline,     setTagline]     = useState('');
  const [description, setDescription] = useState('');

  // Section 2
  const [problem,   setProblem]   = useState('');
  const [solution,  setSolution]  = useState('');
  const [uniqueUVP, setUniqueUVP] = useState('');

  // Section 3
  const [targetMarket,  setTargetMarket]  = useState('');
  const [revModel,      setRevModel]      = useState('');
  const [otherRevModel, setOtherRevModel] = useState('');
  const [revenueDetail, setRevenueDetail] = useState('');
  const [stage,         setStage]         = useState('');

  // Section 4
  const [founderName,   setFounderName]   = useState(profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : '');
  const [founderRole,   setFounderRole]   = useState('CEO');
  const [coFounderName, setCoFounderName] = useState('');
  const [coFounderRole, setCoFounderRole] = useState('');
  const [teamDesc,      setTeamDesc]      = useState('');

  async function fetchMyIdeas() {
    if (!profile) return;
    setLoadingList(true);
    const { data } = await supabase
      .from('ideas')
      .select('id, created_at, title, status, sector, stage, tagline')
      .eq('submitted_by', profile.id)
      .order('created_at', { ascending: false });
    setMyIdeas((data ?? []) as DbIdea[]);
    setLoadingList(false);
  }

  useEffect(() => {
    fetchMyIdeas();
    // Fetch active cohort
    async function fetchActiveCohort() {
      setCohortLoading(true);
      const { data } = await supabase
        .from('cohorts')
        .select('id, name, closes_at, max_ideas, idea_count')
        .eq('status', 'open')
        .order('opens_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setActiveCohort(data);
        setCohortFull((data.idea_count ?? 0) >= data.max_ideas);
      } else {
        setActiveCohort(null);
      }
      setCohortLoading(false);
    }
    fetchActiveCohort();
  }, [profile]);

  const ideaPayload = () => ({
    submitted_by:    profile!.id,
    title:           title.trim() || 'Untitled Idea',
    tagline:         tagline.trim() || null,
    sector:          sector === 'Other' ? otherSector : sector || null,
    stage:           stage || null,
    problem:         problem.trim() || null,
    solution:        solution.trim() || null,
    competitive_edge: uniqueUVP.trim() || null,
    target_market:   targetMarket.trim() || null,
    revenue_model:   revModel === 'Other' ? otherRevModel : revModel || null,
    cohort_id:       activeCohort?.id ?? null,
    updated_at:      new Date().toISOString(),
  });

  async function saveDraft() {
    if (!profile) return;
    setSaving(true);
    setSaveMsg('');
    if (draftId) {
      await supabase.from('ideas').update({ ...ideaPayload(), status: 'Draft' }).eq('id', draftId);
    } else {
      const { data } = await supabase.from('ideas').insert({ ...ideaPayload(), status: 'Draft' }).select('id').single();
      if (data) setDraftId(data.id);
    }
    setSaving(false);
    setSaveMsg('Draft saved');
    setTimeout(() => setSaveMsg(''), 3000);
    fetchMyIdeas();
  }

  async function submitIdea() {
    if (!profile || !title.trim()) return;
    setSubmitting(true);
    const payload = { ...ideaPayload(), status: 'Submitted' };
    if (draftId) {
      await supabase.from('ideas').update(payload).eq('id', draftId);
    } else {
      await supabase.from('ideas').insert(payload);
    }
    setSubmitting(false);
    setShowForm(false);
    resetForm();
    fetchMyIdeas();
  }

  async function deleteIdea(id: string) {
    await supabase.from('ideas').delete().eq('id', id);
    setMyIdeas(prev => prev.filter(i => i.id !== id));
  }

  function resetForm() {
    setSection(1); setDraftId(null); setSaveMsg('');
    setTitle(''); setSector(''); setTagline(''); setDescription('');
    setProblem(''); setSolution(''); setUniqueUVP('');
    setTargetMarket(''); setRevModel(''); setRevenueDetail(''); setStage('');
    setCoFounderName(''); setCoFounderRole(''); setTeamDesc('');
  }

  const progress = (section / SECTIONS.length) * 100;

  if (!canSubmit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Submit Your Idea</h1>
          <p className="text-[#7e7e7e]">Share your venture idea with our evaluation team.</p>
        </div>
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-8 text-center space-y-4">
            <Lightbulb className="w-12 h-12 text-[#9e9e9e] mx-auto" />
            <h3 className="text-lg font-semibold text-[#222]">Idea Owner Access Required</h3>
            <p className="text-sm text-[#7e7e7e] max-w-sm mx-auto">
              You need the <strong>Idea Owner</strong> badge to submit ideas. Contact an admin to have it added to your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cohort gate — check after canSubmit so admins bypass
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';
  if (!isAdmin && !cohortLoading && !activeCohort) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Idea Submission</h1>
          <p className="text-[#7e7e7e]">Share your venture idea with our evaluation team.</p>
        </div>
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-8 text-center space-y-4">
            <Clock className="w-12 h-12 text-[#9e9e9e] mx-auto" />
            <h3 className="text-lg font-semibold text-[#222]">No Active Cohort</h3>
            <p className="text-sm text-[#7e7e7e] max-w-sm mx-auto">
              Idea submissions are only open during an active cohort. The 1K Leaders team will announce the next cohort opening date.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin && !cohortLoading && cohortFull) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Idea Submission</h1>
        </div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center space-y-4">
            <Lightbulb className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-semibold text-[#222]">{activeCohort?.name} is Full</h3>
            <p className="text-sm text-[#7e7e7e] max-w-sm mx-auto">
              This cohort has reached its maximum number of submissions ({activeCohort?.max_ideas}). Look out for the next cohort announcement.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">My Ideas</h1>
          <p className="text-[#7e7e7e]">Submit and track your venture ideas.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchMyIdeas} disabled={loadingList}>
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          </Button>
          {!showForm && (
            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={() => { resetForm(); setShowForm(true); }}>
              <Lightbulb className="w-4 h-4 mr-2" /> New Idea
            </Button>
          )}
        </div>
      </div>

      {/* Active cohort banner */}
      {!showForm && activeCohort && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">{activeCohort.name} — Open for Submissions</p>
            <p className="text-xs text-emerald-700">
              {activeCohort.idea_count ?? 0} of {activeCohort.max_ideas} slots used
              {activeCohort.closes_at && ` · Closes ${new Date(activeCohort.closes_at).toLocaleDateString()}`}
            </p>
          </div>
          <div className="shrink-0">
            <div className="w-24 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, ((activeCohort.idea_count ?? 0) / activeCohort.max_ideas) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {!showForm && !activeCohort && isAdmin && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">No active cohort — public submissions are currently closed. Open a cohort from the Admin Dashboard to enable submissions.</p>
        </div>
      )}

      {!showForm && (
        <>
          {loadingList ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[#7e7e7e]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your ideas...
            </div>
          ) : myIdeas.length === 0 ? (
            <Card className="border-dashed border-[#f0f0f0]">
              <CardContent className="p-8 text-center space-y-3">
                <Lightbulb className="w-10 h-10 text-[#9e9e9e] mx-auto" />
                <p className="text-sm text-[#7e7e7e]">You haven't submitted any ideas yet. Click "New Idea" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myIdeas.map(idea => (
                <Card key={idea.id} className="border-[#f0f0f0] hover:shadow-sm transition">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-[#222] truncate">{idea.title}</p>
                        <Badge className={`text-xs ${statusColors[idea.status] ?? 'bg-stone-100 text-stone-600'}`}>{idea.status}</Badge>
                      </div>
                      <p className="text-xs text-[#7e7e7e] mt-0.5">
                        {[idea.sector, idea.stage].filter(Boolean).join(' · ')} · {new Date(idea.created_at).toLocaleDateString()}
                      </p>
                      {idea.tagline && <p className="text-xs text-[#9e9e9e] mt-0.5 italic">"{idea.tagline}"</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {idea.status === 'Draft' && (
                        <Button size="sm" variant="outline" className="h-8 text-xs"
                          onClick={() => { setDraftId(idea.id); setTitle(idea.title); setShowForm(true); }}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Continue
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-8 text-xs text-red-500 hover:bg-red-50"
                        onClick={() => deleteIdea(idea.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Submission form */}
      {showForm && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#222]">{draftId ? 'Continue Idea' : 'New Idea'}</h2>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); fetchMyIdeas(); }}>← Back to My Ideas</Button>
          </div>

          <Progress value={progress} className="h-2" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {SECTIONS.map((s, i) => (
              <button key={s} onClick={() => setSection(i + 1)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${section === i + 1 ? 'bg-[#e33b5f] text-white' : section > i + 1 ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : 'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
                {section > i + 1 && <CheckCircle className="w-3 h-3 inline mr-1" />}{s}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">{SECTIONS[section - 1]}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {section === 1 && (
                <>
                  <div>
                    <Label>Idea Title <span className="text-[#e33b5f]">*</span></Label>
                    <Input className="mt-1 border-[#f0f0f0]" placeholder="Give your idea a compelling name" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tagline</Label>
                    <Input className="mt-1 border-[#f0f0f0]" placeholder="One-sentence pitch" value={tagline} onChange={e => setTagline(e.target.value)} />
                  </div>
                  <div>
                    <Label>Sector / Category</Label>
                    <Select value={sector} onValueChange={setSector}>
                      <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select sector" /></SelectTrigger>
                      <SelectContent>{SECTORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    {sector === 'Other' && <Input className="mt-2 border-[#f0f0f0]" placeholder="Specify sector" value={otherSector} onChange={e => setOtherSector(e.target.value)} />}
                  </div>
                  <div>
                    <Label>Overview</Label>
                    <Textarea className="mt-1 border-[#f0f0f0]" placeholder="Describe your idea in detail..." rows={4} value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                </>
              )}
              {section === 2 && (
                <>
                  <div><Label>Problem Statement</Label><Textarea className="mt-1 border-[#f0f0f0]" placeholder="What problem does your idea solve?" rows={3} value={problem} onChange={e => setProblem(e.target.value)} /></div>
                  <div><Label>Proposed Solution</Label><Textarea className="mt-1 border-[#f0f0f0]" placeholder="How does your idea solve this problem?" rows={3} value={solution} onChange={e => setSolution(e.target.value)} /></div>
                  <div><Label>Unique Value Proposition</Label><Input className="mt-1 border-[#f0f0f0]" placeholder="What makes your solution unique?" value={uniqueUVP} onChange={e => setUniqueUVP(e.target.value)} /></div>
                </>
              )}
              {section === 3 && (
                <>
                  <div><Label>Target Market</Label><Textarea className="mt-1 border-[#f0f0f0]" placeholder="Who are your target customers?" rows={2} value={targetMarket} onChange={e => setTargetMarket(e.target.value)} /></div>
                  <div>
                    <Label>Business Model</Label>
                    <Select value={revModel} onValueChange={setRevModel}>
                      <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select model" /></SelectTrigger>
                      <SelectContent>{REV_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    {revModel === 'Other' && <Input className="mt-2 border-[#f0f0f0]" placeholder="Specify model" value={otherRevModel} onChange={e => setOtherRevModel(e.target.value)} />}
                  </div>
                  <div><Label>Revenue Detail</Label><Textarea className="mt-1 border-[#f0f0f0]" placeholder="How will you generate revenue?" rows={2} value={revenueDetail} onChange={e => setRevenueDetail(e.target.value)} /></div>
                  <div>
                    <Label>Startup Stage</Label>
                    <Select value={stage} onValueChange={setStage}>
                      <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select stage" /></SelectTrigger>
                      <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {section === 4 && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Founder Name</Label><Input className="mt-1 border-[#f0f0f0]" value={founderName} onChange={e => setFounderName(e.target.value)} /></div>
                    <div><Label>Role</Label><Input className="mt-1 border-[#f0f0f0]" value={founderRole} onChange={e => setFounderRole(e.target.value)} /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div><Label>Co-Founder Name</Label><Input className="mt-1 border-[#f0f0f0]" placeholder="Optional" value={coFounderName} onChange={e => setCoFounderName(e.target.value)} /></div>
                    <div><Label>Co-Founder Role</Label><Input className="mt-1 border-[#f0f0f0]" placeholder="Optional" value={coFounderRole} onChange={e => setCoFounderRole(e.target.value)} /></div>
                  </div>
                  <div><Label>Team Description</Label><Textarea className="mt-1 border-[#f0f0f0]" placeholder="Brief description of your team's expertise..." rows={3} value={teamDesc} onChange={e => setTeamDesc(e.target.value)} /></div>
                </>
              )}
              {section === 5 && (
                <>
                  <p className="text-sm text-[#7e7e7e]">Upload supporting documents. Files are stored securely and only accessible to evaluators.</p>
                  {[
                    { label: 'Pitch Deck', hint: 'PDF, PPT or PPTX (max 20MB)' },
                    { label: 'Lean Canvas', hint: 'PDF or image (max 10MB)' },
                    { label: 'Additional Documents', hint: 'Financial projections, market research, etc.' },
                  ].map(doc => (
                    <div key={doc.label}>
                      <Label>{doc.label}</Label>
                      <div className="mt-2 border-2 border-dashed border-[#f0f0f0] rounded-lg p-6 text-center hover:border-[#e33b5f]/30 transition cursor-pointer">
                        <Upload className="w-8 h-8 text-[#9e9e9e] mx-auto mb-2" />
                        <p className="text-sm text-[#555353] font-medium">Click to upload {doc.label}</p>
                        <p className="text-xs text-[#9e9e9e] mt-1">{doc.hint}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-[#9e9e9e]">File upload to Supabase Storage coming in the next update. For now you can submit without files.</p>
                </>
              )}

              {saveMsg && <p className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" />{saveMsg}</p>}

              <div className="flex justify-between pt-4">
                {section > 1 ? <Button variant="outline" onClick={() => setSection(s => s - 1)}>Previous</Button> : <div />}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={saveDraft} disabled={saving || !title.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Draft
                  </Button>
                  {section < 5
                    ? <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white" onClick={() => setSection(s => s + 1)}>
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    : <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={submitIdea} disabled={submitting || !title.trim()}>
                        {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</> : <>Submit Idea <CheckCircle className="w-4 h-4 ml-2" /></>}
                      </Button>
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
