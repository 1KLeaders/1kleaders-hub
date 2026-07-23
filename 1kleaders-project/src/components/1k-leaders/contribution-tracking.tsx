'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Clock, Star, CheckCircle2, Plus, Loader2, RefreshCw,
  Users, Lightbulb, Calendar, Award, TrendingUp, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { DashboardRole } from './types';

interface Props { role?: DashboardRole; }

const CONTRIBUTION_TYPES = [
  { value: 'meeting',  label: 'Meeting Attended',    icon: Users,     points: 5 },
  { value: 'hours',    label: 'Work / Project Hours', icon: Clock,     points: 2 },
  { value: 'idea',     label: 'Idea Submitted',       icon: Lightbulb, points: 10 },
  { value: 'review',   label: 'Idea Review / VEP',    icon: CheckCircle2, points: 8 },
  { value: 'event',    label: 'Event Organized',       icon: Calendar,  points: 15 },
  { value: 'other',    label: 'Other Contribution',    icon: Star,      points: 3 },
];

const LEVELS = [
  { name: 'Bronze',   min: 0,   max: 199,  color: 'text-amber-700 bg-amber-100 border-amber-300' },
  { name: 'Silver',   min: 200, max: 499,  color: 'text-stone-600 bg-stone-100 border-stone-300' },
  { name: 'Gold',     min: 500, max: 999,  color: 'text-yellow-700 bg-yellow-100 border-yellow-300' },
  { name: 'Diamond',  min: 1000,max: 99999,color: 'text-sky-700 bg-sky-100 border-sky-300' },
];

function getLevel(points: number) {
  return LEVELS.find(l => points >= l.min && points <= l.max) ?? LEVELS[0];
}

type Contribution = {
  id: string;
  created_at: string;
  user_id: string;
  type: string;
  description: string;
  hours: number | null;
  date: string;
  verified: boolean;
  points: number;
  profile_name?: string;
};

