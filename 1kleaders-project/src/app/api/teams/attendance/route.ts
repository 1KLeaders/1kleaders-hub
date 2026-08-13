import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const calendarEventId = new URL(req.url).searchParams.get('meetingId');
  if (!calendarEventId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 });

  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn?.access_token) return NextResponse.json({ attendees: [], message: 'Teams not connected.' });
  if (conn.expires_at && new Date(conn.expires_at) < new Date()) {
    return NextResponse.json({ attendees: [], message: 'Token expired — click Connect Teams.' });
  }

  const h = { 'Authorization': `Bearer ${conn.access_token}` };

  // Step 1: get event
  const evRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${calendarEventId}?$select=onlineMeeting,isOnlineMeeting,subject`,
    { headers: h }
  );
  const evData = await evRes.json();
  if (!evRes.ok) return NextResponse.json({ attendees: [], message: `Step 1 failed (${evRes.status}): ${evData.error?.message}`, debug: evData });

  const joinUrl = evData.onlineMeeting?.joinUrl;
  if (!joinUrl) return NextResponse.json({ attendees: [], message: `No joinUrl on event. isOnlineMeeting=${evData.isOnlineMeeting}`, debug: evData });

  // Step 2: find online meeting
  const omRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=JoinWebUrl eq '${joinUrl}'`,
    { headers: h }
  );
  const omData = await omRes.json();
  if (!omRes.ok) return NextResponse.json({ attendees: [], message: `Step 2 failed (${omRes.status}): ${omData.error?.message}`, debug: omData });
  if (!omData.value?.length) return NextResponse.json({ attendees: [], message: 'No online meeting found for this event.', joinUrl });

  const omId = omData.value[0].id;

  // Step 3: get attendance reports
  const repRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${omId}/attendanceReports`,
    { headers: h }
  );
  const repData = await repRes.json();
  if (!repRes.ok) return NextResponse.json({ attendees: [], message: `Step 3 failed (${repRes.status}): ${repData.error?.message}`, debug: repData });
  if (!repData.value?.length) return NextResponse.json({ attendees: [], message: 'No attendance reports yet — check back 5-10 min after meeting ends.' });

  // Step 4: get records
  const recRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings/${omId}/attendanceReports/${repData.value[0].id}/attendanceRecords`,
    { headers: h }
  );
  const recData = await recRes.json();
  if (!recRes.ok) return NextResponse.json({ attendees: [], message: `Step 4 failed (${recRes.status}): ${recData.error?.message}`, debug: recData });

  const attendees = (recData.value ?? []).map((a: any) => ({
    name:      a.identity?.displayName ?? 'Unknown',
    email:     a.emailAddress ?? '',
    joinTime:  a.attendanceIntervals?.[0]?.joinDateTime ?? null,
    leaveTime: a.attendanceIntervals?.[0]?.leaveDateTime ?? null,
    duration:  a.totalAttendanceInSeconds ?? 0,
    role:      a.role ?? '',
  }));

  return NextResponse.json({
    meetingId: calendarEventId,
    totalParticipants: repData.value[0].totalParticipantCount ?? attendees.length,
    attendees,
  });
}
