'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Clock, Loader2, Lightbulb, ChevronRight, RefreshCw, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

const PIPELINE = [
  { status: 'Submitted',               label: 'Submitted',               desc: 'Your idea has been received and is awaiting quality review.',                          color: 'bg-blue-500' },
  { status: 'Under Quality Review',    label: 'Quality Review',          desc: 'A quality reviewer is checking your idea against our 10-point checklist.',            color: 'bg-amber-500' },
  { status: 'Quality Approved',        label: 'Quality Approved',        desc: 'Your idea passed quality review.',                                                     color: 'bg-emerald-400' },
  { status: 'Assigned to VEP',         label: 'Assigned to VEP',         desc: 'Your idea has been assigned to the Venture Evaluation Panel for scoring.',             color: 'bg-purple-500' },
  { status: 'Under VEP Evaluation',    label: 'VEP Evaluation',          desc: 'VEP members are evaluating your idea across 4 criteria (100 points total).',          color: 'bg-purple-600' },
  { status: 'VEP Complete',            label: 'VEP Complete',            desc: 'VEP evaluation is done. Your idea has been scored and reviewed.',                     color: 'bg-purple-700' },
  { status: 'Moved to MAB',            label: 'Recommended for MAB',     desc: 'Congratulations! Your idea has been recommended to the Management Advisory Board.',   color: 'bg-[#e33b5f]' },
  { status: 'Under MAB Evaluation',    label: 'MAB Evaluation',          desc: 'The Management Advisory Board is reviewing your idea for investment.',                 color: 'bg-[#c02d4f]' },
  { status: 'MAB Complete',            label: 'MAB Review Complete',     desc: 'The MAB has completed their review of your idea.',                                     color: 'bg-[#a02040]' },
  { status: 'Approved',                label: 'Approved ✓',              desc: '🎉 Your idea has been approved for investment by the 1K Leaders team!',               color: 'bg-emerald-600' },
];

const TERMINAL = {
  Rejected: { label: 'Not Selected',    color: 'bg-stone-400',  desc: 'Your idea was not selected at this time. You may resubmit in a future cohort.' },
  Parked:   { label: 'Parked',          color: 'bg-stone-300',  desc: 'Your idea has been parked for future consideration.' },
};

type Idea = {
  id: string;
  title: string;
  tagline: string | null;
  sector: string | null;
  status: string;
  vep_score: number | null;
  created_at: string;
};

export default function IdeaStatusTracker() {
  const { profile } = useAuth();
  const [ideas,   setIdeas]   = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected,setSelected]= useState<Idea | null>(null);

  async function fetchIdeas() {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('ideas')
      .select('id, title, tagline, sector, status, vep_score, created_at')
      .eq('submitted_by', profile.id)
      .neq('status', 'Draft')
      .order('created_at', { ascending: false });
    setIdeas((data ?? []) as Idea[]);
    if (data?.length === 1) setSelected(data[0] as Idea);
    setLoading(false);
  }

  useEffect(() => { fetchIdeas(); }, [profile]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading your ideas...
    </div>
  );

  if (ideas.length === 0) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#222]">My Idea Status</h1>
      <Card className="border-dashed border-[#f0f0f0]">
        <CardContent className="p-10 text-center space-y-3">
          <Lightbulb className="w-10 h-10 text-[#9e9e9e] mx-auto" />
          <h3 className="font-semibold text-[#222]">No ideas submitted yet</h3>
          <p className="text-sm text-[#7e7e7e]">Submit an idea to start tracking its progress through the pipeline.</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#222]">My Idea Status</h1>
        <Button size="sm" variant="outline" onClick={fetchIdeas}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Idea selector */}
      {ideas.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {ideas.map(idea => (
            <button key={idea.id} onClick={() => setSelected(idea)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${selected?.id === idea.id ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white border-[#f0f0f0] text-[#555353] hover:border-[#e33b5f]/40'}`}>
              {idea.title}
            </button>
          ))}
        </div>
      )}

      {selected && (() => {
        const isTerminal = selected.status in TERMINAL;
        const terminal = TERMINAL[selected.status as keyof typeof TERMINAL];
        const currentIdx = PIPELINE.findIndex(p => p.status === selected.status);
        const pct = isTerminal ? 100 : currentIdx >= 0 ? Math.round(((currentIdx + 1) / PIPELINE.length) * 100) : 0;

        return (
          <div className="space-y-4">
            {/* Header card */}
            <Card className="border-[#f0f0f0] overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-[#e33b5f] to-[#f07969]"
                style={{ width: `${pct}%`, transition: 'width 0.8s ease' }} />
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-bold text-[#222]">{selected.title}</h2>
                    {selected.tagline && <p className="text-sm text-[#7e7e7e] italic mt-0.5">"{selected.tagline}"</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {selected.sector && <Badge variant="secondary" className="text-xs">{selected.sector}</Badge>}
                      <span className="text-xs text-[#9e9e9e]">Submitted {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-[#e33b5f]">{pct}%</p>
                    <p className="text-xs text-[#9e9e9e]">pipeline progress</p>
                    {selected.vep_score != null && (
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <Star className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-sm font-semibold text-purple-600">{selected.vep_score}/100 VEP</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terminal status */}
            {isTerminal && (
              <Card className="border-[#f0f0f0]">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${terminal.color} flex items-center justify-center flex-shrink-0`}>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#222]">{terminal.label}</p>
                    <p className="text-sm text-[#7e7e7e] mt-0.5">{terminal.desc}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pipeline steps */}
            <div className="space-y-2">
              {PIPELINE.map((step, i) => {
                const done    = currentIdx > i || selected.status === 'Approved';
                const current = currentIdx === i;
                const future  = currentIdx < i && !isTerminal;
                return (
                  <div key={step.status} className={`flex items-start gap-3 p-4 rounded-xl border transition ${
                    current ? 'border-[#e33b5f]/30 bg-[#e33b5f]/5' :
                    done    ? 'border-emerald-200 bg-emerald-50/50' :
                    'border-[#f0f0f0] bg-[#fafafa] opacity-50'
                  }`}>
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      done ? 'bg-emerald-500' : current ? step.color : 'bg-[#e0e0e0]'
                    }`}>
                      {done
                        ? <CheckCircle2 className="w-4 h-4 text-white" />
                        : current
                          ? <Clock className="w-3.5 h-3.5 text-white animate-pulse" />
                          : <span className="text-[10px] font-bold text-white">{i + 1}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${done ? 'text-emerald-700' : current ? 'text-[#e33b5f]' : 'text-[#9e9e9e]'}`}>
                          {step.label}
                        </p>
                        {current && <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] text-[10px] border-0">Current</Badge>}
                        {done && <Badge className="bg-emerald-100 text-emerald-700 text-[10px] border-0">✓ Done</Badge>}
                      </div>
                      {(current || done) && (
                        <p className="text-xs text-[#7e7e7e] mt-0.5">{step.desc}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
