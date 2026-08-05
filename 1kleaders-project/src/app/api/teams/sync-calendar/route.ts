// GET /api/teams/sync-calendar
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Cookie: req.headers.get('cookie') ?? '' } } }
  );
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn?.access_token) {
    return NextResponse.json({ error: 'Teams not connected. Go to Calendar and click Connect Teams.' }, { status: 503 });
  }

  if (conn.expires_at && new Date(conn.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Teams token expired — please reconnect Teams from the Calendar page.' }, { status: 401 });
  }

  const now = new Date();
  // Pull 90 days back and 30 days forward
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const end   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const eventsRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$select=id,subject,start,end,location,bodyPreview,isOnlineMeeting,onlineMeeting&$top=200`,
    { headers: { 'Authorization': `Bearer ${conn.access_token}` } }
  );

  const eventsBody = await eventsRes.json();

  if (!eventsRes.ok) {
    const errMsg = eventsBody?.error?.message ?? eventsBody?.error?.code ?? JSON.stringify(eventsBody);
    console.error('Teams calendar sync failed:', eventsRes.status, errMsg);
    return NextResponse.json({
      error: `Teams API error (${eventsRes.status}): ${errMsg}`,
      details: eventsBody,
    }, { status: 500 });
  }

  const events = eventsBody.value ?? [];
  let synced = 0;

  for (const event of events) {
    const startDT  = new Date(event.start?.dateTime ?? event.start?.date);
    const date     = startDT.toISOString().slice(0, 10);
    const time     = startDT.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const joinUrl  = event.onlineMeeting?.joinUrl ?? null;
    const location = event.location?.displayName || (joinUrl ? 'Microsoft Teams' : 'TBD');

    await supabaseAdmin.from('calendar_events').upsert({
      title:          event.subject ?? 'Teams Meeting',
      date,
      time,
      type:           'meeting',
      location,
      description:    [event.bodyPreview?.slice(0, 200), joinUrl ? `Teams link: ${joinUrl}` : null].filter(Boolean).join('\n') || null,
      created_by:     user.id,
      teams_event_id: event.id,
      teams_join_url: joinUrl,
    }, { onConflict: 'teams_event_id', ignoreDuplicates: false });
    synced++;
  }

  return NextResponse.json({ synced, total: events.length });
}
