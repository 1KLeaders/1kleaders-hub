'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList, CheckCircle2, XCircle, ChevronRight,
  Loader2, RefreshCw, Shield, AlertTriangle, FileText, Video
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const CHECKLIST = [
  { id: 'clear_problem',     label: 'Clear Problem Statement',        desc: 'The problem being solved is clearly articulated and specific.' },
  { id: 'viable_solution',   label: 'Viable Solution',                desc: 'The proposed solution is feasible and addresses the problem.' },
  { id: 'market_defined',    label: 'Market Clearly Defined',         desc: 'Target market and customer are identified with reasonable specificity.' },
  { id: 'revenue_model',     label: 'Revenue Model Explained',        desc: 'A credible path to revenue is described.' },
  { id: 'team_background',   label: 'Founder/Team Background',        desc: 'Founder information and team background provided.' },
  { id: 'lean_canvas',       label: 'Lean Canvas Uploaded',           desc: 'Lean Canvas document has been submitted.' },
  { id: 'founder_video',     label: 'Founder Video Submitted',        desc: '3–5 minute founder video covering problem, solution, market, and model.' },
  { id: 'no_plagiarism',     label: 'No Plagiarism / Duplication',    desc: 'Idea does not appear to be copied or substantially similar to an existing submission.' },
  { id: 'mvp_defined',       label: 'MVP Cost & Timeline Defined',    desc: 'Estimated MVP cost and development timeline are provided.' },
  { id: 'legal_accepted',    label: 'Legal Acknowledgment Accepted',  desc: 'Submitter has accepted the legal terms and IP acknowledgment.' },
];

type QualityReview = {
  id?: string;
  idea_id: string;
  reviewer_id: string;
  checks: Record<string, boolean>;
  notes: string;
  decision: 'approve' | 'reject' | 'request-info' | null;
  status: 'in-progress' | 'submitted';
};

type Idea = {
  id: string;
  title: string;
  sector: string | null;
  status: string;
  submitter_name: string;
  created_at: string;
  lean_canvas_path: string | null;
  founder_video_url: string | null;
  problem: string | null;
  solution: string | null;
  target_market: string | null;
  target_customer: string | null;
  revenue_model: string | null;
  mvp_cost: string | null;
  mvp_timeline: string | null;
  founder_name: string | null;
  team_description: string | null;
};

function emptyReview(ideaId: string, reviewerId: string): QualityReview {
  return {
    idea_id: ideaId, reviewer_id: reviewerId,
    checks: Object.fromEntries(CHECKLIST.map(c => [c.id, false])),
    notes: '', decision: null, status: 'in-progress',
  };
}

