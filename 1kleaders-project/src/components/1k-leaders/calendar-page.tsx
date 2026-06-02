'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon, Clock, Bell, Mail, MessageSquare, AlertTriangle,
  Plus, ChevronLeft, ChevronRight, Video, MapPin, Vote, ThumbsUp, Users,
  Check, X, Send, Sparkles, User, Phone
} from 'lucide-react';
import type { DashboardRole } from './types';

interface Props { role: DashboardRole; }

const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const daysOfWeekFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  type: 'meeting' | 'newsletter' | 'expiry' | 'deadline' | 'vote';
  color: string;
  location: string;
  shortLabel: string;
}

interface MeetingVote {
  id: number;
  title: string;
  proposedDates: { date: string; time: string; votes: number; voters: string[] }[];
  status: 'voting' | 'confirmed' | 'cancelled';
  initiatedBy: string;
  participants: string[];
  confirmedDate?: string;
  confirmedTime?: string;
}

const calendarEvents: CalendarEvent[] = [
  { id: 1, title: 'Partner Strategy Meeting', date: '2026-05-21', time: '10:00 AM', type: 'meeting', color: 'bg-[#e33b5f]/50', location: 'Conference Room A', shortLabel: 'Strategy Mtg' },
  { id: 2, title: 'Newsletter: Monthly Update', date: '2026-05-22', time: '9:00 AM', type: 'newsletter', color: 'bg-[#f07969]/50', location: 'Email', shortLabel: 'Newsletter' },
  { id: 3, title: 'ID Expiry - Ahmed', date: '2026-05-25', time: 'All Day', type: 'expiry', color: 'bg-red-500', location: 'Action Required', shortLabel: 'ID Expiry ⚠' },
  { id: 4, title: 'Idea Pitch: GreenTech', date: '2026-05-26', time: '2:00 PM', type: 'meeting', color: 'bg-[#e33b5f]/50', location: 'Virtual - Zoom', shortLabel: 'GreenTech Pitch' },
  { id: 5, title: 'VEP Evaluation Deadline', date: '2026-05-28', time: '11:59 PM', type: 'deadline', color: 'bg-purple-500', location: 'Platform', shortLabel: 'VEP Deadline' },
  { id: 6, title: 'Shareholder AGM', date: '2026-05-30', time: '3:00 PM', type: 'meeting', color: 'bg-[#e33b5f]/50', location: 'Main Hall', shortLabel: 'AGM' },
  { id: 7, title: 'Passport Expiry - Fatima', date: '2026-06-01', time: 'All Day', type: 'expiry', color: 'bg-red-500', location: 'Action Required', shortLabel: 'Passport Exp ⚠' },
  { id: 8, title: 'Newsletter: Q2 Review', date: '2026-06-05', time: '9:00 AM', type: 'newsletter', color: 'bg-[#f07969]/50', location: 'Email', shortLabel: 'Q2 Review' },
  { id: 9, title: 'Demo Day', date: '2026-06-10', time: '10:00 AM', type: 'meeting', color: 'bg-[#e33b5f]/50', location: 'Convention Center', shortLabel: 'Demo Day' },
  { id: 10, title: 'License Renewal - Co.', date: '2026-06-15', time: 'All Day', type: 'expiry', color: 'bg-red-500', location: 'Action Required', shortLabel: 'License Exp ⚠' },
  { id: 11, title: 'Investment Committee', date: '2026-06-18', time: '1:00 PM', type: 'meeting', color: 'bg-[#e33b5f]/50', location: 'Board Room', shortLabel: 'Invest. Review' },
  { id: 12, title: 'Newsletter: Weekly', date: '2026-06-20', time: '8:00 AM', type: 'newsletter', color: 'bg-[#f07969]/50', location: 'Email', shortLabel: 'Weekly Digest' },
];

