import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

async function getAppToken(): Promise<string | null> {
  const tenantId = process.env.TEAMS_TENANT_ID;
  const clientId = process.env.TEAMS_CLIENT_ID;
  const clientSecret = process.env.TEAMS_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) return null;

  // Use 'common' won't work for app-only — need actual tenant ID
  // Get tenant ID from the stored connection
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('tenant_id')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const tid = conn?.tenant_id && conn.tenant_id !== 'common' ? conn.tenant_id : tenantId;
  if (!tid || tid === 'common') return null;

  const res = await fetch(`https://login.microsoftonline.com/${tid}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
      scope:         'https://graph.microsoft.com/.default',
    }),
  });

  const data = await res.json();
  return data.access_token ?? null;
}

export async function GET(req: NextRequest) {
  const calendarEventId = new URL(req.url).searchParams.get('meetingId');
  if (!calendarEventId) return NextResponse.json({ error: 'meetingId required' }, { status: 400 });

  // Get delegated token for steps 1 & 2 (calendar event + join URL)
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at, email')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn?.access_token) return NextResponse.json({ attendees: [], message: 'Teams not connected.' });

  const delegatedH = { 'Authorization': `Bearer ${conn.access_token}` };

  // Step 1: get join URL from calendar event (delegated)
  const evRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${calendarEventId}?$select=onlineMeeting,isOnlineMeeting,subject`,
    { headers: delegatedH }
  );
  const evData = await evRes.json();
  if (!evRes.ok) return NextResponse.json({ attendees: [], message: `Could not fetch event (${evRes.status}): ${evData.error?.message}` });

  const joinUrl = evData.onlineMeeting?.joinUrl;
  if (!joinUrl) return NextResponse.json({ attendees: [], message: 'This event has no Teams meeting link.' });

  // Step 2: find online meeting ID (delegated)
  const omRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=JoinWebUrl eq '${joinUrl}'`,
    { headers: delegatedH }
  );
  const omData = await omRes.json();
  if (!omRes.ok) return NextResponse.json({ attendees: [], message: `Could not find meeting (${omRes.status}): ${omData.error?.message}` });
  if (!omData.value?.length) return NextResponse.json({ attendees: [], message: 'No Teams meeting found for this event.' });

  const omId = omData.value[0].id;

  // Steps 3 & 4: use app-only token for attendance (requires OnlineMeetings.Read.All application permission)
  const appToken = await getAppToken();
  if (!appToken) {
    return NextResponse.json({ attendees: [], message: 'Could not obtain app token — check TEAMS_TENANT_ID in Vercel env vars.' });
  }

  const appH = { 'Authorization': `Bearer ${appToken}` };

  // Need user ID for app-only calls to onlineMeetings
  // Get the organizer's user ID via delegated token
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=id', { headers: delegatedH });
  const meData = await meRes.json();
  const userId = meData.id;
  if (!userId) return NextResponse.json({ attendees: [], message: 'Could not get user ID.' });

  // Step 3: get attendance reports (app-only)
  const repRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings/${omId}/attendanceReports`,
    { headers: appH }
  );
  const repData = await repRes.json();
  if (!repRes.ok) return NextResponse.json({ attendees: [], message: `Attendance reports failed (${repRes.status}): ${repData.error?.message}`, debug: repData.error });
  if (!repData.value?.length) return NextResponse.json({ attendees: [], message: 'No attendance report yet — check back 5–10 min after the meeting ends.' });

  // Step 4: get records (app-only)
  const recRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings/${omId}/attendanceReports/${repData.value[0].id}/attendanceRecords`,
    { headers: appH }
  );
  const recData = await recRes.json();
  if (!recRes.ok) return NextResponse.json({ attendees: [], message: `Attendance records failed (${recRes.status}): ${recData.error?.message}` });

  const attendees = (recData.value ?? []).map((a: any) => ({
    name:      a.identity?.displayName ?? 'Unknown',
    email:     a.emailAddress ?? '',
    joinTime:  a.attendanceIntervals?.[0]?.joinDateTime ?? null,
    leaveTime: a.attendanceIntervals?.[0]?.leaveDateTime ?? null,
    duration:  a.totalAttendanceInSeconds ?? 0,
    role:      a.role ?? '',
  }));

  return NextResponse.json({
    meetingId:         calendarEventId,
    totalParticipants: repData.value[0].totalParticipantCount ?? attendees.length,
    attendees,
  });
}
