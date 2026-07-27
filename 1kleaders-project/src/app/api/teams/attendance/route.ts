// GET /api/teams/attendance?meetingId=xxx
// Fetches attendance report for a Teams meeting
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const meetingId = new URL(req.url).searchParams.get('meetingId');
  if (!meetingId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 });

  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Cookie: req.headers.get('cookie') ?? '' } } }
  );
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('connected', true)
    .maybeSingle();

  if (!conn?.access_token) return NextResponse.json({ error: 'Teams not connected' }, { status: 503 });

  // Get attendance reports
  const reportsRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/attendanceReports`,
    { headers: { 'Authorization': `Bearer ${conn.access_token}` } }
  );

  if (!reportsRes.ok) {
    const err = await reportsRes.json();
    return NextResponse.json({ error: err.error?.message ?? 'Failed to fetch attendance' }, { status: 500 });
  }

  const { value: reports } = await reportsRes.json();
  if (!reports?.length) return NextResponse.json({ attendees: [], message: 'No attendance report available yet' });

  // Get the latest report's attendees
  const latestReport = reports[0];
  const attendeesRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${meetingId}/attendanceReports/${latestReport.id}/attendanceRecords`,
    { headers: { 'Authorization': `Bearer ${conn.access_token}` } }
  );

  const { value: attendees } = await attendeesRes.json();

  return NextResponse.json({
    meetingId,
    reportId: latestReport.id,
    totalParticipants: latestReport.totalParticipantCount,
    attendees: (attendees ?? []).map((a: any) => ({
      name:       a.identity?.displayName ?? 'Unknown',
      email:      a.emailAddress ?? '',
      joinTime:   a.attendanceIntervals?.[0]?.joinDateTime,
      leaveTime:  a.attendanceIntervals?.[0]?.leaveDateTime,
      duration:   a.totalAttendanceInSeconds,
      role:       a.role,
    })),
  });
}
