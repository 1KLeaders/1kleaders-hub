'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon, Clock, Bell, Mail, AlertTriangle,
  Plus, ChevronLeft, ChevronRight, Video, MapPin, Vote, ThumbsUp, Users,
  Check, X, Send, Phone, Loader2, RefreshCw
} from 'lucide-react';
import type { DashboardRole } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { role: DashboardRole; }

const daysOfWeek     = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const daysOfWeekFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames     = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

type EventType = 'meeting' | 'newsletter' | 'expiry' | 'deadline' | 'vote';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: EventType;
  location: string;
  description?: string;
  created_by?: string;
  teams_event_id?: string;
  teams_join_url?: string;
  invitees?: string[];
}

interface VoteSlot  { date: string; time: string; votes: number; voter_ids: string[] }
interface MeetingVote {
  id: string;
  title: string;
  proposed_dates: VoteSlot[];
  status: 'voting' | 'confirmed' | 'cancelled';
  initiated_by: string;
  confirmed_date?: string;
  confirmed_time?: string;
}

const typeColors: Record<EventType, { bg: string; text: string; dot: string; light: string }> = {
  meeting:    { bg: 'bg-[#e33b5f]',   text: 'text-[#e33b5f]',  dot: 'bg-[#e33b5f]',  light: 'bg-[#e33b5f]/5' },
  newsletter: { bg: 'bg-[#f07969]',   text: 'text-[#f07969]',  dot: 'bg-[#f07969]',  light: 'bg-[#f07969]/5' },
  expiry:     { bg: 'bg-red-500',      text: 'text-red-600',    dot: 'bg-red-500',     light: 'bg-red-50' },
  deadline:   { bg: 'bg-purple-500',   text: 'text-purple-600', dot: 'bg-purple-500',  light: 'bg-purple-50' },
  vote:       { bg: 'bg-sky-500',      text: 'text-sky-700',    dot: 'bg-sky-500',     light: 'bg-sky-50' },
};

const typeLabels: Record<EventType, string> = {
  meeting: 'Meeting', newsletter: 'Newsletter', expiry: 'Expiry Alert', deadline: 'Deadline', vote: 'Meeting Vote',
};

