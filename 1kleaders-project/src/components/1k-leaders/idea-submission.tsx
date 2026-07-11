'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Upload, CheckCircle, Save, Clock, Lightbulb, ArrowRight, Loader2,
  RefreshCw, Eye, Trash2, FileText, Video, AlertTriangle, X
} from 'lucide-react';
import type { DashboardRole } from './types';
import IdeaAIAssistant from './idea-ai-assistant';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { role: DashboardRole; navigate: (page: string) => void; }

const SECTORS = ['FinTech','HealthTech','EdTech','PropTech','CleanTech','AgriTech','E-Commerce','SaaS','AI/ML','Logistics','Energy','Media','Real Estate','Tourism','Other'];
const REV_MODELS = ['SaaS Subscription','Marketplace','Freemium','Licensing','Direct Sales','Advertising','Transaction Fee','Other'];
const STAGES = ['Idea Stage','Pre-Seed','Seed','Series A','Growth'];
const TECH_BASIS = ['AI/ML','Blockchain','IoT','Mobile App','Web Platform','Hardware','Biotech','No-Tech / Service','Other'];
const CO_FOUNDER_COMMITMENT = ['Full-time','Part-time','Advisory only','Not yet decided'];
const SECTIONS = [
  'Basic Info',
  'Problem & Solution',
  'Market & Business',
  'Team & Founders',
  'Uploads',
  'Legal Acknowledgment',
];

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

type UploadedFile = { file: File; path: string | null; uploading: boolean; error: string | null };