const initialMeetingVotes: MeetingVote[] = [
  {
    id: 1,
    title: 'Q3 Strategy Review Meeting',
    proposedDates: [
      { date: '2026-06-05', time: '10:00 AM', votes: 5, voters: ['Ahmed', 'Fatima', 'Omar', 'Sara', 'Khalid'] },
      { date: '2026-06-06', time: '2:00 PM', votes: 3, voters: ['Ahmed', 'Nora', 'Ali'] },
      { date: '2026-06-07', time: '11:00 AM', votes: 4, voters: ['Fatima', 'Omar', 'Sara', 'Layla'] },
    ],
    status: 'voting',
    initiatedBy: 'Ahmed Al-Rashid',
    participants: ['Ahmed', 'Fatima', 'Omar', 'Sara', 'Khalid', 'Nora', 'Ali', 'Layla'],
  },
  {
    id: 2,
    title: 'Investment Portfolio Review',
    proposedDates: [
      { date: '2026-06-12', time: '9:00 AM', votes: 6, voters: ['Ahmed', 'Fatima', 'Omar', 'Sara', 'Khalid', 'Nora'] },
      { date: '2026-06-13', time: '3:00 PM', votes: 2, voters: ['Ali', 'Layla'] },
    ],
    status: 'voting',
    initiatedBy: 'Sara Mohammed',
    participants: ['Ahmed', 'Fatima', 'Omar', 'Sara', 'Khalid', 'Nora', 'Ali', 'Layla'],
  },
  {
    id: 3,
    title: 'Annual Shareholder Meeting',
    proposedDates: [
      { date: '2026-06-20', time: '4:00 PM', votes: 8, voters: ['Ahmed', 'Fatima', 'Omar', 'Sara', 'Khalid', 'Nora', 'Ali', 'Layla'] },
    ],
    status: 'confirmed',
    initiatedBy: 'Admin Team',
    participants: ['Ahmed', 'Fatima', 'Omar', 'Sara', 'Khalid', 'Nora', 'Ali', 'Layla'],
    confirmedDate: '2026-06-20',
    confirmedTime: '4:00 PM',
  },
];

const typeColors: Record<string, { bg: string; text: string; dot: string; light: string }> = {
  meeting: { bg: 'bg-[#e33b5f]/50', text: 'text-[#c02d4f]', dot: 'bg-[#e33b5f]/50', light: 'bg-[#e33b5f]/5' },
  newsletter: { bg: 'bg-[#f07969]/50', text: 'text-[#E65F5C]', dot: 'bg-[#f07969]/50', light: 'bg-[#f07969]/5' },
  expiry: { bg: 'bg-red-500', text: 'text-red-700', dot: 'bg-red-500', light: 'bg-red-50' },
  deadline: { bg: 'bg-purple-500', text: 'text-purple-700', dot: 'bg-purple-500', light: 'bg-purple-50' },
  vote: { bg: 'bg-sky-500', text: 'text-sky-700', dot: 'bg-sky-500', light: 'bg-sky-50' },
};

