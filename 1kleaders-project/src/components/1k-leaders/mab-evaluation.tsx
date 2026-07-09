'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Briefcase, ChevronRight, CheckCircle2, Loader2,
  RefreshCw, Shield, Star
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const MAB_CRITERIA = [
  { key: 'strategic_fit',   dbKey: 'score_strategic',   label: 'Strategic Fit',         max: 25, desc: 'How well does this align with 1K Leaders investment thesis and ADGM ecosystem goals?' },
  { key: 'founder_quality', dbKey: 'score_founder',     label: 'Founder Quality',       max: 25, desc: 'Assess the founding team\'s credibility, commitment, and execution ability.' },
  { key: 'risk_profile',    dbKey: 'score_risk',        label: 'Risk & Due Diligence',  max: 25, desc: 'Overall risk level — regulatory, market, execution. Lower risk = higher score.' },
  { key: 'investment_case', dbKey: 'score_investment',  label: 'Investment Case',       max: 25, desc: 'Clarity and strength of the investment opportunity, expected returns, and exit potential.' },
];

const MAB_DECISIONS = [
  { key: 'Invest',            label: '✓ Invest',                    color: 'bg-emerald-500 text-white border-emerald-500' },
  { key: 'Conditional Invest',label: '~ Conditional Investment',    color: 'bg-blue-500 text-white border-blue-500' },
  { key: 'Request Pitch',     label: '▶ Request Full Pitch',        color: 'bg-purple-500 text-white border-purple-500' },
  { key: 'Pass',              label: '○ Pass',                      color: 'bg-stone-400 text-white border-stone-400' },
  { key: 'Defer',             label: '⏱ Defer to Next Round',      color: 'bg-amber-500 text-white border-amber-500' },
];

type MabEval = {
  id?: string;
  score_strategic: number | null;
  score_founder: number | null;
  score_risk: number | null;
  score_investment: number | null;
  comment_strategic: string;
  comment_founder: string;
  comment_risk: string;
  comment_investment: string;
  overall_comment: string;
  conditions: string;
  decision: string;
  status: string;
};

type Idea = {
  id: string;
  title: string;
  sector: string | null;
  stage: string | null;
  tagline: string | null;
  problem: string | null;
  solution: string | null;
  target_market: string | null;
  revenue_model: string | null;
  vep_score: number | null;
  submitter_name: string;
  status: string;
};

function emptyEval(): MabEval {
  return {
    score_strategic: null, score_founder: null, score_risk: null, score_investment: null,
    comment_strategic: '', comment_founder: '', comment_risk: '', comment_investment: '',
    overall_comment: '', conditions: '', decision: '', status: 'in-progress',
  };
}

