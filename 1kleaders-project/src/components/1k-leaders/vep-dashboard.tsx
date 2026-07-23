'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  ClipboardCheck, Star, AlertTriangle, CheckCircle2,
  ChevronRight, FileText, Loader2, RefreshCw, Shield
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

type DeclarationStatus = 'pending' | 'no-conflict' | 'conflict';
type EvalStatus = 'not-started' | 'in-progress' | 'submitted';

type AssignedIdea = {
  id: string;
  title: string;
  sector: string | null;
  stage: string | null;
  tagline: string | null;
  problem: string | null;
  solution: string | null;
  competitive_edge: string | null;
  target_market: string | null;
  revenue_model: string | null;
  submitter_name: string;
  declaration: DeclarationStatus;
  evalStatus: EvalStatus;
  evaluation: Evaluation | null;
};

type Evaluation = {
  id?: string;
  score_product: number | null;
  score_market: number | null;
  score_competitive: number | null;
  score_business: number | null;
  comment_product: string;
  comment_market: string;
  comment_competitive: string;
  comment_business: string;
  overall_comment: string;
  recommendation: string;
  conflict_declared: boolean;
  conflict_notes: string;
  status: string;
};

const SCORING_CRITERIA = [
  { key: 'product',     dbKey: 'score_product',     commentKey: 'comment_product',     label: 'Product / Service',       max: 25, desc: 'How strong and innovative is the product or service?' },
  { key: 'market',      dbKey: 'score_market',       commentKey: 'comment_market',       label: 'Market Opportunity',      max: 25, desc: 'Is there a large and accessible market opportunity?' },
  { key: 'competitive', dbKey: 'score_competitive',  commentKey: 'comment_competitive',  label: 'Competitive Advantage',   max: 25, desc: 'Does the startup have a defensible competitive moat?' },
  { key: 'business',    dbKey: 'score_business',     commentKey: 'comment_business',     label: 'Business Model',          max: 25, desc: 'Is the revenue model credible and sustainable?' },
];

const RECOMMENDATIONS = [
  'Move to MAB',
  'Request More Information',
  'Park for Future',
  'Reject',
  'Merge with Another Idea',
];

function emptyEval(): Evaluation {
  return {
    score_product: null, score_market: null, score_competitive: null, score_business: null,
    comment_product: '', comment_market: '', comment_competitive: '', comment_business: '',
    overall_comment: '', recommendation: '',
    conflict_declared: false, conflict_notes: '', status: 'in-progress',
  };
}