function FileUploadBox({
  label, hint, required, accept, value, onChange,
}: {
  label: string; hint: string; required?: boolean; accept: string;
  value: UploadedFile | null; onChange: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <Label className="text-sm">
        {label}{required && <span className="text-[#e33b5f] ml-1">*</span>}
      </Label>
      <div
        onClick={() => ref.current?.click()}
        className={`mt-1 border-2 border-dashed rounded-lg p-5 text-center hover:border-[#e33b5f]/40 hover:bg-[#e33b5f]/5 transition cursor-pointer ${value ? 'border-emerald-300 bg-emerald-50' : 'border-[#e8e8e8]'}`}
      >
        {value ? (
          <div className="flex items-center gap-2 justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-700 truncate">{value.file.name}</span>
            <span className="text-xs text-[#9e9e9e]">({(value.file.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-[#9e9e9e] mx-auto mb-1" />
            <p className="text-sm text-[#555353] font-medium">Click to upload {label}</p>
            <p className="text-xs text-[#9e9e9e] mt-0.5">{hint}</p>
          </>
        )}
      </div>
      <input ref={ref} type="file" className="hidden" accept={accept}
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ''; }} />
    </div>
  );
}

export default function IdeaSubmission({ role, navigate }: Props) {
  const { profile } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  // Who can submit: shareholders, idea-owners, admins
  const canSubmit = profile?.subroles?.includes('idea-owner') ||
    role === 'shareholder' || isAdmin;

  // Active cohort
  const [activeCohort, setActiveCohort] = useState<{
    id: string; name: string; closes_at: string | null;
    max_ideas: number; idea_count: number;
    eligible_roles: string[]; eligible_subroles: string[];
    require_subrole: boolean;
  } | null>(null);
  const [cohortLoading, setCohortLoading] = useState(true);
  const [cohortFull, setCohortFull] = useState(false);

  // My ideas
  const [myIdeas, setMyIdeas] = useState<DbIdea[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [section, setSection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  // Section 1 — Basic Info
  const [title, setTitle] = useState('');
  const [sector, setSector] = useState('');
  const [otherSector, setOtherSector] = useState('');
  const [tagline, setTagline] = useState('');
  const [techBasis, setTechBasis] = useState('');
  const [otherTech, setOtherTech] = useState('');
  const [stage, setStage] = useState('');

  // Section 2 — Problem & Solution
  const [problem, setProblem] = useState('');
  const [solution, setSolution] = useState('');
  const [uniqueUVP, setUniqueUVP] = useState('');

  // Section 3 — Market & Business
  const [targetMarket, setTargetMarket] = useState('');
  const [targetCustomer, setTargetCustomer] = useState('');
  const [revModel, setRevModel] = useState('');
  const [otherRevModel, setOtherRevModel] = useState('');
  const [revenueDetail, setRevenueDetail] = useState('');
  const [mvpCost, setMvpCost] = useState('');
  const [mvpTimeline, setMvpTimeline] = useState('');
  const [revenueTimeline, setRevenueTimeline] = useState('');

  // Section 4 — Team
  const [founderName, setFounderName] = useState('');
  const [founderRole, setFounderRole] = useState('CEO / Founder');
  const [coFounderName, setCoFounderName] = useState('');
  const [coFounderRole, setCoFounderRole] = useState('');
  const [coFounderCommitment, setCoFounderCommitment] = useState('');
  const [teamDesc, setTeamDesc] = useState('');

  // Section 5 — Uploads
  const [leanCanvas, setLeanCanvas] = useState<UploadedFile | null>(null);
  const [founderVideo, setFounderVideo] = useState<UploadedFile | null>(null);
  const [pitchDeck, setPitchDeck] = useState<UploadedFile | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Section 6 — Legal
  const [legalAccepted, setLegalAccepted] = useState(false);

  useEffect(() => {
    if (profile) {
      setFounderName(`${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim());
    }
  }, [profile]);

  useEffect(() => {
    fetchMyIdeas();
    async function fetchActiveCohort() {
      if (!profile) return;
      setCohortLoading(true);
      const { data } = await supabase
        .from('cohorts')
        .select('id, name, closes_at, max_ideas, idea_count, eligible_roles, eligible_subroles, require_subrole')
        .eq('status', 'open')
        .order('opens_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const roleOk = (data.eligible_roles ?? []).includes(profile.role);
        const subroleOk = !data.require_subrole ||
          (data.eligible_subroles ?? ['idea-owner']).some((sr: string) =>
            profile.subroles?.includes(sr)
          );
        if (isAdmin || (roleOk && subroleOk)) {
          setActiveCohort(data);
          setCohortFull((data.idea_count ?? 0) >= data.max_ideas);
        } else {
          setActiveCohort(null);
        }
      } else {
        setActiveCohort(null);
      }
      setCohortLoading(false);
    }
    fetchActiveCohort();
  }, [profile?.id]);

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

  async function uploadFile(file: File, folder: string): Promise<string | null> {
    if (!profile) return null;
    const path = `${profile.id}/${folder}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('ideas-files').upload(path, file, { upsert: true });
    if (error) { console.error('Upload error:', error); return null; }
    return path;
  }

  async function uploadAllFiles(): Promise<{ lean_canvas_path: string | null; pitch_deck_path: string | null; founder_video_url: string | null }> {
    setUploadingFiles(true);
    const [lcPath, pdPath, fvPath] = await Promise.all([
      leanCanvas ? uploadFile(leanCanvas.file, 'lean-canvas') : Promise.resolve(null),
      pitchDeck  ? uploadFile(pitchDeck.file,  'pitch-deck')  : Promise.resolve(null),
      founderVideo ? uploadFile(founderVideo.file, 'founder-video') : Promise.resolve(null),
    ]);
    setUploadingFiles(false);
    return { lean_canvas_path: lcPath, pitch_deck_path: pdPath, founder_video_url: fvPath };
  }

  const ideaPayload = (paths: { lean_canvas_path: string | null; pitch_deck_path: string | null; founder_video_url: string | null }) => ({
    submitted_by:      profile!.id,
    title:             title.trim() || 'Untitled Idea',
    tagline:           tagline.trim() || null,
    sector:            sector === 'Other' ? otherSector : sector || null,
    stage:             stage || null,
    problem:           problem.trim() || null,
    solution:          solution.trim() || null,
    competitive_edge:  uniqueUVP.trim() || null,
    target_market:     targetMarket.trim() || null,
    revenue_model:     revModel === 'Other' ? otherRevModel : revModel || null,
    cohort_id:         activeCohort?.id ?? null,
    // Extended fields
    tech_basis:         techBasis === 'Other' ? otherTech : techBasis || null,
    target_customer:    targetCustomer.trim() || null,
    revenue_detail:     revenueDetail.trim() || null,
    mvp_cost:           mvpCost.trim() || null,
    mvp_timeline:       mvpTimeline.trim() || null,
    revenue_timeline:   revenueTimeline.trim() || null,
    founder_name:       founderName.trim() || null,
    founder_role:       founderRole.trim() || null,
    co_founder_name:    coFounderName.trim() || null,
    co_founder_role:    coFounderRole.trim() || null,
    co_founder_commitment: coFounderCommitment || null,
    team_description:   teamDesc.trim() || null,
    lean_canvas_path:   paths.lean_canvas_path,
    pitch_deck_path:    paths.pitch_deck_path,
    founder_video_url:  paths.founder_video_url,
    updated_at:         new Date().toISOString(),
  });

  async function saveDraft() {
    if (!profile) return;
    setSaving(true); setSaveMsg('');
    const paths = { lean_canvas_path: null, pitch_deck_path: null, founder_video_url: null };
    const payload = { ...ideaPayload(paths), status: 'Draft' };
    if (draftId) {
      await supabase.from('ideas').update(payload).eq('id', draftId);
    } else {
      const { data } = await supabase.from('ideas').insert(payload).select('id').single();
      if (data) setDraftId(data.id);
    }
    setSaving(false); setSaveMsg('Draft saved');
    setTimeout(() => setSaveMsg(''), 3000);
    fetchMyIdeas();
  }

  async function submitIdea() {
    if (!profile || !title.trim() || !legalAccepted) return;
    setSubmitting(true);
    const paths = await uploadAllFiles();
    const payload = { ...ideaPayload(paths), status: 'Submitted' };
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
    setTitle(''); setSector(''); setTagline(''); setTechBasis(''); setStage('');
    setProblem(''); setSolution(''); setUniqueUVP('');
    setTargetMarket(''); setTargetCustomer(''); setRevModel('');
    setRevenueDetail(''); setMvpCost(''); setMvpTimeline(''); setRevenueTimeline('');
    setCoFounderName(''); setCoFounderRole(''); setCoFounderCommitment(''); setTeamDesc('');
    setLeanCanvas(null); setFounderVideo(null); setPitchDeck(null); setAttachments([]);
    setLegalAccepted(false);
  }

  const progress = (section / SECTIONS.length) * 100;

  // Access gates
  if (!canSubmit) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-[#222]">Idea Submission</h1></div>
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-8 text-center space-y-4">
            <Lightbulb className="w-12 h-12 text-[#9e9e9e] mx-auto" />
            <h3 className="text-lg font-semibold text-[#222]">Access Required</h3>
            <p className="text-sm text-[#7e7e7e] max-w-sm mx-auto">
              Idea submission is available to shareholders and users with the Idea Owner badge.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin && !cohortLoading && !activeCohort) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-[#222]">Idea Submission</h1></div>
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-8 text-center space-y-4">
            <Clock className="w-12 h-12 text-[#9e9e9e] mx-auto" />
            <h3 className="text-lg font-semibold text-[#222]">No Active Cohort</h3>
            <p className="text-sm text-[#7e7e7e] max-w-sm mx-auto">
              Idea submissions are only open during an active cohort. The 1K Leaders team will announce the next opening date.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin && !cohortLoading && cohortFull) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-bold text-[#222]">Idea Submission</h1></div>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center space-y-4">
            <Lightbulb className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-semibold text-[#222]">{activeCohort?.name} is Full</h3>
            <p className="text-sm text-[#7e7e7e] max-w-sm mx-auto">
              This cohort has reached its maximum ({activeCohort?.max_ideas} submissions).
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
            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white"
              onClick={() => { resetForm(); setShowForm(true); }}>
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
          <div className="w-24 h-1.5 bg-emerald-200 rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${Math.min(100, ((activeCohort.idea_count ?? 0) / activeCohort.max_ideas) * 100)}%` }} />
          </div>
        </div>
      )}

      {!showForm && !activeCohort && isAdmin && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">No active cohort — public submissions are closed. Open a cohort from Cohort Management.</p>
        </div>
      )}

      {/* My ideas list */}
      {!showForm && (
        <>
          {loadingList ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[#7e7e7e]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : myIdeas.length === 0 ? (
            <Card className="border-dashed border-[#f0f0f0]">
              <CardContent className="p-8 text-center space-y-3">
                <Lightbulb className="w-10 h-10 text-[#9e9e9e] mx-auto" />
                <p className="text-sm text-[#7e7e7e]">You haven't submitted any ideas yet.</p>
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
            <h2 className="text-lg font-semibold text-[#222]">{draftId ? 'Continue Idea' : 'New Idea Submission'}</h2>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); fetchMyIdeas(); }}>← Back</Button>
          </div>

          <Progress value={progress} className="h-2" />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {SECTIONS.map((s, i) => (
              <button key={s} onClick={() => setSection(i + 1)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  section === i + 1 ? 'bg-[#e33b5f] text-white' :
                  section > i + 1   ? 'bg-[#e33b5f]/10 text-[#c02d4f]' :
                  'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
                {section > i + 1 && <CheckCircle className="w-3 h-3 inline mr-1" />}{s}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">{SECTIONS[section - 1]}</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Section 1 — Basic Info */}
              {section === 1 && (
                <>
                  <div>
                    <Label>Idea / Startup Name <span className="text-[#e33b5f]">*</span></Label>
                    <Input className="mt-1 border-[#f0f0f0]" placeholder="Give your idea a compelling name" value={title} onChange={e => setTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tagline</Label>
                    <Input className="mt-1 border-[#f0f0f0]" placeholder="One-sentence pitch" value={tagline} onChange={e => setTagline(e.target.value)} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Sector <span className="text-[#e33b5f]">*</span></Label>
                      <Select value={sector} onValueChange={setSector}>
                        <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select sector" /></SelectTrigger>
                        <SelectContent>{SECTORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                      {sector === 'Other' && <Input className="mt-2 border-[#f0f0f0]" placeholder="Specify sector" value={otherSector} onChange={e => setOtherSector(e.target.value)} />}
                    </div>
                    <div>
                      <Label>Startup Stage</Label>
                      <Select value={stage} onValueChange={setStage}>
                        <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select stage" /></SelectTrigger>
                        <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Technology Basis <span className="text-[#e33b5f]">*</span></Label>
                    <Select value={techBasis} onValueChange={setTechBasis}>
                      <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="What technology does this use?" /></SelectTrigger>
                      <SelectContent>{TECH_BASIS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    {techBasis === 'Other' && <Input className="mt-2 border-[#f0f0f0]" placeholder="Specify technology" value={otherTech} onChange={e => setOtherTech(e.target.value)} />}
                  </div>
                </>
              )}

              {/* Section 2 — Problem & Solution */}
              {section === 2 && (
                <>
                  <div>
                    <Label>Problem Statement <span className="text-[#e33b5f]">*</span></Label>
                    <Textarea className="mt-1 border-[#f0f0f0]" placeholder="What problem does your idea solve?" rows={3} value={problem} onChange={e => setProblem(e.target.value)} />
                  </div>
                  <div>
                    <Label>Proposed Solution <span className="text-[#e33b5f]">*</span></Label>
                    <Textarea className="mt-1 border-[#f0f0f0]" placeholder="How does your idea solve this problem?" rows={3} value={solution} onChange={e => setSolution(e.target.value)} />
                  </div>
                  <div>
                    <Label>Unique Value Proposition / Competitive Advantage</Label>
                    <Input className="mt-1 border-[#f0f0f0]" placeholder="What makes your solution unique?" value={uniqueUVP} onChange={e => setUniqueUVP(e.target.value)} />
                  </div>
                </>
              )}

              {/* Section 3 — Market & Business */}
              {section === 3 && (
                <>
                  <div>
                    <Label>Target Market <span className="text-[#e33b5f]">*</span></Label>
                    <Textarea className="mt-1 border-[#f0f0f0]" placeholder="Describe the market (geography, size, trends)" rows={2} value={targetMarket} onChange={e => setTargetMarket(e.target.value)} />
                  </div>
                  <div>
                    <Label>Target Customer <span className="text-[#e33b5f]">*</span></Label>
                    <Input className="mt-1 border-[#f0f0f0]" placeholder="Who is your specific customer? (e.g. SME owners in the UAE)" value={targetCustomer} onChange={e => setTargetCustomer(e.target.value)} />
                  </div>
                  <div>
                    <Label>Revenue Model <span className="text-[#e33b5f]">*</span></Label>
                    <Select value={revModel} onValueChange={setRevModel}>
                      <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Select model" /></SelectTrigger>
                      <SelectContent>{REV_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                    {revModel === 'Other' && <Input className="mt-2 border-[#f0f0f0]" placeholder="Specify model" value={otherRevModel} onChange={e => setOtherRevModel(e.target.value)} />}
                  </div>
                  <div>
                    <Label>Revenue Detail</Label>
                    <Textarea className="mt-1 border-[#f0f0f0]" placeholder="How specifically will you generate revenue?" rows={2} value={revenueDetail} onChange={e => setRevenueDetail(e.target.value)} />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Expected MVP Cost <span className="text-[#e33b5f]">*</span></Label>
                      <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. $50,000" value={mvpCost} onChange={e => setMvpCost(e.target.value)} />
                    </div>
                    <div>
                      <Label>MVP Timeline <span className="text-[#e33b5f]">*</span></Label>
                      <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. 6 months" value={mvpTimeline} onChange={e => setMvpTimeline(e.target.value)} />
                    </div>
                    <div>
                      <Label>Revenue Timeline <span className="text-[#e33b5f]">*</span></Label>
                      <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. Month 9" value={revenueTimeline} onChange={e => setRevenueTimeline(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* Section 4 — Team */}
              {section === 4 && (
                <>
                  <p className="text-sm text-[#7e7e7e]">Tell us about the founding team.</p>
                  <Separator />
                  <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Lead Founder</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name <span className="text-[#e33b5f]">*</span></Label>
                      <Input className="mt-1 border-[#f0f0f0]" value={founderName} onChange={e => setFounderName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Role / Title</Label>
                      <Input className="mt-1 border-[#f0f0f0]" value={founderRole} onChange={e => setFounderRole(e.target.value)} />
                    </div>
                  </div>
                  <Separator />
                  <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Co-Founder (if any)</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Co-Founder Name</Label>
                      <Input className="mt-1 border-[#f0f0f0]" placeholder="Optional" value={coFounderName} onChange={e => setCoFounderName(e.target.value)} />
                    </div>
                    <div>
                      <Label>Co-Founder Role</Label>
                      <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. CTO" value={coFounderRole} onChange={e => setCoFounderRole(e.target.value)} />
                    </div>
                  </div>
                  {coFounderName && (
                    <div>
                      <Label>Co-Founder Commitment</Label>
                      <Select value={coFounderCommitment} onValueChange={setCoFounderCommitment}>
                        <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue placeholder="Level of involvement" /></SelectTrigger>
                        <SelectContent>{CO_FOUNDER_COMMITMENT.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label>Team Background</Label>
                    <Textarea className="mt-1 border-[#f0f0f0]" placeholder="Brief summary of the team's relevant expertise and experience..." rows={3} value={teamDesc} onChange={e => setTeamDesc(e.target.value)} />
                  </div>
                </>
              )}

              {/* Section 5 — Uploads */}
              {section === 5 && (
                <>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800">
                      <strong>Lean Canvas and Founder Video are required for submission.</strong> Pitch deck and attachments are optional but recommended.
                    </p>
                  </div>

                  <FileUploadBox
                    label="Lean Canvas" required
                    hint="PDF or image — captures your business model logic (max 10MB)"
                    accept=".pdf,.jpg,.jpeg,.png"
                    value={leanCanvas}
                    onChange={f => setLeanCanvas({ file: f, path: null, uploading: false, error: null })}
                  />

                  <FileUploadBox
                    label="Founder Video (3–5 minutes)" required
                    hint="MP4 or MOV — cover: problem, solution, USP, market, competitors, revenue model (max 500MB)"
                    accept=".mp4,.mov,.avi,.webm"
                    value={founderVideo}
                    onChange={f => setFounderVideo({ file: f, path: null, uploading: false, error: null })}
                  />

                  <FileUploadBox
                    label="Pitch Deck"
                    hint="PDF, PPT or PPTX — optional but recommended (max 20MB)"
                    accept=".pdf,.ppt,.pptx"
                    value={pitchDeck}
                    onChange={f => setPitchDeck({ file: f, path: null, uploading: false, error: null })}
                  />

                  <div>
                    <Label className="text-sm">Supporting Attachments</Label>
                    <p className="text-xs text-[#7e7e7e] mb-2">Financial projections, market research, patents, etc. (optional)</p>
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = '.pdf,.xlsx,.docx,.jpg,.png';
                        input.onchange = e => {
                          const files = Array.from((e.target as HTMLInputElement).files ?? []);
                          setAttachments(prev => [...prev, ...files.map(f => ({ file: f, path: null, uploading: false, error: null }))]);
                        };
                        input.click();
                      }}
                      className="border-2 border-dashed border-[#e8e8e8] rounded-lg p-4 text-center hover:border-[#e33b5f]/40 transition cursor-pointer w-full"
                    >
                      <Upload className="w-5 h-5 text-[#9e9e9e] mx-auto mb-1" />
                      <p className="text-xs text-[#555353]">Click to add attachments</p>
                    </button>
                    {attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {attachments.map((a, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-[#f6f6f6] rounded p-2">
                            <FileText className="w-3.5 h-3.5 text-[#9e9e9e]" />
                            <span className="flex-1 truncate">{a.file.name}</span>
                            <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                              <X className="w-3.5 h-3.5 text-[#9e9e9e] hover:text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Section 6 — Legal Acknowledgment */}
              {section === 6 && (
                <>
                  <div className="p-4 bg-[#f6f6f6] border border-[#e8e8e8] rounded-lg space-y-3 max-h-60 overflow-y-auto text-xs text-[#555353]">
                    <p className="font-semibold text-[#222] text-sm">Idea Submission — Legal Acknowledgment</p>
                    <p>By submitting this idea to 1K Leaders, I acknowledge and agree to the following:</p>
                    <ol className="list-decimal pl-4 space-y-2">
                      <li><strong>No automatic rights:</strong> Submitting this idea does not automatically grant me equity, compensation, acceptance, ownership rights, or any other rights in 1KL Holdings Limited or any related entity, unless separately agreed in writing.</li>
                      <li><strong>Confidentiality:</strong> I understand that 1K Leaders will treat my submission as confidential and will not share it with unauthorised parties. I also commit to keeping all information I access through this platform strictly confidential.</li>
                      <li><strong>Originality:</strong> I confirm that this idea is original, that I have the right to submit it, and that it does not knowingly infringe on any third-party intellectual property rights.</li>
                      <li><strong>Evaluation process:</strong> I understand that my idea will be reviewed by a Quality Team, evaluated by the Venture Evaluation Panel (VEP), and may be assessed by the Management Advisory Board (MAB). These parties may share feedback and assessments internally.</li>
                      <li><strong>No guarantee of selection:</strong> I understand there is no guarantee that my idea will be selected, funded, or advanced to any stage of the evaluation process.</li>
                      <li><strong>Platform terms:</strong> I confirm I have read and agree to the 1K Leaders platform terms of use and confidentiality policy.</li>
                    </ol>
                    <p>This acknowledgment is governed by the laws of Abu Dhabi Global Markets (ADGM).</p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer p-3 border border-[#f0f0f0] rounded-lg hover:bg-[#fafafa] transition">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-[#e33b5f] w-4 h-4 flex-shrink-0"
                      checked={legalAccepted}
                      onChange={e => setLegalAccepted(e.target.checked)}
                    />
                    <span className="text-sm text-[#333]">
                      I have read and agree to the above terms. I understand that submitting this idea does not automatically grant me any equity, compensation, or ownership rights.
                    </span>
                  </label>

                  {!legalAccepted && (
                    <p className="text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      You must accept the legal acknowledgment before submitting.
                    </p>
                  )}

                  {(!leanCanvas || !founderVideo) && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-red-700">
                        <p className="font-medium mb-1">Missing required uploads:</p>
                        {!leanCanvas && <p>• Lean Canvas is required</p>}
                        {!founderVideo && <p>• Founder Video is required</p>}
                        <button className="text-red-600 underline mt-1" onClick={() => setSection(5)}>← Go back to uploads</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {saveMsg && (
                <p className="text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />{saveMsg}
                </p>
              )}

              <div className="flex justify-between pt-4">
                {section > 1
                  ? <Button variant="outline" onClick={() => setSection(s => s - 1)}>← Previous</Button>
                  : <div />
                }
                <div className="flex gap-2">
                  <Button variant="outline" onClick={saveDraft} disabled={saving || !title.trim()}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Draft
                  </Button>
                  {section < SECTIONS.length
                    ? <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white"
                        onClick={() => setSection(s => s + 1)}>
                        Next <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    : <Button
                        className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white"
                        onClick={submitIdea}
                        disabled={submitting || !title.trim() || !legalAccepted || !leanCanvas || !founderVideo || uploadingFiles}>
                        {submitting || uploadingFiles
                          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploadingFiles ? 'Uploading...' : 'Submitting...'}</>
                          : <>Submit Idea <CheckCircle className="w-4 h-4 ml-2" /></>
                        }
                      </Button>
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating AI assistant — only show during form */}
      {showForm && (
        <IdeaAIAssistant context={{
          title,
          sector,
          problem,
          solution,
          targetMarket,
          targetCustomer,
          revModel,
          currentSection: section,
        }} />
      )}
    </div>
  );
}