export default function MABEvaluation() {
  const { profile } = useAuth();
  const isMAB = profile?.subroles?.includes('mab-builder') ||
    ['admin', 'super-admin', 'developer'].includes(profile?.role ?? '');

  const [ideas,      setIdeas]      = useState<Idea[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [eval_,      setEval]       = useState<MabEval>(emptyEval());
  const [saving,     setSaving]     = useState(false);

  async function fetchIdeas() {
    setLoading(true);
    const { data: ideaData } = await supabase
      .from('ideas')
      .select('id, title, sector, stage, tagline, problem, solution, target_market, revenue_model, vep_score, submitted_by, status')
      .in('status', ['Moved to MAB', 'Under MAB Evaluation', 'MAB Complete'])
      .order('vep_score', { ascending: false, nullsFirst: false });

    if (!ideaData?.length) { setIdeas([]); setLoading(false); return; }

    const { data: profiles } = await supabase.from('profiles')
      .select('id, first_name, last_name')
      .in('id', ideaData.map(i => i.submitted_by));
    const nameMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown'])
    );
    setIdeas(ideaData.map(i => ({ ...i, submitter_name: nameMap[i.submitted_by] ?? '—' })) as Idea[]);
    setLoading(false);
  }

  useEffect(() => { fetchIdeas(); }, []);

  async function openEval(idea: Idea) {
    if (!profile) return;
    if (idea.status === 'Moved to MAB') {
      await supabase.from('ideas').update({ status: 'Under MAB Evaluation' }).eq('id', idea.id);
      setIdeas(prev => prev.map(i => i.id === idea.id ? { ...i, status: 'Under MAB Evaluation' } : i));
    }
    const { data: existing } = await supabase.from('mab_evaluations')
      .select('*').eq('idea_id', idea.id).eq('evaluator_id', profile.id).maybeSingle();
    setEval(existing ?? emptyEval());
    setSelectedId(idea.id);
  }

  async function saveEval(submit: boolean) {
    if (!profile || !selectedId) return;
    setSaving(true);
    const payload = {
      idea_id:           selectedId,
      evaluator_id:      profile.id,
      score_strategic:   eval_.score_strategic,
      score_founder:     eval_.score_founder,
      score_risk:        eval_.score_risk,
      score_investment:  eval_.score_investment,
      comment_strategic: eval_.comment_strategic || null,
      comment_founder:   eval_.comment_founder || null,
      comment_risk:      eval_.comment_risk || null,
      comment_investment:eval_.comment_investment || null,
      overall_comment:   eval_.overall_comment || null,
      conditions:        eval_.conditions || null,
      decision:          eval_.decision || null,
      status:            submit ? 'submitted' : 'in-progress',
    };
    await supabase.from('mab_evaluations').upsert(payload, { onConflict: 'idea_id,evaluator_id' });

    if (submit && eval_.decision) {
      const newStatus = eval_.decision === 'Invest' || eval_.decision === 'Conditional Invest'
        ? 'Approved' : eval_.decision === 'Pass' ? 'Rejected' : 'MAB Complete';
      await supabase.from('ideas').update({ status: newStatus }).eq('id', selectedId);
      // Notify submitter
      const { data: idea } = await supabase.from('ideas').select('submitted_by, title').eq('id', selectedId).single();
      if (idea) {
        await supabase.from('notifications').insert({
          user_id:           idea.submitted_by,
          title:             `MAB Decision: ${eval_.decision}`,
          message:           `The Management Advisory Board has reviewed your idea "${idea.title}". Decision: ${eval_.decision}.${eval_.conditions ? ` Conditions: ${eval_.conditions}` : ''}`,
          notification_type: eval_.decision === 'Invest' ? 'success' : eval_.decision === 'Pass' ? 'warning' : 'info',
          is_read:           false,
        });
      }
      setSelectedId(null);
      fetchIdeas();
    }
    setSaving(false);
  }

  const idea = ideas.find(i => i.id === selectedId);
  const totalScore = (eval_.score_strategic ?? 0) + (eval_.score_founder ?? 0) +
                     (eval_.score_risk ?? 0) + (eval_.score_investment ?? 0);
  const allScored = MAB_CRITERIA.every(c => eval_[c.dbKey as keyof MabEval] !== null);

  if (!isMAB) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-3">
            <Shield className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">MAB Access Required</h3>
            <p className="text-sm text-[#7e7e7e]">This page is only available to Management Advisory Board members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Evaluation form
  if (selectedId && idea) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedId(null)} className="text-sm text-[#7e7e7e] hover:text-[#222]">← Back</button>
          <ChevronRight className="w-4 h-4 text-[#d0d0d0]" />
          <span className="text-sm font-medium text-[#222] truncate">{idea.title}</span>
        </div>

        <Card className="border-[#f0f0f0]">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#222]">{idea.title}</h2>
                <p className="text-sm text-[#7e7e7e]">{idea.submitter_name} · {idea.sector}</p>
              </div>
              {idea.vep_score != null && (
                <div className="text-center flex-shrink-0">
                  <p className="text-xs text-[#9e9e9e]">VEP Score</p>
                  <p className="text-2xl font-bold text-purple-600">{idea.vep_score}/100</p>
                </div>
              )}
            </div>
            {idea.tagline && <p className="text-sm italic text-[#555353]">"{idea.tagline}"</p>}
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              {[
                { label: 'Problem',       value: idea.problem },
                { label: 'Solution',      value: idea.solution },
                { label: 'Target Market', value: idea.target_market },
                { label: 'Business Model',value: idea.revenue_model },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <p className="font-semibold text-[#9e9e9e] uppercase tracking-wider text-[10px]">{f.label}</p>
                  <p className="text-[#444] mt-0.5">{f.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#222]">Total MAB Score</p>
          <span className="text-xl font-bold text-[#e33b5f]">{totalScore} / 100</span>
        </div>
        <Progress value={totalScore} className="h-2" />

        {MAB_CRITERIA.map(c => {
          const score   = eval_[c.dbKey as keyof MabEval] as number | null;
          const comment = eval_[`comment_${c.key}` as keyof MabEval] as string;
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
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: c.max + 1 }, (_, i) => i).map(n => (
                    <button key={n}
                      onClick={() => setEval(prev => ({ ...prev, [c.dbKey]: n }))}
                      className={`w-8 h-8 rounded-lg text-xs font-medium border transition ${score === n ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-[#f6f6f6] text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]/50'}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <Textarea placeholder={`Comments on ${c.label}...`} rows={2} className="text-xs border-[#f0f0f0]"
                  value={comment}
                  onChange={e => setEval(prev => ({ ...prev, [`comment_${c.key}`]: e.target.value }))} />
              </CardContent>
            </Card>
          );
        })}

        <Card className="border-[#f0f0f0]">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-[#222]">Overall Assessment</p>
            <Textarea placeholder="Overall MAB assessment and investment rationale..." rows={3} className="border-[#f0f0f0]"
              value={eval_.overall_comment}
              onChange={e => setEval(prev => ({ ...prev, overall_comment: e.target.value }))} />
            <p className="text-sm font-semibold text-[#222]">Conditions (if any)</p>
            <Textarea placeholder="Any conditions attached to investment decision (e.g. team changes, pivot requirements, milestone gates)..." rows={2} className="border-[#f0f0f0]"
              value={eval_.conditions}
              onChange={e => setEval(prev => ({ ...prev, conditions: e.target.value }))} />
            <p className="text-sm font-semibold text-[#222]">Decision <span className="text-[#e33b5f]">*</span></p>
            <div className="flex flex-wrap gap-2">
              {MAB_DECISIONS.map(d => (
                <button key={d.key} onClick={() => setEval(prev => ({ ...prev, decision: d.key }))}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition ${eval_.decision === d.key ? d.color : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]/30'}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => saveEval(false)} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save Progress
          </Button>
          <Button className="flex-1 bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white"
            disabled={!allScored || !eval_.decision || saving}
            onClick={() => saveEval(true)}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Submit MAB Decision
          </Button>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#e33b5f]" /> MAB Evaluation
          </h1>
          <p className="text-[#7e7e7e]">Management Advisory Board — final investment decisions</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchIdeas} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Awaiting Decision',  value: loading ? '—' : ideas.filter(i => i.status === 'Moved to MAB').length,             color: 'text-[#f07969]' },
          { label: 'Under Evaluation',   value: loading ? '—' : ideas.filter(i => i.status === 'Under MAB Evaluation').length,     color: 'text-amber-600' },
          { label: 'Decisions Made',     value: loading ? '—' : ideas.filter(i => i.status === 'MAB Complete').length,             color: 'text-emerald-600' },
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
            <Briefcase className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">No ideas for MAB review</h3>
            <p className="text-sm text-[#7e7e7e]">Ideas appear here once moved to MAB from the VEP pipeline.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#f0f0f0]">
          <CardHeader><CardTitle className="text-base">Ideas for MAB Review</CardTitle></CardHeader>
          <CardContent className="p-0">
            {ideas.map(idea => (
              <div key={idea.id} className="flex items-center gap-4 p-4 border-b border-[#f0f0f0] last:border-0 hover:bg-[#fafafa] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-sm text-[#222]">{idea.title}</p>
                    <Badge className={idea.status === 'Moved to MAB' ? 'bg-[#e33b5f]/10 text-[#c02d4f] text-xs' : 'bg-amber-100 text-amber-700 text-xs'}>
                      {idea.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#7e7e7e]">
                    <span>{idea.submitter_name}</span>
                    {idea.vep_score != null && (
                      <span className="font-medium text-purple-600 flex items-center gap-1">
                        <Star className="w-3 h-3" /> VEP: {idea.vep_score}/100
                      </span>
                    )}
                  </div>
                </div>
                <Button size="sm" className="bg-[#e33b5f] text-white text-xs flex-shrink-0" onClick={() => openEval(idea)}>
                  Evaluate <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