export default function ContributionTracking({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin = ['admin', 'super-admin', 'developer'].includes(role ?? '');

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [allContribs,   setAllContribs]   = useState<Contribution[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [saving,        setSaving]        = useState(false);

  // Form
  const [cType,   setCType]   = useState('meeting');
  const [cDesc,   setCDesc]   = useState('');
  const [cHours,  setCHours]  = useState('');
  const [cDate,   setCDate]   = useState(new Date().toISOString().slice(0, 10));

  async function fetchContributions() {
    if (!profile) return;
    setLoading(true);

    // Own contributions
    const { data: own } = await supabase
      .from('contributions')
      .select('*')
      .eq('user_id', profile.id)
      .order('date', { ascending: false });
    setContributions((own ?? []) as Contribution[]);

    // Admin: all contributions with names
    if (isAdmin) {
      const { data: all } = await supabase
        .from('contributions')
        .select('*, profiles(first_name, last_name)')
        .order('date', { ascending: false })
        .limit(100);
      setAllContribs((all ?? []).map((c: any) => ({
        ...c,
        profile_name: c.profiles ? `${c.profiles.first_name ?? ''} ${c.profiles.last_name ?? ''}`.trim() : '—',
      })));
    }

    setLoading(false);
  }

  useEffect(() => { fetchContributions(); }, [profile]);

  async function submitContribution() {
    if (!profile || !cDesc.trim()) return;
    setSaving(true);
    const typeConfig = CONTRIBUTION_TYPES.find(t => t.value === cType);
    const basePoints = typeConfig?.points ?? 3;
    const hoursNum = parseFloat(cHours) || null;
    const points = cType === 'hours' && hoursNum ? Math.round(hoursNum * basePoints) : basePoints;

    await supabase.from('contributions').insert({
      user_id:     profile.id,
      type:        cType,
      description: cDesc.trim(),
      hours:       hoursNum,
      date:        cDate,
      points,
      verified:    false,
    });

    setCDesc(''); setCHours(''); setCType('meeting');
    setShowForm(false);
    setSaving(false);
    fetchContributions();
  }

  async function verifyContribution(id: string, verified: boolean) {
    if (!profile) return;
    await supabase.from('contributions').update({ verified, verified_by: profile.id }).eq('id', id);
    setAllContribs(prev => prev.map(c => c.id === id ? { ...c, verified } : c));
  }

  const totalPoints = contributions.filter(c => c.verified).reduce((s, c) => s + (c.points ?? 0), 0);
  const pendingPoints = contributions.filter(c => !c.verified).reduce((s, c) => s + (c.points ?? 0), 0);
  const level = getLevel(totalPoints);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const progress = nextLevel ? Math.round(((totalPoints - level.min) / (nextLevel.min - level.min)) * 100) : 100;

  const typeConfig = (type: string) => CONTRIBUTION_TYPES.find(t => t.value === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <Award className="w-6 h-6 text-[#e33b5f]" /> Contribution Tracker
          </h1>
          <p className="text-[#7e7e7e]">Log your contributions and track your partner level</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={fetchContributions} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="bg-[#e33b5f] text-white" onClick={() => setShowForm(v => !v)}>
            {showForm ? <><X className="w-4 h-4 mr-1" />Cancel</> : <><Plus className="w-4 h-4 mr-1" />Log Contribution</>}
          </Button>
        </div>
      </div>

      {/* Level card */}
      <Card className="border-[#f0f0f0] overflow-hidden">
        <div className="bg-gradient-to-r from-[#111] to-[#333] p-6 text-white">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/60 text-sm mb-1">Your Partner Level</p>
              <div className="flex items-center gap-3">
                <Badge className={`text-sm px-3 py-1 border font-bold ${level.color}`}>
                  <Star className="w-3.5 h-3.5 mr-1.5" />{level.name}
                </Badge>
                <span className="text-2xl font-bold">{totalPoints} pts</span>
              </div>
              {pendingPoints > 0 && <p className="text-white/50 text-xs mt-1">+{pendingPoints} pts pending verification</p>}
            </div>
            {nextLevel && (
              <div className="text-right">
                <p className="text-white/60 text-xs mb-1">Next: {nextLevel.name} at {nextLevel.min} pts</p>
                <p className="text-white font-bold">{nextLevel.min - totalPoints} pts to go</p>
              </div>
            )}
          </div>
          {nextLevel && (
            <div className="mt-4">
              <Progress value={progress} className="h-2 bg-white/20" />
              <div className="flex justify-between mt-1 text-xs text-white/40">
                <span>{level.min}</span><span>{nextLevel.min}</span>
              </div>
            </div>
          )}
          {!nextLevel && (
            <p className="mt-3 text-[#f07969] text-sm font-medium">🏆 Maximum level achieved!</p>
          )}
        </div>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LEVELS.map(l => {
              const reached = totalPoints >= l.min;
              return (
                <div key={l.name} className={`text-center p-3 rounded-lg border ${reached ? l.color + ' border-2' : 'bg-[#f6f6f6] text-[#9e9e9e] border-[#f0f0f0]'}`}>
                  <p className="font-bold text-sm">{l.name}</p>
                  <p className="text-xs mt-0.5">{l.min}+ pts</p>
                  {reached && <CheckCircle2 className="w-4 h-4 mx-auto mt-1" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Log form */}
      {showForm && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardHeader className="pb-3"><CardTitle className="text-base text-[#e33b5f]">Log a Contribution</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={cType} onValueChange={setCType}>
                  <SelectTrigger className="mt-1 border-[#f0f0f0]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTRIBUTION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label} (+{t.points} pts)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" className="mt-1 border-[#f0f0f0]" value={cDate} onChange={e => setCDate(e.target.value)} />
              </div>
            </div>
            {cType === 'hours' && (
              <div>
                <Label>Hours</Label>
                <Input type="number" min="0.5" step="0.5" className="mt-1 border-[#f0f0f0] w-32" placeholder="e.g. 2.5" value={cHours} onChange={e => setCHours(e.target.value)} />
                <p className="text-xs text-[#7e7e7e] mt-1">+2 pts per hour</p>
              </div>
            )}
            <div>
              <Label>Description <span className="text-[#e33b5f]">*</span></Label>
              <Textarea className="mt-1 border-[#f0f0f0]" rows={2} placeholder="Briefly describe what you did…" value={cDesc} onChange={e => setCDesc(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#7e7e7e]">
                Points: <span className="font-bold text-[#e33b5f]">
                  {cType === 'hours' && cHours ? Math.round(parseFloat(cHours) * 2) : typeConfig(cType)?.points ?? 3}
                </span> (pending admin verification)
              </p>
              <Button className="bg-[#e33b5f] text-white" onClick={submitContribution} disabled={saving || !cDesc.trim()}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Log Contribution
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin: all contributions */}
      {isAdmin && allContribs.length > 0 && (
        <Card className="border-[#f0f0f0]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#e33b5f]" /> All Contributions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {allContribs.map(c => {
              const tc = typeConfig(c.type);
              const Icon = tc?.icon ?? Star;
              return (
                <div key={c.id} className="flex items-center gap-3 p-4 border-b border-[#f0f0f0] last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-[#e33b5f]/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#e33b5f]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[#222] truncate">{c.description}</p>
                      <Badge className={`text-xs ${c.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {c.verified ? '✓ Verified' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[#7e7e7e]">{c.profile_name} · {c.date} · {c.points} pts</p>
                  </div>
                  {!c.verified ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex-shrink-0"
                      onClick={() => verifyContribution(c.id, true)}>
                      Verify
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-[#9e9e9e] flex-shrink-0"
                      onClick={() => verifyContribution(c.id, false)}>
                      Unverify
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Own contributions */}
      <Card className="border-[#f0f0f0]">
        <CardHeader><CardTitle className="text-base">My Contributions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-[#9e9e9e]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
          ) : contributions.length === 0 ? (
            <p className="text-sm text-[#9e9e9e] text-center py-8">No contributions logged yet. Start logging your work above!</p>
          ) : contributions.map(c => {
            const tc = typeConfig(c.type);
            const Icon = tc?.icon ?? Star;
            return (
              <div key={c.id} className="flex items-center gap-3 p-4 border-b border-[#f0f0f0] last:border-0">
                <div className="w-8 h-8 rounded-lg bg-[#e33b5f]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#e33b5f]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-medium text-[#222] truncate">{c.description}</p>
                    <Badge className={`text-xs ${c.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {c.verified ? `✓ +${c.points} pts` : `Pending · ${c.points} pts`}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#7e7e7e]">{tc?.label} · {c.date}{c.hours ? ` · ${c.hours}h` : ''}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
