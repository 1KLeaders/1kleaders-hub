// GET /api/teams/attendance?meetingId=xxx
// meetingId = teams_event_id from calendar_events (calendar event ID)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const calendarEventId = new URL(req.url).searchParams.get('meetingId');
  if (!calendarEventId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 });

  // Use admin client to get token — no user session needed
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn?.access_token) return NextResponse.json({ error: 'Teams not connected' }, { status: 503 });
  if (conn.expires_at && new Date(conn.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Teams token expired', expired: true }, { status: 401 });
  }

  const headers = { 'Authorization': `Bearer ${conn.access_token}` };

  // Step 1: Get the calendar event to find the online meeting ID
  const eventRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${calendarEventId}?$select=subject,onlineMeeting,isOnlineMeeting`,
    { headers }
  );

  if (!eventRes.ok) {
    const err = await eventRes.json();
    return NextResponse.json({
      error: err.error?.message ?? 'Failed to fetch calendar event',
      attendees: [],
    }, { status: eventRes.status === 401 ? 401 : 500 });
  }

  const eventData = await eventRes.json();
  const joinUrl = eventData.onlineMeeting?.joinUrl;

  if (!joinUrl) {
    return NextResponse.json({ attendees: [], message: 'This event has no Teams meeting link — attendance tracking not available.' });
  }

  // Step 2: Get the online meeting by join URL
  const meetingRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=JoinWebUrl eq '${encodeURIComponent(joinUrl)}'`,
    { headers }
  );

  if (!meetingRes.ok) {
    const err = await meetingRes.json();
    return NextResponse.json({ attendees: [], message: `Could not find Teams meeting: ${err.error?.message ?? 'unknown error'}` });
  }

  const { value: meetings } = await meetingRes.json();
  if (!meetings?.length) {
    return NextResponse.json({ attendees: [], message: 'No Teams meeting found for this event.' });
  }

  const onlineMeetingId = meetings[0].id;

  // Step 3: Get attendance reports
  const reportsRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${onlineMeetingId}/attendanceReports`,
    { headers }
  );

  if (!reportsRes.ok) {
    const err = await reportsRes.json();
    return NextResponse.json({ attendees: [], message: `Attendance not available: ${err.error?.message ?? 'unknown error'}` });
  }

  const { value: reports } = await reportsRes.json();
  if (!reports?.length) {
    return NextResponse.json({ attendees: [], message: 'No attendance report yet — reports appear 5–10 minutes after the meeting ends.' });
  }

  // Step 4: Get attendees from the latest report
  const latestReport = reports[0];
  const attendeesRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${onlineMeetingId}/attendanceReports/${latestReport.id}/attendanceRecords`,
    { headers }
  );

  const { value: attendees } = await attendeesRes.json();

  return NextResponse.json({
    meetingId:         calendarEventId,
    onlineMeetingId,
    totalParticipants: latestReport.totalParticipantCount,
    attendees: (attendees ?? []).map((a: any) => ({
      name:      a.identity?.displayName ?? 'Unknown',
      email:     a.emailAddress ?? '',
      joinTime:  a.attendanceIntervals?.[0]?.joinDateTime ?? null,
      leaveTime: a.attendanceIntervals?.[0]?.leaveDateTime ?? null,
      duration:  a.totalAttendanceInSeconds ?? 0,
      role:      a.role ?? '',
    })),
  });
}
