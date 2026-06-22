'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, RefreshCw, Loader2, ChevronDown, ChevronUp, ArrowUpDown, Lightbulb, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole } from './types';

type DbIdea = {
  id: string;
  created_at: string;
  title: string;
  tagline: string | null;
  sector: string | null;
  stage: string | null;
  status: string;
  vep_score: number | null;
  problem: string | null;
  solution: string | null;
  competitive_edge: string | null;
  target_market: string | null;
  revenue_model: string | null;
  submitted_by: string;
  submitter_name?: string;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  'Draft':                   { label: 'Draft',              color: 'bg-stone-100 text-stone-500' },
  'Submitted':               { label: 'Submitted',          color: 'bg-blue-100 text-blue-700' },
  'Under Quality Review':    { label: 'Quality Review',     color: 'bg-amber-100 text-amber-700' },
  'Quality Approved':        { label: 'Quality Approved',   color: 'bg-emerald-100 text-emerald-700' },
  'Assigned to VEP':         { label: 'VEP Assigned',       color: 'bg-purple-100 text-purple-700' },
  'Under VEP Evaluation':    { label: 'VEP Evaluation',     color: 'bg-purple-100 text-purple-700' },
  'VEP Complete':            { label: 'VEP Complete',       color: 'bg-purple-100 text-purple-700' },
  'Moved to MAB':            { label: 'MAB Review',         color: 'bg-[#e33b5f]/10 text-[#c02d4f]' },
  'Under MAB Evaluation':    { label: 'MAB Evaluation',     color: 'bg-[#e33b5f]/10 text-[#c02d4f]' },
  'MAB Complete':            { label: 'MAB Complete',       color: 'bg-[#e33b5f]/10 text-[#c02d4f]' },
  'Approved':                { label: 'Approved ✓',         color: 'bg-emerald-100 text-emerald-700' },
  'Rejected':                { label: 'Rejected',           color: 'bg-red-100 text-red-700' },
  'Parked':                  { label: 'Parked',             color: 'bg-stone-100 text-stone-500' },
};

const PIPELINE_STAGES = [
  'All', 'Submitted', 'Under Quality Review', 'Quality Approved',
  'Assigned to VEP', 'Under VEP Evaluation', 'VEP Complete',
  'Moved to MAB', 'Under MAB Evaluation', 'Approved', 'Rejected', 'Parked',
];

const ADMIN_STATUSES = [
  'Draft', 'Submitted', 'Under Quality Review', 'Quality Approved',
  'Assigned to VEP', 'Under VEP Evaluation', 'VEP Complete',
  'Moved to MAB', 'Under MAB Evaluation', 'MAB Complete',
  'Approved', 'Rejected', 'Parked',
];

