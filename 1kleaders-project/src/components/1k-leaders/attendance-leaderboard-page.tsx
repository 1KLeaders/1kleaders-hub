'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trophy, RefreshCw, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type LeaderEntry = { name: string; email: string; minutes: number; meetings: number };

// Known AI note-taking agent patterns to filter out
const AI_AGENT_PATTERNS = [
  /otter\.ai/i, /fireflies/i, /fathom/i, /gong/i, /chorus/i,
  /notetaker/i, /bot@/i, /recorder@/i, /transcrib/i, /\bai\b.*assistant/i,
  /meeting.*assistant/i, /virtual.*assistant/i, /copilot/i,
];

function isAIAgent(name: string, email: string): boolean {
  const combined = `${name} ${email}`.toLowerCase();
  return AI_AGENT_PATTERNS.some(p => p.test(combined));
}

export default function AttendanceLeaderboardPage() {
  const [leaderboard, setLeaderboard]   = useState<LeaderEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [totalMeetings, setTotalMeetings] = useState(0);

  async function buildLeaderboard() {
    setLoading(true);

    // Get all past Teams meetings
    const { data: events } = await supabase
      .from('calendar_events')
      .select('id, title, date, time, teams_event_id')
      .eq('type', 'meeting')
      .not('teams_event_id', 'is', null)
      .order('date', { ascending: false });

    const pastMeetings = (events ?? []).filter(e => {
      const [ey, em, ed] = e.date.split('-').map(Number);
      const timeParts = (e.time || '').match(/(\d+):(\d+)/);
      const dt = timeParts
        ? new Date(ey, em - 1, ed, parseInt(timeParts[1]), parseInt(timeParts[2]))
        : new Date(ey, em - 1, ed);
      return dt < new Date();
    });

    setTotalMeetings(pastMeetings.length);

    const totals: Record<string, LeaderEntry> = {};

    for (const e of pastMeetings) {
      try {
        const res = await fetch('/api/teams/attendance?meetingId=' + encodeURIComponent(e.teams_event_id));
        const data = await res.json();
        if (!data.attendees?.length) continue;

        for (const a of data.attendees) {
          if (isAIAgent(a.name, a.email)) continue; // Skip AI agents
          const key = a.email || a.name;
          if (!totals[key]) totals[key] = { name: a.name, email: a.email, minutes: 0, meetings: 0 };
          totals[key].minutes  += Math.round((a.duration ?? 0) / 60);
          totals[key].meetings += 1;
        }
      } catch { /* skip failed */ }
    }

    const board = Object.values(totals)
      .filter(p => p.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    setLeaderboard(board);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => { buildLeaderboard(); }, []);

  const medalColors = ['text-amber-400', 'text-stone-400', 'text-orange-500'];
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />Attendance Leaderboard
          </h1>
          <p className="text-[#7e7e7e] mt-1">
            Ranked by total minutes attended across {totalMeetings} meeting{totalMeetings !== 1 ? 's' : ''}
          </p>
          {lastUpdated && (
            <p className="text-xs text-[#9e9e9e] mt-0.5">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={buildLeaderboard} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-[#f0f0f0]">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#9e9e9e]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-sm">Fetching attendance from {totalMeetings} meetings...</p>
              <p className="text-xs">This may take a moment</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-[#9e9e9e]" />
              <p className="text-sm text-[#9e9e9e]">No attendance data yet</p>
            </div>
          ) : (
            leaderboard.map((p, i) => (
              <div key={p.email || p.name}
                className={`flex items-center gap-4 px-5 py-4 ${i < leaderboard.length - 1 ? 'border-b border-[#f0f0f0]' : ''} ${i < 3 ? 'bg-gradient-to-r from-amber-50/50 to-transparent' : ''}`}>
                {/* Rank */}
                <div className="w-10 text-center flex-shrink-0">
                  {i < 3
                    ? <span className="text-2xl">{medals[i]}</span>
                    : <span className="text-sm font-bold text-[#9e9e9e]">{i + 1}</span>
                  }
                </div>
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-stone-400' : i === 2 ? 'bg-orange-400' : 'bg-[#e33b5f]/20'}`}>
                  <span className={i >= 3 ? 'text-[#e33b5f]' : ''}>{p.name[0]?.toUpperCase()}</span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#222] truncate">{p.name}</p>
                  <p className="text-xs text-[#9e9e9e] truncate">{p.email}</p>
                </div>
                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-black ${i < 3 ? medalColors[i] : 'text-[#e33b5f]'}`}>
                    {p.minutes} <span className="text-xs font-normal text-[#9e9e9e]">min</span>
                  </p>
                  <p className="text-xs text-[#9e9e9e]">{p.meetings} meeting{p.meetings !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