export default function VEPDashboard() {
  const { profile } = useAuth();
  const isVEP = profile?.subroles?.includes('vep-builder') || profile?.role === 'admin' || profile?.role === 'super-admin' || profile?.role === 'developer';

  const [ideas,        setIdeas]        = useState<AssignedIdea[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [eval_,        setEval]         = useState<Evaluation>(emptyEval());
  const [saving,       setSaving]       = useState(false);
  const [showDecl,     setShowDecl]     = useState<string | null>(null);

  async function fetchIdeas() {
    if (!profile) return;
    setLoading(true);

    // Fetch ideas in VEP pipeline stages
    const { data: ideaData } = await supabase
      .from('ideas')
      .select('id, title, sector, stage, tagline, problem, solution, competitive_edge, target_market, revenue_model, submitted_by')
      .in('status', ['Assigned to VEP', 'Under VEP Evaluation', 'VEP Complete'])
      .order('created_at');

    if (!ideaData || ideaData.length === 0) { setIdeas([]); setLoading(false); return; }

    // Fetch submitter names
    const userIds = [...new Set(ideaData.map(i => i.submitted_by))];
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name').in('id', userIds);
    const nameMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown'])
    );

    // Fetch this evaluator's existing evaluations
    const { data: evals } = await supabase
      .from('vep_evaluations')
      .select('*')
      .eq('evaluator_id', profile.id)
      .in('idea_id', ideaData.map(i => i.id));

    const evalMap = Object.fromEntries((evals ?? []).map(e => [e.idea_id, e]));

    setIdeas(ideaData.map(idea => {
      const ev = evalMap[idea.id];
      const hasDecl = ev?.declaration_at != null;
      const conflict = ev?.conflict_declared;
      return {
        ...idea,
        submitter_name: nameMap[idea.submitted_by] ?? '—',
        declaration: !hasDecl ? 'pending' : conflict ? 'conflict' : 'no-conflict',
        evalStatus: !ev ? 'not-started' : ev.status === 'submitted' ? 'submitted' : 'in-progress',
        evaluation: ev ? {
          id: ev.id,
          score_product: ev.score_product,
          score_market: ev.score_market,
          score_competitive: ev.score_competitive,
          score_business: ev.score_business,
          comment_product: ev.comment_product ?? '',
          comment_market: ev.comment_market ?? '',
          comment_competitive: ev.comment_competitive ?? '',
          comment_business: ev.comment_business ?? '',
          overall_comment: ev.overall_comment ?? '',
          recommendation: ev.recommendation ?? '',
          conflict_declared: ev.conflict_declared ?? false,
          conflict_notes: ev.conflict_notes ?? '',
          status: ev.status,
        } : null,
      };
    }));
    setLoading(false);
  }

  useEffect(() => { fetchIdeas(); }, [profile]);

  async function submitDeclaration(ideaId: string, conflict: boolean, notes: string) {
    if (!profile) return;
    await supabase.from('vep_evaluations').upsert({
      idea_id: ideaId,
      evaluator_id: profile.id,
      conflict_declared: conflict,
      conflict_notes: notes || null,
      declaration_at: new Date().toISOString(),
      status: 'in-progress',
    }, { onConflict: 'idea_id,evaluator_id' });
    setShowDecl(null);
    fetchIdeas();
  }

  function openScoring(idea: AssignedIdea) {
    setEval(idea.evaluation ?? emptyEval());
    setSelectedId(idea.id);
  }

  async function saveProgress() {
    if (!profile || !selectedId) return;
    setSaving(true);
    await supabase.from('vep_evaluations').upsert({
      idea_id:            selectedId,
      evaluator_id:       profile.id,
      score_product:      eval_.score_product,
      score_market:       eval_.score_market,
      score_competitive:  eval_.score_competitive,
      score_business:     eval_.score_business,
      comment_product:    eval_.comment_product || null,
      comment_market:     eval_.comment_market || null,
      comment_competitive:eval_.comment_competitive || null,
      comment_business:   eval_.comment_business || null,
      overall_comment:    eval_.overall_comment || null,
      recommendation:     eval_.recommendation || null,
      status:             'in-progress',
    }, { onConflict: 'idea_id,evaluator_id' });
    setSaving(false);
  }

  async function submitEvaluation() {
    if (!profile || !selectedId) return;
    setSaving(true);

    await supabase.from('vep_evaluations').upsert({
      idea_id:             selectedId,
      evaluator_id:        profile.id,
      score_product:       eval_.score_product,
      score_market:        eval_.score_market,
      score_competitive:   eval_.score_competitive,
      score_business:      eval_.score_business,
      comment_product:     eval_.comment_product || null,
      comment_market:      eval_.comment_market || null,
      comment_competitive: eval_.comment_competitive || null,
      comment_business:    eval_.comment_business || null,
      overall_comment:     eval_.overall_comment || null,
      recommendation:      eval_.recommendation || null,
      status:              'submitted',
    }, { onConflict: 'idea_id,evaluator_id' });

    // Always update the idea status — don't depend on upsert returning data
    const total = (eval_.score_product ?? 0) + (eval_.score_market ?? 0) +
                  (eval_.score_competitive ?? 0) + (eval_.score_business ?? 0);
    const newStatus = eval_.recommendation === 'Move to MAB' ? 'Moved to MAB' : 'VEP Complete';

    await supabase.from('ideas').update({
      vep_score:  total,
      status:     newStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', selectedId);

    // Notify submitter if moving to MAB
    if (eval_.recommendation === 'Move to MAB') {
      const { data: idea } = await supabase
        .from('ideas').select('submitted_by, title').eq('id', selectedId).single();
      if (idea) {
        await supabase.from('notifications').insert({
          user_id:           idea.submitted_by,
          title:             'Your Idea Has Been Recommended for MAB Review 🎉',
          message:           `Congratulations! Your idea "${idea.title}" has successfully passed VEP evaluation and has been recommended to the Management Advisory Board for final review.`,
          notification_type: 'success',
          is_read:           false,
        });
      }
    }
    }

    setSaving(false);
    setSelectedId(null);
    fetchIdeas();
  }

  const idea = ideas.find(i => i.id === selectedId);

  const totalScore =
    (eval_.score_product ?? 0) + (eval_.score_market ?? 0) +
    (eval_.score_competitive ?? 0) + (eval_.score_business ?? 0);

  const allScored = SCORING_CRITERIA.every(c => eval_[c.dbKey as keyof Evaluation] !== null);

  // Not a VEP member
  if (!isVEP) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-3">
            <Shield className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">VEP Access Required</h3>
            <p className="text-sm text-[#7e7e7e]">This page is only available to Venture Evaluation Panel members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Scoring view
  if (selectedId && idea) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedId(null)} className="text-sm text-[#7e7e7e] hover:text-[#222] transition">← Back to Ideas</button>
          <ChevronRight className="w-4 h-4 text-[#d0d0d0]" />
          <span className="text-sm font-medium text-[#222] truncate">{idea.title}</span>
        </div>

        {/* Idea info */}
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-[#222]">{idea.title}</h2>
                <p className="text-sm text-[#7e7e7e]">Submitted by {idea.submitter_name} · {idea.sector}</p>
              </div>
              <Badge className="bg-purple-100 text-purple-700 text-xs flex-shrink-0">VEP Review</Badge>
            </div>
            {idea.tagline && <p className="text-sm text-[#555353] italic">"{idea.tagline}"</p>}
            <div className="grid sm:grid-cols-2 gap-3">
              {idea.problem && <div><p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Problem</p><p className="text-sm text-[#444]">{idea.problem}</p></div>}
              {idea.solution && <div><p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Solution</p><p className="text-sm text-[#444]">{idea.solution}</p></div>}
              {idea.target_market && <div><p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Target Market</p><p className="text-sm text-[#444]">{idea.target_market}</p></div>}
              {idea.revenue_model && <div><p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Business Model</p><p className="text-sm text-[#444]">{idea.revenue_model}</p></div>}
            </div>
          </CardContent>
        </Card>

        {idea.evalStatus === 'submitted' ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-lg font-bold text-[#222]">Evaluation Submitted</h3>
              <p className="text-sm text-emerald-700">Your evaluation has been recorded. The total VEP score of <strong>{totalScore}/100</strong> has been applied to this idea.</p>
              <p className="text-sm text-emerald-700">Recommendation: <strong>{eval_.recommendation}</strong></p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Score progress */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#222]">Total Score</p>
              <span className="text-xl font-bold text-[#e33b5f]">{totalScore} / 100</span>
            </div>
            <Progress value={totalScore} className="h-2" />

            {/* Criteria scoring */}
            {SCORING_CRITERIA.map(c => {
              const score = eval_[c.dbKey as keyof Evaluation] as number | null;
              const comment = eval_[c.commentKey as keyof Evaluation] as string;
              return (
                <Card key={c.key} className="border-[#f0f0f0]">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#222]">{c.label}</p>
                        <p className="text-xs text-[#7e7e7e]">{c.desc}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-2xl font-bold text-[#e33b5f]">{score ?? '—'}</span>
                        <span className="text-xs text-[#9e9e9e]">/{c.max}</span>
                      </div>
                    </div>
                    {/* Score buttons 0-25 */}
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: c.max + 1 }, (_, i) => i).map(n => (
                        <button key={n} onClick={() => setEval(prev => ({ ...prev, [c.dbKey]: n }))}
                          className={`w-8 h-8 rounded-lg text-xs font-medium border transition ${score === n ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-[#f6f6f6] text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]/50'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <Textarea placeholder={`Comments on ${c.label}...`} rows={2} className="text-xs border-[#f0f0f0]"
                      value={comment} onChange={e => setEval(prev => ({ ...prev, [c.commentKey]: e.target.value }))} />
                  </CardContent>
                </Card>
              );
            })}

            {/* Overall */}
            <Card className="border-[#f0f0f0]">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold text-[#222]">Overall Assessment</p>
                <Textarea placeholder="Overall comments and summary of your evaluation..." rows={4} className="border-[#f0f0f0]"
                  value={eval_.overall_comment} onChange={e => setEval(prev => ({ ...prev, overall_comment: e.target.value }))} />
                <div>
                  <p className="text-sm font-medium text-[#222] mb-2">Recommendation <span className="text-[#e33b5f]">*</span></p>
                  <div className="flex flex-wrap gap-2">
                    {RECOMMENDATIONS.map(r => (
                      <button key={r} onClick={() => setEval(prev => ({ ...prev, recommendation: r }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${eval_.recommendation === r ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-[#f6f6f6] text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]/50'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={saveProgress} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save Progress
              </Button>
              <Button className="flex-1 bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white"
                disabled={!allScored || !eval_.recommendation || saving}
                onClick={submitEvaluation}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Submit Evaluation
              </Button>
            </div>
            {(!allScored || !eval_.recommendation) && (
              <p className="text-xs text-center text-[#9e9e9e]">Score all 4 criteria and select a recommendation to submit.</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Idea list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-[#e33b5f]" /> VEP Review Dashboard
          </h1>
          <p className="text-[#7e7e7e]">Venture Evaluation Panel — score ideas across 4 criteria (max 100 points)</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchIdeas} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Assigned Ideas',    value: loading ? '—' : ideas.length,                                             color: 'text-[#222]' },
          { label: 'Scores Submitted',  value: loading ? '—' : ideas.filter(i => i.evalStatus === 'submitted').length,  color: 'text-emerald-600' },
          { label: 'Pending Review',    value: loading ? '—' : ideas.filter(i => i.evalStatus !== 'submitted').length,  color: 'text-[#f07969]' },
        ].map(s => (
          <Card key={s.label} className="border-[#f0f0f0]">
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-[#7e7e7e] mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Idea list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading assigned ideas...
        </div>
      ) : ideas.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-10 text-center space-y-3">
            <ClipboardCheck className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">No Ideas Assigned</h3>
            <p className="text-sm text-[#7e7e7e]">Ideas will appear here once an admin moves them to "Assigned to VEP" status.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#f0f0f0]">
          <CardHeader><CardTitle className="text-base">Your Assigned Ideas</CardTitle></CardHeader>
          <CardContent className="p-0">
            {ideas.map(idea => (
              <div key={idea.id} className="p-4 border-b border-[#f0f0f0] last:border-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-[#222] text-sm">{idea.title}</p>
                      {idea.sector && <Badge className="bg-purple-100 text-purple-700 text-xs">{idea.sector}</Badge>}
                      {idea.evalStatus === 'submitted' && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Submitted
                        </Badge>
                      )}
                      {idea.evalStatus === 'in-progress' && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">In Progress</Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#7e7e7e]">Submitted by {idea.submitter_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {idea.declaration === 'pending' ? (
                      <Button size="sm" variant="outline" className="border-[#f07969] text-[#f07969] text-xs"
                        onClick={() => setShowDecl(idea.id)}>
                        <AlertTriangle className="w-3 h-3 mr-1" /> Declaration Required
                      </Button>
                    ) : idea.declaration === 'conflict' ? (
                      <Badge className="bg-red-100 text-red-700 text-xs">Conflict Declared</Badge>
                    ) : (
                      <Button size="sm"
                        className={idea.evalStatus === 'submitted' ? 'bg-[#f0f0f0] text-[#555353] text-xs' : 'bg-[#e33b5f] hover:bg-[#c02d4f] text-white text-xs'}
                        onClick={() => openScoring(idea)}>
                        {idea.evalStatus === 'submitted' ? 'View Evaluation' : 'Score Idea'}
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Conflict declaration panel */}
                {showDecl === idea.id && (
                  <ConflictDeclaration
                    onSubmit={(conflict, notes) => submitDeclaration(idea.id, conflict, notes)}
                    onCancel={() => setShowDecl(null)}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ConflictDeclaration({ onSubmit, onCancel }: { onSubmit: (conflict: boolean, notes: string) => void; onCancel: () => void }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="mt-3 p-4 bg-[#f07969]/5 border border-[#f07969]/20 rounded-lg space-y-3">
      <p className="text-sm font-semibold text-[#222]">Conflict of Interest Declaration</p>
      <p className="text-xs text-[#555353]">Before reviewing this idea, you must declare any potential conflicts of interest. Are you currently involved with this idea or sector as a founder, advisor, or investor?</p>
      <Textarea placeholder="If declaring a conflict, describe it briefly (optional)..." rows={2} className="text-xs border-[#f07969]/20"
        value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="border-[#f07969] text-[#f07969] text-xs"
          onClick={() => onSubmit(true, notes)}>
          Declare Conflict — Recuse Myself
        </Button>
        <Button size="sm" className="bg-[#e33b5f] hover:bg-[#c02d4f] text-white text-xs"
          onClick={() => onSubmit(false, '')}>
          No Conflict — Proceed to Score
        </Button>
        <Button size="sm" variant="ghost" className="text-xs text-[#9e9e9e]" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