export default function CalendarPage({ role }: Props) {
  const [currentMonth, setCurrentMonth] = useState(4);
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [meetingVotes, setMeetingVotes] = useState<MeetingVote[]>(initialMeetingVotes);
  const [userVotedSlots, setUserVotedSlots] = useState<Record<number, number>>({});
  const [showNewVoteDialog, setShowNewVoteDialog] = useState(false);
  const [newVoteTitle, setNewVoteTitle] = useState('');
  const [newVoteProposals, setNewVoteProposals] = useState([{ date: '', time: '' }]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const today = new Date();

  const prev = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); };
  const next = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calendarEvents.filter(e => e.date === dateStr);
  };

  const isToday = (day: number) => today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  const handleVote = (voteId: number, slotIndex: number) => {
    const prevSlot = userVotedSlots[voteId];
    setMeetingVotes(prev => prev.map(v => {
      if (v.id !== voteId) return v;
      return { ...v, proposedDates: v.proposedDates.map((s, i) => {
        if (i === slotIndex) return { ...s, votes: s.votes + 1, voters: [...s.voters, 'You'] };
        if (i === prevSlot) return { ...s, votes: Math.max(0, s.votes - 1), voters: s.voters.filter(vr => vr !== 'You') };
        return s;
      })};
    }));
    setUserVotedSlots(prev => ({ ...prev, [voteId]: slotIndex }));
  };

  const addNewProposal = () => setNewVoteProposals(prev => [...prev, { date: '', time: '' }]);
  const removeProposal = (index: number) => { if (newVoteProposals.length > 1) setNewVoteProposals(prev => prev.filter((_, i) => i !== index)); };

  const createNewVote = () => {
    if (!newVoteTitle.trim() || newVoteProposals.some(p => !p.date || !p.time)) return;
    setMeetingVotes(prev => [...prev, {
      id: Date.now(),
      title: newVoteTitle,
      proposedDates: newVoteProposals.map(p => ({ date: p.date, time: p.time, votes: 0, voters: [] })),
      status: 'voting',
      initiatedBy: 'You',
      participants: ['All Partners & Shareholders'],
    }]);
    setNewVoteTitle('');
    setNewVoteProposals([{ date: '', time: '' }]);
    setShowNewVoteDialog(false);
  };

  const confirmMeeting = (voteId: number) => {
    setMeetingVotes(prev => prev.map(v => {
      if (v.id !== voteId) return v;
      const topSlot = v.proposedDates.reduce((best, cur) => cur.votes > best.votes ? cur : best, v.proposedDates[0]);
      return { ...v, status: 'confirmed', confirmedDate: topSlot.date, confirmedTime: topSlot.time };
    }));
  };

  const selectedDayEvents = selectedDay ? getEventsForDate(selectedDay) : [];
  const selectedDayName = selectedDay ? daysOfWeekFull[new Date(currentYear, currentMonth, selectedDay).getDay()] : '';

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Calendar</h1>
          <p className="text-[#9e9e9e] text-sm">Manage meetings, deadlines & document alerts</p>
        </div>
        <Dialog open={showNewVoteDialog} onOpenChange={setShowNewVoteDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] rounded-xl shadow-sm" size="sm">
              <Vote className="w-4 h-4 mr-1.5" /> New Meeting Vote
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5 text-[#e33b5f]" /> Create Meeting Vote
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-[#444] mb-1 block">Meeting Title</label>
                <input type="text" className="w-full px-3 py-2.5 border border-[#f0f0f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="e.g., Q3 Strategy Review" value={newVoteTitle} onChange={e => setNewVoteTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-[#444] mb-2 block">Proposed Date/Time Options</label>
                <p className="text-xs text-[#9e9e9e] mb-3">Add multiple options for participants to vote on</p>
                <div className="space-y-2">
                  {newVoteProposals.map((proposal, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="date" className="flex-1 px-3 py-2 border border-[#f0f0f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={proposal.date} onChange={e => { const u = [...newVoteProposals]; u[idx] = { ...u[idx], date: e.target.value }; setNewVoteProposals(u); }} />
                      <input type="time" className="w-28 px-3 py-2 border border-[#f0f0f0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" value={proposal.time} onChange={e => { const u = [...newVoteProposals]; u[idx] = { ...u[idx], time: e.target.value }; setNewVoteProposals(u); }} />
                      {newVoteProposals.length > 1 && <button onClick={() => removeProposal(idx)} className="text-red-400 hover:text-red-600 p-1"><X className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
                <button onClick={addNewProposal} className="mt-2 w-full py-2 border-2 border-dashed border-[#f0f0f0] rounded-xl text-sm text-[#7e7e7e] hover:border-[#e33b5f]/50 hover:text-[#e33b5f] transition flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> Add Option</button>
              </div>
              <div>
                <label className="text-sm font-medium text-[#444] mb-1 block">Participants</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#fbfbfb] rounded-xl"><Users className="w-4 h-4 text-[#9e9e9e]" /><span className="text-sm text-[#555353]">All Partners & Shareholders</span></div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" className="rounded-xl">Cancel</Button></DialogClose>
              <Button className="bg-[#e33b5f] hover:bg-[#c02d4f] rounded-xl" onClick={createNewVote} disabled={!newVoteTitle.trim() || newVoteProposals.some(p => !p.date || !p.time)}><Send className="w-4 h-4 mr-1" /> Send Vote</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Legend chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { label: 'Meeting', color: 'bg-[#e33b5f]/50', light: 'bg-[#e33b5f]/5 text-[#c02d4f]' },
          { label: 'Newsletter', color: 'bg-[#f07969]/50', light: 'bg-[#f07969]/5 text-[#E65F5C]' },
          { label: 'Deadline', color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700' },
          { label: 'Expiry', color: 'bg-red-500', light: 'bg-red-50 text-red-700' },
        ].map(l => (
          <div key={l.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${l.light}`}>
            <div className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Reminder strip */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl mb-6">
        <div className="w-9 h-9 rounded-xl bg-[#f07969]/10 flex items-center justify-center flex-shrink-0">
          <Bell className="w-4 h-4 text-[#f07969]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#333]">Auto Reminders Active</p>
          <p className="text-xs text-[#7e7e7e]">Email 24h before &bull; WhatsApp 2h before deadlines</p>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#e33b5f]/50 animate-pulse" />
      </div>

      {/* ==================== iPHONE CALENDAR ==================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#f0f0f0] overflow-hidden mb-6">
        {/* Month navigation - Apple style */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0f0f0]">
          <button onClick={prev} className="w-9 h-9 rounded-full hover:bg-[#f6f6f6] flex items-center justify-center transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#555353]" />
          </button>
          <h2 className="text-lg font-semibold text-[#222] tracking-tight">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button onClick={next} className="w-9 h-9 rounded-full hover:bg-[#f6f6f6] flex items-center justify-center transition-colors">
            <ChevronRight className="w-5 h-5 text-[#555353]" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-stone-50">
          {daysOfWeek.map((d, i) => (
            <div key={i} className="py-2 text-center text-[11px] font-semibold text-[#9e9e9e] uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid - iPhone style */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square p-0.5" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const events = getEventsForDate(day);
            const isSelected = selectedDay === day;
            const isTodayCell = isToday(day);
            const hasEvents = events.length > 0;

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`aspect-square p-0.5 cursor-pointer transition-all duration-150 relative
                  ${isSelected ? 'z-10' : ''}
                `}
              >
                <div className={`w-full h-full rounded-2xl flex flex-col items-center pt-1.5 transition-all duration-150 relative overflow-hidden
                  ${isSelected ? 'bg-[#e33b5f] shadow-lg shadow-emerald-200' : isTodayCell ? 'bg-[#e33b5f]/5 ring-2 ring-emerald-400' : 'hover:bg-[#fbfbfb]'}
                `}>
                  {/* Day number */}
                  <span className={`text-[13px] font-semibold leading-none mb-1
                    ${isSelected ? 'text-white' : isTodayCell ? 'text-[#c02d4f]' : 'text-[#333]'}
                  `}>
                    {day}
                  </span>

                  {/* Event dots - iPhone style */}
                  {hasEvents && !isSelected && (
                    <div className="flex flex-col gap-[3px] items-center mt-0.5">
                      {events.slice(0, 3).map((e, ei) => (
                        <div key={ei} className={`w-[5px] h-[5px] rounded-full ${typeColors[e.type]?.dot || 'bg-[#9e9e9e]'}`} />
                      ))}
                    </div>
                  )}

                  {/* Selected: show mini event chips */}
                  {hasEvents && isSelected && (
                    <div className="flex flex-col gap-[2px] items-center mt-0.5 w-full px-1">
                      {events.slice(0, 2).map((e, ei) => (
                        <div key={ei} className="w-full text-[7px] leading-tight text-white/90 font-medium bg-white/20 rounded px-1 py-[1px] text-center truncate">
                          {e.shortLabel}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[7px] text-white/60 font-medium">{events.length - 2} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== SELECTED DAY DETAIL ==================== */}
      {selectedDay && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e33b5f] flex flex-col items-center justify-center text-white shadow-lg shadow-emerald-200">
              <span className="text-[11px] font-medium leading-none">{monthNames[currentMonth].slice(0, 3).toUpperCase()}</span>
              <span className="text-xl font-bold leading-none mt-0.5">{selectedDay}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#222]">{selectedDayName}</h3>
              <p className="text-sm text-[#9e9e9e]">{monthNames[currentMonth]} {selectedDay}, {currentYear}</p>
            </div>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="text-center py-8 bg-[#fbfbfb] rounded-2xl">
              <CalendarIcon className="w-10 h-10 text-[#d0d0d0] mx-auto mb-2" />
              <p className="text-sm text-[#9e9e9e]">No events scheduled</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map(e => {
                const colors = typeColors[e.type] || typeColors.meeting;
                const Icon = e.type === 'meeting' ? Video : e.type === 'newsletter' ? Mail : e.type === 'expiry' ? AlertTriangle : Clock;
                return (
                  <div key={e.id} className={`flex items-start gap-3 p-4 ${colors.light} rounded-2xl border border-transparent hover:border-[#f0f0f0] transition-colors`}>
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[#222] text-sm">{e.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#7e7e7e]">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{e.time}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#9e9e9e] bg-white px-2 py-0.5 rounded-full border border-[#f0f0f0]">
                          <Mail className="w-2.5 h-2.5" /> Email reminder
                        </span>
                        {(e.type === 'deadline' || e.type === 'expiry') && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-[#e33b5f] bg-white px-2 py-0.5 rounded-full border border-[#f0f0f0]">
                            <Phone className="w-2.5 h-2.5" /> WhatsApp
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== MEETING VOTING ==================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
            <Vote className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#222]">Meeting Voting</h2>
            <p className="text-xs text-[#9e9e9e]">Vote on meeting times with partners & shareholders</p>
          </div>
        </div>

        <div className="space-y-3">
          {meetingVotes.map(vote => {
            const maxVotes = Math.max(...vote.proposedDates.map(s => s.votes));
            return (
              <div key={vote.id} className={`rounded-2xl border overflow-hidden transition-all
                ${vote.status === 'confirmed' ? 'border-emerald-200 bg-[#e33b5f]/5/30' : 'border-[#f0f0f0] bg-white'}
              `}>
                {/* Vote header */}
                <div className="px-5 py-4 border-b border-[#f0f0f0]/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#222]">{vote.title}</h3>
                        {vote.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#e33b5f]/10 text-[#c02d4f] text-[10px] font-semibold">
                            <Check className="w-3 h-3" /> Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-semibold animate-pulse">
                            <Vote className="w-3 h-3" /> Voting
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9e9e9e] mt-0.5">by {vote.initiatedBy} &bull; {vote.participants.length} participants</p>
                    </div>
                    {vote.status === 'voting' && (role === 'partner' || role === 'shareholder' || role === 'super-admin' || role === 'admin') && (
                      <Button size="sm" className="bg-[#e33b5f] hover:bg-[#c02d4f] rounded-xl text-xs h-8" onClick={() => confirmMeeting(vote.id)}>
                        <Check className="w-3 h-3 mr-1" /> Confirm
                      </Button>
                    )}
                  </div>

                  {vote.status === 'confirmed' && vote.confirmedDate && (
                    <div className="mt-3 flex items-center gap-3 p-3 bg-[#e33b5f]/10 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-[#e33b5f] flex items-center justify-center">
                        <CalendarIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#c02d4f]">Meeting Confirmed</p>
                        <p className="text-xs text-[#e33b5f]">{vote.confirmedDate} at {vote.confirmedTime}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vote options */}
                <div className="p-4 space-y-2">
                  {vote.proposedDates.map((slot, idx) => {
                    const totalVoters = vote.participants.length;
                    const percentage = totalVoters > 0 ? Math.round((slot.votes / totalVoters) * 100) : 0;
                    const hasVoted = userVotedSlots[vote.id] === idx;
                    const isTop = slot.votes === maxVotes && slot.votes > 0;

                    return (
                      <div key={idx} className={`relative rounded-xl border p-3 transition-all
                        ${hasVoted ? 'border-[#e33b5f]/50 bg-[#e33b5f]/5/50' : isTop && vote.status === 'voting' ? 'border-sky-200 bg-sky-50/30' : 'border-[#f0f0f0] hover:border-[#f0f0f0]'}
                      `}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => vote.status === 'voting' && handleVote(vote.id, idx)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                ${hasVoted ? 'border-emerald-500 bg-[#e33b5f]/50 shadow-sm' : 'border-stone-300 hover:border-emerald-400'}
                              `}>
                              {hasVoted && <Check className="w-3.5 h-3.5 text-white" />}
                            </button>
                            <div>
                              <p className="text-sm font-semibold text-[#333]">{slot.date}</p>
                              <p className="text-xs text-[#9e9e9e]">{slot.time}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isTop && vote.status === 'voting' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-semibold">
                                <Sparkles className="w-2.5 h-2.5" /> Leading
                              </span>
                            )}
                            <span className="text-xs font-bold text-[#7e7e7e]">{percentage}%</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 bg-[#f6f6f6] rounded-full overflow-hidden mb-2">
                          <div className={`h-full rounded-full transition-all duration-700 ${hasVoted ? 'bg-[#e33b5f]/50' : isTop ? 'bg-[#e33b5f]/50' : 'bg-[#d0d0d0]'}`} style={{ width: `${percentage}%` }} />
                        </div>

                        {/* Voters avatars */}
                        <div className="flex items-center justify-between">
                          <div className="flex -space-x-1">
                            {slot.voters.slice(0, 5).map((voter, vi) => (
                              <div key={vi} className="w-5 h-5 rounded-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center text-[8px] font-bold text-[#555353] border-2 border-white">
                                {voter.charAt(0)}
                              </div>
                            ))}
                            {slot.voters.length > 5 && (
                              <div className="w-5 h-5 rounded-full bg-[#f6f6f6] flex items-center justify-center text-[8px] font-medium text-[#7e7e7e] border-2 border-white">
                                +{slot.voters.length - 5}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-[#9e9e9e]">{slot.votes}/{totalVoters} votes</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== DOCUMENT EXPIRY ALERTS ==================== */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#222]">Document Expiry Alerts</h2>
            <p className="text-xs text-[#9e9e9e]">Auto-tracked & added to calendar</p>
          </div>
        </div>

        <div className="space-y-2">
          {calendarEvents.filter(e => e.type === 'expiry').map(e => (
            <div key={e.id} className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100/70 rounded-2xl transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#222]">{e.title}</p>
                  <p className="text-xs text-[#7e7e7e]">{e.date} &bull; Auto-reminder set</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 rounded-xl text-xs h-8">Renew Now</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