export default function IdeaRanking() {
  const { profile, role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  const [ideas,       setIdeas]       = useState<DbIdea[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [stageFilter, setStageFilter] = useState('All');
  const [sortBy,      setSortBy]      = useState<'vep_score' | 'created_at' | 'title'>('vep_score');
  const [expanded,    setExpanded]    = useState<string | null>(null);
  const [updating,    setUpdating]    = useState<string | null>(null);

  async function fetchIdeas() {
    setLoading(true);
    const query = supabase
      .from('ideas')
      .select(`
        id, created_at, title, tagline, sector, stage, status,
        vep_score, problem, solution, competitive_edge, target_market,
        revenue_model, submitted_by
      `)
      .neq('status', 'Draft')
      .order(sortBy === 'vep_score' ? 'vep_score' : sortBy, { ascending: sortBy === 'title', nullsFirst: false });

    const { data, error } = await query;
    if (error) { setLoading(false); return; }

    // Fetch submitter names
    const userIds = [...new Set((data ?? []).map(i => i.submitted_by))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);

    const nameMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.id.slice(0, 8)])
    );

    setIdeas((data ?? []).map(i => ({ ...i, submitter_name: nameMap[i.submitted_by] ?? '—' })) as DbIdea[]);
    setLoading(false);
  }

  useEffect(() => { fetchIdeas(); }, [sortBy]);

  async function updateIdeaStatus(id: string, status: string) {
    setUpdating(id);
    await supabase.from('ideas').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    setUpdating(null);
  }

  async function updateVepScore(id: string, score: number) {
    await supabase.from('ideas').update({ vep_score: score }).eq('id', id);
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, vep_score: score } : i));
  }

  const filtered = ideas.filter(i => {
    if (stageFilter !== 'All' && i.status !== stageFilter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) &&
        !(i.submitter_name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const maxScore = Math.max(...ideas.map(i => i.vep_score ?? 0), 1);

  // Stats
  const approved = ideas.filter(i => i.status === 'Approved').length;
  const inPipeline = ideas.filter(i => !['Draft','Rejected','Parked','Approved'].includes(i.status)).length;
  const withVep = ideas.filter(i => i.vep_score != null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Idea Ranking</h1>
          <p className="text-[#7e7e7e]">Review and manage submitted ideas through the evaluation pipeline</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchIdeas} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Ideas',   value: loading ? '—' : ideas.length },
          { label: 'In Pipeline',   value: loading ? '—' : inPipeline },
          { label: 'Approved',      value: loading ? '—' : approved },
          { label: 'VEP Scored',    value: loading ? '—' : withVep },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-[#222]">{s.value}</div>
              <div className="text-xs text-[#7e7e7e]">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search ideas..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48 border-[#f0f0f0]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            {PIPELINE_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-40 border-[#f0f0f0]">
            <ArrowUpDown className="w-3.5 h-3.5 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="vep_score">VEP Score</SelectItem>
            <SelectItem value="created_at">Newest</SelectItem>
            <SelectItem value="title">A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading ideas...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-8 text-center space-y-2">
            <Lightbulb className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <p className="text-sm text-[#7e7e7e]">No ideas found. Ideas appear here once submitted.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((idea, idx) => {
            const sc = statusConfig[idea.status] ?? { label: idea.status, color: 'bg-stone-100 text-stone-500' };
            const scorePct = idea.vep_score != null ? (idea.vep_score / 100) * 100 : null;
            const isExpanded = expanded === idea.id;
            return (
              <Card key={idea.id} className="border-[#f0f0f0] overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#fafafa] transition" onClick={() => setExpanded(isExpanded ? null : idea.id)}>
                  <div className="w-8 h-8 rounded-full bg-[#e33b5f]/10 flex items-center justify-center text-sm font-bold text-[#e33b5f] flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-[#222] truncate">{idea.title}</p>
                      <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                      {idea.sector && <Badge variant="outline" className="text-xs">{idea.sector}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-[#7e7e7e]">{idea.submitter_name}</p>
                      <p className="text-xs text-[#9e9e9e]">{new Date(idea.created_at).toLocaleDateString()}</p>
                      {idea.vep_score != null && (
                        <div className="flex items-center gap-1.5 flex-1 max-w-32">
                          <Progress value={(idea.vep_score / 100) * 100} className="h-1.5 flex-1" />
                          <span className="text-xs font-medium text-[#e33b5f]">{idea.vep_score}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9e9e9e] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#9e9e9e] shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-[#f0f0f0] p-4 space-y-4 bg-[#fafafa]">
                    {idea.tagline && <p className="text-sm text-[#555353] italic">"{idea.tagline}"</p>}

                    <div className="grid sm:grid-cols-2 gap-4">
                      {idea.problem && (
                        <div>
                          <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Problem</p>
                          <p className="text-sm text-[#444]">{idea.problem}</p>
                        </div>
                      )}
                      {idea.solution && (
                        <div>
                          <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Solution</p>
                          <p className="text-sm text-[#444]">{idea.solution}</p>
                        </div>
                      )}
                      {idea.target_market && (
                        <div>
                          <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Target Market</p>
                          <p className="text-sm text-[#444]">{idea.target_market}</p>
                        </div>
                      )}
                      {idea.revenue_model && (
                        <div>
                          <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Business Model</p>
                          <p className="text-sm text-[#444]">{idea.revenue_model}</p>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="space-y-3 pt-2 border-t border-[#f0f0f0]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">Pipeline Status</p>
                          <Select value={idea.status} onValueChange={s => updateIdeaStatus(idea.id, s)}>
                            <SelectTrigger className="h-7 text-xs border-[#f0f0f0] w-52">
                              {updating === idea.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {ADMIN_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider">VEP Score</p>
                          <input
                            type="number" min={0} max={100}
                            className="w-20 h-7 px-2 border border-[#f0f0f0] rounded text-xs"
                            value={idea.vep_score ?? ''}
                            placeholder="0–100"
                            onChange={e => {
                              const v = parseInt(e.target.value);
                              if (!isNaN(v) && v >= 0 && v <= 100) updateVepScore(idea.id, v);
                            }}
                          />
                          <span className="text-xs text-[#9e9e9e]">out of 100</span>
                        </div>
                      </div>
                    )}
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