export default function CalendarPage({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin     = role === 'admin' || role === 'super-admin' || role === 'developer';
  const isShareholder = role === 'shareholder' || isAdmin;

  const today   = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear,  setCurrentYear]  = useState(today.getFullYear());
  const [selectedDay,  setSelectedDay]  = useState<number | null>(null);
  const [teamsConnected, setTeamsConnected] = useState(false);
  const [teamsExpired,   setTeamsExpired]   = useState(false);
  const [syncing,        setSyncing]        = useState(false);
  const [syncMsg,        setSyncMsg]        = useState('');
  const [attendanceData,   setAttendanceData]   = useState<any>(null);
  const [openAttendId,    setOpenAttendId]     = useState<string | null>(null);
  const [leaderboard,      setLeaderboard]      = useState<{name: string; email: string; minutes: number; meetings: number}[]>([]);
  const [loadingBoard,     setLoadingBoard]      = useState(false);
  const [boardLoaded,      setBoardLoaded]       = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [partners,       setPartners]       = useState<{id: string; name: string; email: string}[]>([]);
  const [invitees,       setInvitees]       = useState<string[]>([]);

  // Check if Teams is connected
  useEffect(() => {
    supabase.from('teams_connections').select('id, expires_at').eq('connected', true).limit(1).maybeSingle()
      .then(({ data }) => {
        setTeamsConnected(!!data);
        if (data?.expires_at && new Date(data.expires_at) < new Date()) setTeamsExpired(true);
      });
    if (window.location.search.includes('teams_connected=true')) { setTeamsConnected(true); setTeamsExpired(false); }
    supabase.from('profiles').select('id, first_name, last_name, email').order('first_name')
      .then(({ data }) => setPartners((data ?? []).map((p: any) => ({
        id: p.id,
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email,
        email: p.email,
      }))));
  }, []);

  // Events from Supabase
  const [events,        setEvents]        = useState<CalendarEvent[]>([]);
  const [meetingVotes,  setMeetingVotes]  = useState<MeetingVote[]>([]);
  const [loading,       setLoading]       = useState(true);

  // New event form
  const [showNewEvent,  setShowNewEvent]  = useState(false);
  const [newTitle,      setNewTitle]      = useState('');
  const [newDate,       setNewDate]       = useState('');
  const [newTime,       setNewTime]       = useState('');
  const [newType,       setNewType]       = useState<EventType>('meeting');
  const [newLocation,   setNewLocation]   = useState('');
  const [newDesc,       setNewDesc]       = useState('');
  const [savingEvent,   setSavingEvent]   = useState(false);

  // New vote form
  const [showNewVoteDialog,  setShowNewVoteDialog]  = useState(false);
  const [newVoteTitle,       setNewVoteTitle]        = useState('');
  const [newVoteProposals,   setNewVoteProposals]    = useState([
    { date: '', time: '' }, { date: '', time: '' }, { date: '', time: '' },
  ]);

  async function fetchData() {
    setLoading(true);
    const [evRes, voteRes] = await Promise.all([
      supabase.from('calendar_events').select('*').order('date'),
      supabase.from('meeting_votes').select('*').order('created_at', { ascending: false }),
    ]);
    if (evRes.data)   setEvents(evRes.data as CalendarEvent[]);
    if (voteRes.data) setMeetingVotes(voteRes.data as MeetingVote[]);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // Calendar grid
  const firstDay     = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth  = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  function getEventsForDate(day: number): CalendarEvent[] {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  }

  function getVotesForDate(day: number): MeetingVote[] {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return meetingVotes.filter(v =>
      v.proposed_dates?.some(s => s.date === dateStr) ||
      v.confirmed_date === dateStr
    );
  }

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); };

  // Voting — one vote per user per poll, stored by profile ID
  const handleVote = async (voteId: string, slotIndex: number) => {
    if (!profile) return;
    const vote = meetingVotes.find(v => v.id === voteId);
    if (!vote || vote.status !== 'voting') return;

    const userId = profile.id;
    const updatedSlots = vote.proposed_dates.map((s, i) => {
      const alreadyVoted = s.voter_ids?.includes(userId);
      if (i === slotIndex) {
        // Toggle: if already voted here, remove; else add
        if (alreadyVoted) {
          return { ...s, votes: Math.max(0, s.votes - 1), voter_ids: s.voter_ids.filter(id => id !== userId) };
        }
        return { ...s, votes: s.votes + 1, voter_ids: [...(s.voter_ids ?? []), userId] };
      }
      // Remove vote from other slots (one vote per person)
      if (alreadyVoted) return s; // wasn't on this slot
      if (s.voter_ids?.includes(userId)) {
        return { ...s, votes: Math.max(0, s.votes - 1), voter_ids: s.voter_ids.filter(id => id !== userId) };
      }
      return s;
    });

    // Optimistic update
    setMeetingVotes(prev => prev.map(v => v.id === voteId ? { ...v, proposed_dates: updatedSlots } : v));

    // Persist
    await supabase.from('meeting_votes').update({ proposed_dates: updatedSlots }).eq('id', voteId);
  };

  const hasVotedForSlot = (vote: MeetingVote, slotIndex: number) =>
    profile ? (vote.proposed_dates[slotIndex]?.voter_ids ?? []).includes(profile.id) : false;

  const confirmMeeting = async (voteId: string) => {
    const vote = meetingVotes.find(v => v.id === voteId);
    if (!vote) return;
    const top  = vote.proposed_dates.reduce((best, cur) => cur.votes > best.votes ? cur : best, vote.proposed_dates[0]);
    const updated = { ...vote, status: 'confirmed' as const, confirmed_date: top.date, confirmed_time: top.time };
    setMeetingVotes(prev => prev.map(v => v.id === voteId ? updated : v));
    await supabase.from('meeting_votes').update({ status: 'confirmed', confirmed_date: top.date, confirmed_time: top.time }).eq('id', voteId);
  };

  const createVote = async () => {
    if (!profile || !newVoteTitle.trim()) return;
    const slots = newVoteProposals.filter(p => p.date && p.time).map(p => ({ date: p.date, time: p.time, votes: 0, voter_ids: [] }));
    if (slots.length < 2) return;
    const { data } = await supabase.from('meeting_votes').insert({
      title: newVoteTitle.trim(),
      proposed_dates: slots,
      status: 'voting',
      initiated_by: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
    }).select().single();
    if (data) setMeetingVotes(prev => [data as MeetingVote, ...prev]);
    setNewVoteTitle('');
    setNewVoteProposals([{ date: '', time: '' }, { date: '', time: '' }, { date: '', time: '' }]);
    setShowNewVoteDialog(false);
  };

  const syncTeams = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/teams/sync-calendar');
      const data = await res.json();

      // Token expired — redirect to Teams auth, return here after
      if (res.status === 401 || data.error?.toLowerCase().includes('expired') || data.error?.toLowerCase().includes('token')) {
        setSyncing(false);
        setSyncMsg('🔄 Token expired — redirecting to Teams login...');
        setTimeout(() => {
          window.location.href = '/api/teams/auth?redirect=/';
        }, 1200);
        return;
      }

      if (data.error) {
        setSyncMsg(`❌ ${data.error}`);
      } else {
        setSyncMsg(`✓ Synced ${data.synced} of ${data.total} meetings from Teams`);
        await fetchData();
      }
    } catch (e: any) {
      setSyncMsg('❌ Network error — check your connection');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 8000);
  };

  const buildLeaderboard = async () => {
    setLoadingBoard(true);
    const pastMeetings = events.filter(e => {
      const [ey, em, ed] = e.date.split('-').map(Number);
      const timeParts = (e.time || '').match(/(\d+):(\d+)/);
      const dt = timeParts ? new Date(ey, em - 1, ed, parseInt(timeParts[1]), parseInt(timeParts[2])) : new Date(ey, em - 1, ed);
      return dt < new Date() && e.type === 'meeting' && (e as any).teams_event_id;
    });

    const totals: Record<string, { name: string; email: string; minutes: number; meetings: number }> = {};

    for (const e of pastMeetings) {
      try {
        const res = await fetch('/api/teams/attendance?meetingId=' + encodeURIComponent((e as any).teams_event_id));
        const data = await res.json();
        if (data.attendees?.length) {
          for (const a of data.attendees) {
            const key = a.email || a.name;
            if (!totals[key]) totals[key] = { name: a.name, email: a.email, minutes: 0, meetings: 0 };
            totals[key].minutes  += Math.round((a.duration ?? 0) / 60);
            totals[key].meetings += 1;
          }
        }
      } catch { /* skip failed meetings */ }
    }

    const board = Object.values(totals)
      .filter(p => p.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 10);

    setLeaderboard(board);
    setBoardLoaded(true);
    setLoadingBoard(false);
  };

  const fetchAttendance = async (teamsEventId: string) => {
    setLoadingAttendance(true);
    setAttendanceData(null);
    setOpenAttendId(teamsEventId);
    try {
      const res = await fetch('/api/teams/attendance?meetingId=' + encodeURIComponent(teamsEventId));
      const data = await res.json();
      setAttendanceData({ ...data, _meetingId: teamsEventId });
    } catch (err) {
      setAttendanceData({ _meetingId: teamsEventId, attendees: [], message: 'Network error fetching attendance.' });
    }
    setLoadingAttendance(false);
  };

  const downloadAttendance = (data: any, title: string) => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Name', 'Email', 'Join Time', 'Leave Time', 'Duration (min)', 'Role'],
      ...(data.attendees ?? []).map((a: any) => [
        a.name ?? '', a.email ?? '',
        a.joinTime  ? new Date(a.joinTime).toLocaleString()  : '',
        a.leaveTime ? new Date(a.leaveTime).toLocaleString() : '',
        a.duration  ? Math.round(a.duration / 60)            : '',
        a.role ?? '',
      ]),
    ];
    const csv = rows.map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveNewEvent = async () => {
    if (!profile || !newTitle.trim() || !newDate) return;
    setSavingEvent(true);

    // Auto-create Teams meeting if event type is 'meeting'
    let teamsJoinUrl: string | null = null;
    if (newType === 'meeting' && newDate && newTime) {
      try {
        const startDT = new Date(`${newDate}T${newTime}`).toISOString();
        const res = await fetch('/api/teams/create-meeting', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title:          newTitle.trim(),
            start_datetime: startDT,
            description:    newDesc.trim() || null,
            invitee_emails: invitees.map(id => partners.find((p: any) => p.id === id)?.email).filter(Boolean),
          }),
        });
        const data = await res.json();
        if (data.join_url) teamsJoinUrl = data.join_url;
      } catch (e: any) {
        console.error('Teams meeting creation failed:', e);
        setSyncMsg('⚠️ Meeting saved but Teams link failed: ' + (e?.message ?? 'unknown error'));
        setTimeout(() => setSyncMsg(''), 8000);
      }
    }

    const { data } = await supabase.from('calendar_events').insert({
      title:       newTitle.trim(),
      date:        newDate,
      time:        newTime || 'All Day',
      type:        newType,
      location:    teamsJoinUrl ? 'Microsoft Teams' : (newLocation.trim() || 'TBD'),
      description: [newDesc.trim(), teamsJoinUrl ? `Teams link: ${teamsJoinUrl}` : null].filter(Boolean).join('\n') || null,
      created_by:      profile.id,
      invitees:        invitees.length > 0 ? invitees : null,
      teams_join_url:  teamsJoinUrl,
    }).select().single();

    if (data) setEvents(prev => [...prev, data as CalendarEvent]);
    setNewTitle(''); setNewDate(''); setNewTime(''); setNewLocation(''); setNewDesc(''); setInvitees([]);
    setShowNewEvent(false);
    setSavingEvent(false);
  };

  const selectedDayEvents = selectedDay ? getEventsForDate(selectedDay) : [];
  const selectedDayVotes  = selectedDay ? getVotesForDate(selectedDay)  : [];
  const selectedDayName   = selectedDay ? daysOfWeekFull[new Date(currentYear, currentMonth, selectedDay).getDay()] : '';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Calendar</h1>
          <p className="text-[#7e7e7e]">Platform events, meetings & deadlines</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(role === 'super-admin' || role === 'developer') && (
            <Button size="sm" variant="outline" className="border-[#5059C9] text-[#5059C9] hover:bg-[#5059C9]/5 gap-1.5 text-xs h-8"
              onClick={syncTeams} disabled={syncing}>
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Sync Teams
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => { fetchData(); }} disabled={loading} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {isAdmin && (
            <Button size="sm" className="bg-[#e33b5f] text-white" onClick={() => setShowNewEvent(v => !v)}>
              <Plus className="w-4 h-4 mr-1" />{showNewEvent ? 'Cancel' : 'Add Event'}
            </Button>
          )}
          <Dialog open={showNewVoteDialog} onOpenChange={setShowNewVoteDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Vote className="w-4 h-4 mr-1" /> New Vote</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Meeting Time Vote</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Meeting Title</Label>
                  <Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. Q3 Strategy Review" value={newVoteTitle} onChange={e => setNewVoteTitle(e.target.value)} />
                </div>
                <p className="text-xs text-[#7e7e7e]">Add at least 2 time options for participants to vote on</p>
                {newVoteProposals.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Option {i + 1} — Date</Label>
                      <Input type="date" className="mt-1 border-[#f0f0f0]" value={p.date} onChange={e => setNewVoteProposals(prev => prev.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} />
                    </div>
                    <div>
                      <Label className="text-xs">Time</Label>
                      <Input type="time" className="mt-1 border-[#f0f0f0]" value={p.time} onChange={e => setNewVoteProposals(prev => prev.map((x, j) => j === i ? { ...x, time: e.target.value } : x))} />
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button className="bg-[#e33b5f] text-white" onClick={createVote} disabled={!newVoteTitle.trim() || newVoteProposals.filter(p => p.date && p.time).length < 2}>
                  <Send className="w-4 h-4 mr-2" />Send Vote
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* New event form */}
      {isAdmin && showNewEvent && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardHeader className="pb-3"><CardTitle className="text-base text-[#e33b5f]">Add Event</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label className="text-sm">Title</Label><Input className="mt-1 border-[#f0f0f0]" value={newTitle} onChange={e => setNewTitle(e.target.value)} /></div>
              <div>
                <Label className="text-sm">Type</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {(['meeting','deadline','expiry','newsletter'] as EventType[]).map(t => (
                    <button key={t} onClick={() => setNewType(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${newType === t ? `${typeColors[t].bg} text-white border-transparent` : 'bg-white text-[#555353] border-[#f0f0f0]'}`}>
                      {typeLabels[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label className="text-sm">Date</Label><Input type="date" className="mt-1 border-[#f0f0f0]" value={newDate} onChange={e => setNewDate(e.target.value)} /></div>
              <div><Label className="text-sm">Time</Label><Input type="time" className="mt-1 border-[#f0f0f0]" value={newTime} onChange={e => setNewTime(e.target.value)} /></div>
              <div><Label className="text-sm">Location</Label><Input className="mt-1 border-[#f0f0f0]" placeholder="e.g. Board Room" value={newLocation} onChange={e => setNewLocation(e.target.value)} /></div>
            </div>
            <div><Label className="text-sm">Description (optional)</Label><Input className="mt-1 border-[#f0f0f0]" value={newDesc} onChange={e => setNewDesc(e.target.value)} /></div>
            <div>
              <Label className="text-sm">Invite Partners (optional)</Label>
              <div className="mt-1 flex flex-wrap gap-1.5 p-2 border border-[#f0f0f0] rounded-lg min-h-[40px]">
                {invitees.map(id => {
                  const p = partners.find(p => p.id === id);
                  return (
                    <span key={id} className="flex items-center gap-1 bg-[#e33b5f]/10 text-[#e33b5f] text-xs px-2 py-0.5 rounded-full">
                      {p?.name ?? id}
                      <button onClick={() => setInvitees(prev => prev.filter(i => i !== id))} className="hover:text-red-600">×</button>
                    </span>
                  );
                })}
                <select className="text-xs border-0 bg-transparent text-[#9e9e9e] focus:outline-none cursor-pointer"
                  value="" onChange={e => { if (e.target.value && !invitees.includes(e.target.value)) setInvitees(prev => [...prev, e.target.value]); }}>
                  <option value="">+ Add person…</option>
                  {partners.filter(p => !invitees.includes(p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button className="bg-[#e33b5f] text-white" onClick={saveNewEvent} disabled={savingEvent || !newTitle.trim() || !newDate}>
              {savingEvent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Save Event
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(typeColors) as [EventType, typeof typeColors[EventType]][]).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-[#7e7e7e]">
            <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />{typeLabels[type]}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <h2 className="font-bold text-[#222] text-lg">{monthNames[currentMonth]} {currentYear}</h2>
                <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-7 mb-2">
                {daysOfWeek.map((d, i) => <div key={i} className="text-center text-xs font-medium text-[#9e9e9e] py-1">{d}</div>)}
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-[#9e9e9e]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading events...
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`prev-${i}`} className="aspect-square p-1 text-center text-xs text-[#d0d0d0] flex items-start justify-center pt-2 pointer-events-none select-none">
                      {prevMonthDays - firstDay + i + 1}
                    </div>
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDate(day);
                    const dayVotes  = getVotesForDate(day);
                    const isToday   = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                    const isSelected = selectedDay === day;
                    const isPast     = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    return (
                      <div key={day}
                        onClick={() => setSelectedDay(isSelected ? null : day)}
                        className={`aspect-square p-1 rounded-lg cursor-pointer transition flex flex-col items-center ${isSelected ? 'bg-[#e33b5f]/10 ring-2 ring-[#e33b5f]/30' : 'hover:bg-[#f6f6f6]'}`}>
                        <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${isToday ? 'bg-[#e33b5f] text-white' : isPast ? 'text-[#9e9e9e]' : 'text-[#222]'}`}>{day}</span>
                        <div className="flex flex-wrap gap-0.5 justify-center">
                          {dayEvents.slice(0, 3).map(e => <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${typeColors[e.type]?.dot ?? 'bg-[#e33b5f]'}`} />)}
                          {dayVotes.map(v => <div key={v.id} className="w-1.5 h-1.5 rounded-full bg-sky-500" />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Day detail */}
        <div className="space-y-4">
          {selectedDay ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#e33b5f]/10 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold leading-none text-[#e33b5f] mt-0.5">{selectedDay}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#222]">{selectedDayName}</h3>
                    <p className="text-sm text-[#9e9e9e]">{monthNames[currentMonth]} {selectedDay}, {currentYear}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDayEvents.length === 0 && selectedDayVotes.length === 0 ? (
                  <p className="text-sm text-[#9e9e9e] text-center py-4">No events on this day</p>
                ) : (
                  <>
                    {selectedDayEvents.map(e => {
                      const c = typeColors[e.type] ?? typeColors.meeting;
                      const Icon = e.type === 'meeting' ? Video : e.type === 'newsletter' ? Mail : e.type === 'expiry' ? AlertTriangle : Clock;
                      const [ey, em, ed] = e.date.split('-').map(Number);
                      // Combine date + time for accurate past check
                      const timeParts = (e.time || '').match(/(\d+):(\d+)/);
                      const eventDateTime = timeParts
                        ? new Date(ey, em - 1, ed, parseInt(timeParts[1]), parseInt(timeParts[2]))
                        : new Date(ey, em - 1, ed, 23, 59);
                      const isPast = eventDateTime < new Date();
                      const joinUrl = e.teams_join_url ?? (e.description?.match(/Teams link: (https:\/\/\S+)/)?.[1]);
                      return (
                        <div key={e.id}
                          className={`flex items-start gap-3 p-3 ${c.light} rounded-xl ${joinUrl && !isPast ? 'cursor-pointer hover:opacity-90 transition' : ''}`}
                          onClick={() => joinUrl && !isPast && window.open(joinUrl, '_blank')}>
                          <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-[#222] text-sm">{e.title}</h4>
                              {joinUrl && !isPast && <span className="text-[10px] bg-[#5059C9] text-white px-1.5 py-0.5 rounded font-medium">Join Teams</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-[#7e7e7e] flex-wrap">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.time}</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>
                            </div>
                            {e.description && <p className="text-xs text-[#7e7e7e] mt-1 line-clamp-2">{e.description}</p>}
                            {isPast && e.type === 'meeting' && (e as any).teams_event_id && (() => {
                              const isThis = openAttendId === (e as any).teams_event_id;
                              return (
                                <div className="mt-2 space-y-1">
                                  <div className="flex gap-2 flex-wrap">
                                    <button
                                      onClick={() => { if (isThis) { setAttendanceData(null); setOpenAttendId(null); } else { fetchAttendance((e as any).teams_event_id); } }}
                                      disabled={loadingAttendance}
                                      className="text-xs px-2 py-0.5 bg-white border border-[#e33b5f]/30 text-[#e33b5f] rounded-full hover:bg-[#e33b5f]/5 transition flex items-center gap-1">
                                      {loadingAttendance && !isThis ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : '👥'}
                                      {isThis ? 'Hide Attendance' : 'View Attendance'}
                                    </button>
                                    {isThis && attendanceData && attendanceData.attendees?.length > 0 && (
                                      <button
                                        onClick={() => downloadAttendance(attendanceData, e.title)}
                                        className="text-xs px-2 py-0.5 bg-white border border-[#f0f0f0] text-[#555353] rounded-full hover:border-[#e33b5f]/30 transition">
                                        📄 Download CSV
                                      </button>
                                    )}
                                  </div>
                                  {isThis && (
                                    <div className="bg-[#f6f6f6] rounded-lg p-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                                      {loadingAttendance && <div className="flex items-center gap-1.5 py-1"><Loader2 className="w-3 h-3 animate-spin text-[#9e9e9e]" /><span className="text-[#9e9e9e]">Fetching attendance...</span></div>}
                                      {attendanceData?.message ? (
                                        <p className="text-[#9e9e9e] italic">{attendanceData.message}</p>
                                      ) : (
                                        <>
                                          <p className="font-semibold text-[#222]">{attendanceData?.totalParticipants ?? 0} participants</p>
                                          {(attendanceData?.attendees ?? []).map((a: any, i: number) => (
                                            <div key={i} className="flex justify-between text-[#555353]">
                                              <span className="truncate flex-1">{a.name}</span>
                                              <span className="ml-2 flex-shrink-0">{a.duration ? Math.round(a.duration / 60) + ' min' : '—'}</span>
                                            </div>
                                          ))}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                    {selectedDayVotes.map(vote => (
                      <div key={vote.id} className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Vote className="w-4 h-4 text-sky-600" />
                          <p className="text-sm font-semibold text-sky-800">{vote.title}</p>
                          <Badge className={`text-xs ml-auto ${vote.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                            {vote.status}
                          </Badge>
                        </div>
                        {vote.status === 'voting' && (
                          <div className="space-y-2 mb-2">
                            {vote.proposed_dates.map((slot, si) => {
                              const total   = vote.proposed_dates.reduce((s, x) => s + x.votes, 0) || 1;
                              const pct     = Math.round((slot.votes / total) * 100);
                              const myVote  = hasVotedForSlot(vote, si);
                              return (
                                <button key={si} onClick={() => handleVote(vote.id, si)}
                                  className={`w-full text-left p-2 rounded-lg border transition ${myVote ? 'bg-sky-100 border-sky-300' : 'bg-white border-[#f0f0f0] hover:border-sky-300'}`}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-[#222]">{slot.date} · {slot.time}</span>
                                    <div className="flex items-center gap-1.5">
                                      {myVote && <Check className="w-3 h-3 text-sky-600" />}
                                      <span className="text-xs text-sky-600 font-medium">{slot.votes} vote{slot.votes !== 1 ? 's' : ''}</span>
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                                    <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {vote.status === 'confirmed' && (
                          <p className="text-xs text-emerald-700 font-medium">✓ Confirmed: {vote.confirmed_date} at {vote.confirmed_time}</p>
                        )}
                        {isAdmin && vote.status === 'voting' && (
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 text-white w-full mt-2" onClick={() => confirmMeeting(vote.id)}>
                            <Check className="w-3 h-3 mr-1" />Confirm Top Date
                          </Button>
                        )}
                        <p className="text-[10px] text-[#9e9e9e] mt-1">Initiated by {vote.initiated_by}</p>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-[#f0f0f0]">
              <CardContent className="p-6 text-center">
                <CalendarIcon className="w-8 h-8 text-[#9e9e9e] mx-auto mb-2" />
                <p className="text-sm text-[#9e9e9e]">Click a date to see events</p>
              </CardContent>
            </Card>
          )}

          {/* Upcoming events */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Upcoming</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <p className="text-xs text-[#9e9e9e] text-center py-4">Loading...</p>
              ) : events.filter(e => e.date >= today.toISOString().slice(0, 10)).slice(0, 6).length === 0 ? (
                <p className="text-xs text-[#9e9e9e] text-center py-4">No upcoming events</p>
              ) : (
                events.filter(e => e.date >= today.toISOString().slice(0, 10))
                  .slice(0, 6)
                  .map(e => {
                    const c = typeColors[e.type] ?? typeColors.meeting;
                    return (
                      <div key={e.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#f6f6f6] transition cursor-pointer"
                        onClick={() => {
                          const [year, month, day] = e.date.split('-').map(Number);
                          setCurrentMonth(month - 1);
                          setCurrentYear(year);
                          setSelectedDay(day);
                        }}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#222] truncate">{e.title}</p>
                          <p className="text-[10px] text-[#9e9e9e]">{e.date} · {e.time}</p>
                        </div>
                      </div>
                    );
                  })
              )}
            </CardContent>
          </Card>

          {/* Attendance Leaderboard */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">🏆 Attendance Leaderboard</CardTitle>
                {!boardLoaded && (
                  <button onClick={buildLeaderboard} disabled={loadingBoard}
                    className="text-[10px] text-[#e33b5f] hover:underline font-medium">
                    {loadingBoard ? 'Loading...' : 'Load'}
                  </button>
                )}
                {boardLoaded && (
                  <button onClick={buildLeaderboard} disabled={loadingBoard}
                    className="text-[10px] text-[#9e9e9e] hover:text-[#e33b5f]">
                    {loadingBoard ? '...' : '↻'}
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[#9e9e9e]">Total minutes across all meetings</p>
            </CardHeader>
            <CardContent className="space-y-1">
              {!boardLoaded ? (
                <p className="text-xs text-[#9e9e9e] text-center py-3">Click Load to build leaderboard</p>
              ) : loadingBoard ? (
                <div className="flex items-center justify-center py-4 gap-2 text-[#9e9e9e]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /><span className="text-xs">Fetching attendance...</span>
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-xs text-[#9e9e9e] text-center py-3">No attendance data yet</p>
              ) : leaderboard.map((p, i) => (
                <div key={p.email || p.name} className="flex items-center gap-2 py-1.5 border-b border-[#f0f0f0] last:border-0">
                  <span className={`text-xs font-black w-5 text-center ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-stone-400' : i === 2 ? 'text-orange-400' : 'text-[#9e9e9e]'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#222] truncate">{p.name}</p>
                    <p className="text-[10px] text-[#9e9e9e]">{p.meetings} meeting{p.meetings !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-xs font-bold text-[#e33b5f] flex-shrink-0">{p.minutes} min</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