export default function QualityReview() {
  const { profile } = useAuth();
  const isAdmin = ['admin', 'super-admin', 'developer'].includes(profile?.role ?? '');

  const [ideas,       setIdeas]       = useState<Idea[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [review,      setReview]      = useState<QualityReview | null>(null);
  const [saving,      setSaving]      = useState(false);

  async function fetchIdeas() {
    setLoading(true);
    const { data: ideaData } = await supabase
      .from('ideas')
      .select(`id, title, sector, status, submitted_by, created_at,
        lean_canvas_path, founder_video_url, problem, solution,
        target_market, target_customer, revenue_model,
        mvp_cost, mvp_timeline, founder_name, team_description`)
      .in('status', ['Submitted', 'Under Quality Review'])
      .order('created_at');

    if (!ideaData?.length) { setIdeas([]); setLoading(false); return; }

    const userIds = [...new Set(ideaData.map(i => i.submitted_by))];
    const { data: profiles } = await supabase.from('profiles')
      .select('id, first_name, last_name').in('id', userIds);
    const nameMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown'])
    );

    setIdeas(ideaData.map(i => ({ ...i, submitter_name: nameMap[i.submitted_by] ?? '—' })) as Idea[]);
    setLoading(false);
  }

  useEffect(() => { fetchIdeas(); }, []);

  async function openReview(idea: Idea) {
    if (!profile) return;
    // Mark as under review
    if (idea.status === 'Submitted') {
      await supabase.from('ideas').update({ status: 'Under Quality Review' }).eq('id', idea.id);
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: 'Under Quality Review' } : i));
    }
    // Load existing review if any
    const { data: existing } = await supabase
      .from('quality_reviews')
      .select('*')
      .eq('idea_id', idea.id)
      .eq('reviewer_id', profile.id)
      .maybeSingle();

    setReview(existing
      ? { ...existing, checks: existing.checks ?? {}, decision: existing.decision ?? null }
      : emptyReview(idea.id, profile.id));
    setSelectedId(idea.id);
  }

  function toggleCheck(id: string) {
    setReview(prev => prev ? { ...prev, checks: { ...prev.checks, [id]: !prev.checks[id] } } : prev);
  }

  async function saveReview(submit: boolean) {
    if (!profile || !review || !selectedId) return;
    setSaving(true);
    const payload = {
      idea_id:     selectedId,
      reviewer_id: profile.id,
      checks:      review.checks,
      notes:       review.notes,
      decision:    submit ? review.decision : review.decision,
      status:      submit ? 'submitted' : 'in-progress',
    };
    await supabase.from('quality_reviews').upsert(payload, { onConflict: 'idea_id,reviewer_id' });

    if (submit && review.decision) {
      const newStatus =
        review.decision === 'approve'       ? 'Quality Approved' :
        review.decision === 'reject'        ? 'Rejected' : 'Under Quality Review';
      await supabase.from('ideas').update({ status: newStatus }).eq('id', selectedId);
      // Notify submitter
      const { data: idea } = await supabase.from('ideas').select('submitted_by, title').eq('id', selectedId).single();
      if (idea) {
        await supabase.from('notifications').insert({
          user_id:           idea.submitted_by,
          title:             `Quality Review: ${review.decision === 'approve' ? 'Approved ✓' : review.decision === 'reject' ? 'Not Approved' : 'More Info Needed'}`,
          message:           `Your idea "${idea.title}" has completed quality review. Status: ${newStatus}.${review.notes ? ` Reviewer notes: ${review.notes}` : ''}`,
          notification_type: review.decision === 'approve' ? 'success' : review.decision === 'reject' ? 'warning' : 'info',
          is_read:           false,
        });
      }
      setSelectedId(null);
      fetchIdeas();
    }
    setSaving(false);
  }

  const idea = ideas.find(i => i.id === selectedId);
  const passCount = review ? Object.values(review.checks).filter(Boolean).length : 0;
  const pct = (passCount / CHECKLIST.length) * 100;
  const allChecked = passCount === CHECKLIST.length;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-3">
            <Shield className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">Admin Access Required</h3>
            <p className="text-sm text-[#7e7e7e]">Quality review is only available to admins.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Review form
  if (selectedId && idea && review) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedId(null)} className="text-sm text-[#7e7e7e] hover:text-[#222]">← Back</button>
          <ChevronRight className="w-4 h-4 text-[#d0d0d0]" />
          <span className="text-sm font-medium text-[#222] truncate">{idea.title}</span>
        </div>

        {/* Idea summary */}
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-[#222]">{idea.title}</h2>
                <p className="text-sm text-[#7e7e7e]">By {idea.submitter_name} · {idea.sector} · {new Date(idea.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                {idea.lean_canvas_path && <Badge className="bg-emerald-100 text-emerald-700 text-xs flex items-center gap-1"><FileText className="w-3 h-3" />Lean Canvas</Badge>}
                {idea.founder_video_url && <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1"><Video className="w-3 h-3" />Video</Badge>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Problem',        value: idea.problem },
                { label: 'Solution',       value: idea.solution },
                { label: 'Target Market',  value: idea.target_market },
                { label: 'Target Customer',value: idea.target_customer },
                { label: 'Revenue Model',  value: idea.revenue_model },
                { label: 'MVP Cost',       value: idea.mvp_cost },
                { label: 'MVP Timeline',   value: idea.mvp_timeline },
                { label: 'Founder',        value: idea.founder_name },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <p className="font-semibold text-[#9e9e9e] uppercase tracking-wider text-[10px]">{f.label}</p>
                  <p className="text-[#444] mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Score progress */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#222]">Checklist Progress</p>
          <span className="text-lg font-bold text-[#e33b5f]">{passCount} / {CHECKLIST.length}</span>
        </div>
        <Progress value={pct} className="h-2" />

        {/* Checklist */}
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-0">
            {CHECKLIST.map((item, i) => {
              const checked = review.checks[item.id] ?? false;
              return (
                <div key={item.id} onClick={() => toggleCheck(item.id)}
                  className={`flex items-start gap-3 p-4 cursor-pointer border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition ${checked ? 'bg-emerald-50/50' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 transition ${checked ? 'bg-emerald-500' : 'border-2 border-[#d0d0d0]'}`}>
                    {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${checked ? 'text-emerald-800' : 'text-[#222]'}`}>
                      {i + 1}. {item.label}
                    </p>
                    <p className="text-xs text-[#7e7e7e] mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-[#222]">Reviewer Notes</p>
            <Textarea placeholder="Add any notes for the submitter or internal reference..." rows={3} className="border-[#f0f0f0]"
              value={review.notes} onChange={e => setReview(prev => prev ? { ...prev, notes: e.target.value } : prev)} />

            <p className="text-sm font-semibold text-[#222]">Decision <span className="text-[#e33b5f]">*</span></p>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'approve',      label: '✓ Approve — Move to VEP',      color: 'bg-emerald-500 text-white border-emerald-500' },
                { key: 'request-info', label: '? Request More Information',     color: 'bg-amber-500 text-white border-amber-500' },
                { key: 'reject',       label: '✕ Reject',                      color: 'bg-red-500 text-white border-red-500' },
              ].map(d => (
                <button key={d.key} onClick={() => setReview(prev => prev ? { ...prev, decision: d.key as any } : prev)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${review.decision === d.key ? d.color : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]/30'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {!allChecked && review.decision === 'approve' && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {CHECKLIST.length - passCount} checklist item{CHECKLIST.length - passCount !== 1 ? 's' : ''} not yet checked. You can still approve but consider reviewing those items first.
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => saveReview(false)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save Progress
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white"
            disabled={!review.decision || saving}
            onClick={() => saveReview(true)}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Submit Review
          </Button>
        </div>
      </div>
    );
  }

  // Idea list
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-[#e33b5f]" /> Quality Review
          </h1>
          <p className="text-[#7e7e7e]">10-point checklist review for submitted ideas</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchIdeas} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Awaiting Review',   value: loading ? '—' : ideas.filter(i => i.status === 'Submitted').length,             color: 'text-[#f07969]' },
          { label: 'Under Review',      value: loading ? '—' : ideas.filter(i => i.status === 'Under Quality Review').length,  color: 'text-amber-600' },
          { label: 'Total in Queue',    value: loading ? '—' : ideas.length,                                                    color: 'text-[#222]' },
        ].map(s => (
          <Card key={s.label} className="border-[#f0f0f0]">
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-[#7e7e7e] mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading ideas...
        </div>
      ) : ideas.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-10 text-center space-y-3">
            <ClipboardList className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">No ideas awaiting review</h3>
            <p className="text-sm text-[#7e7e7e]">Ideas will appear here once submitted by partners.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#f0f0f0]">
          <CardHeader><CardTitle className="text-base">Ideas in Queue</CardTitle></CardHeader>
          <CardContent className="p-0">
            {ideas.map(idea => (
              <div key={idea.id} className="flex items-center gap-4 p-4 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm text-[#222]">{idea.title}</p>
                    <Badge className={idea.status === 'Submitted' ? 'bg-blue-100 text-blue-700 text-xs' : 'bg-amber-100 text-amber-700 text-xs'}>
                      {idea.status}
                    </Badge>
                    {idea.lean_canvas_path && <Badge className="bg-emerald-100 text-emerald-700 text-xs"><FileText className="w-3 h-3 mr-1 inline" />Lean Canvas</Badge>}
                    {idea.founder_video_url && <Badge className="bg-blue-100 text-blue-700 text-xs"><Video className="w-3 h-3 mr-1 inline" />Video</Badge>}
                  </div>
                  <p className="text-xs text-[#7e7e7e]">{idea.submitter_name} · {idea.sector} · {new Date(idea.created_at).toLocaleDateString()}</p>
                </div>
                <Button size="sm" className="bg-[#e33b5f] text-white text-xs flex-shrink-0" onClick={() => openReview(idea)}>
                  Review <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
