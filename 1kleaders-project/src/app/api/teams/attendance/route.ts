// GET /api/teams/attendance?meetingId=xxx
// meetingId = teams_event_id (calendar event ID from Graph API)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const calendarEventId = new URL(req.url).searchParams.get('meetingId');
  if (!calendarEventId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 });

  // Get stored token via admin client (no session needed)
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn?.access_token) {
    return NextResponse.json({ attendees: [], message: 'Teams not connected.' }, { status: 503 });
  }
  if (conn.expires_at && new Date(conn.expires_at) < new Date()) {
    return NextResponse.json({ attendees: [], message: 'Teams token expired — click Sync Teams to reconnect.', expired: true }, { status: 401 });
  }

  const h = { 'Authorization': `Bearer ${conn.access_token}` };

  // Step 1: get join URL from the calendar event
  const evRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${calendarEventId}?$select=onlineMeeting,isOnlineMeeting,subject`,
    { headers: h }
  );
  if (!evRes.ok) {
    const err = await evRes.json();
    return NextResponse.json({ attendees: [], message: `Could not fetch event: ${err.error?.message ?? evRes.status}` });
  }
  const evData = await evRes.json();
  const joinUrl = evData.onlineMeeting?.joinUrl;
  if (!joinUrl) {
    return NextResponse.json({ attendees: [], message: 'This event has no Teams meeting — attendance not available.' });
  }

  // Step 2: look up online meeting by joinUrl
  const omRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=JoinWebUrl eq '${joinUrl}'`,
    { headers: h }
  );
  if (!omRes.ok) {
    const err = await omRes.json();
    return NextResponse.json({ attendees: [], message: `Could not find meeting: ${err.error?.message ?? omRes.status}` });
  }
  const { value: meetings } = await omRes.json();
  if (!meetings?.length) {
    return NextResponse.json({ attendees: [], message: 'No Teams meeting record found for this event.' });
  }
  const omId = meetings[0].id;

  // Step 3: get attendance reports
  const repRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${omId}/attendanceReports`,
    { headers: h }
  );
  if (!repRes.ok) {
    const err = await repRes.json();
    return NextResponse.json({ attendees: [], message: `Attendance unavailable: ${err.error?.message ?? repRes.status}` });
  }
  const { value: reports } = await repRes.json();
  if (!reports?.length) {
    return NextResponse.json({ attendees: [], message: 'No attendance report yet — check back 5–10 min after the meeting ends.' });
  }

  // Step 4: get attendance records
  const recRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${omId}/attendanceReports/${reports[0].id}/attendanceRecords`,
    { headers: h }
  );
  const { value: records } = await recRes.json();

  const attendees = (records ?? []).map((a: any) => ({
    name:      a.identity?.displayName ?? 'Unknown',
    email:     a.emailAddress ?? '',
    joinTime:  a.attendanceIntervals?.[0]?.joinDateTime  ?? null,
    leaveTime: a.attendanceIntervals?.[0]?.leaveDateTime ?? null,
    duration:  a.totalAttendanceInSeconds ?? 0,
    role:      a.role ?? '',
  }));

  return NextResponse.json({
    meetingId:         calendarEventId,
    totalParticipants: reports[0].totalParticipantCount ?? attendees.length,
    attendees,
  });
}
