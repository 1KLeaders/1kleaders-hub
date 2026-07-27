// GET /api/teams/sync-calendar
// Pulls meetings from the connected Teams account and syncs to calendar_events
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  // Get the Supabase user
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Cookie: req.headers.get('cookie') ?? '' } } }
  );
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get stored Teams token
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at')
    .eq('user_id', user.id)
    .eq('connected', true)
    .maybeSingle();

  if (!conn?.access_token) return NextResponse.json({ error: 'Teams not connected' }, { status: 503 });
  if (conn.expires_at && new Date(conn.expires_at) < new Date()) return NextResponse.json({ error: 'Teams token expired — reconnect Teams' }, { status: 401 });

  // Fetch events from Microsoft Graph (next 30 days)
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const eventsRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}&$select=id,subject,start,end,location,bodyPreview,isOnlineMeeting,onlineMeeting&$top=50`,
    { headers: { 'Authorization': `Bearer ${conn.access_token}` } }
  );

  if (!eventsRes.ok) {
    const err = await eventsRes.json();
    console.error('Teams calendar fetch failed:', err);
    return NextResponse.json({ error: err.error?.message ?? 'Failed to fetch Teams calendar' }, { status: 500 });
  }

  const { value: events } = await eventsRes.json();
  let synced = 0;

  for (const event of events ?? []) {
    const startDT = new Date(event.start?.dateTime ?? event.start?.date);
    const date = startDT.toISOString().slice(0, 10);
    const time = startDT.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const joinUrl = event.onlineMeeting?.joinUrl ?? null;
    const location = event.location?.displayName || (joinUrl ? 'Microsoft Teams' : null);

    // Upsert by teams_event_id to avoid duplicates
    await supabaseAdmin.from('calendar_events').upsert({
      title:          event.subject ?? 'Teams Meeting',
      date,
      time,
      type:           'meeting',
      location,
      description:    [event.bodyPreview, joinUrl ? `Teams link: ${joinUrl}` : null].filter(Boolean).join('\n') || null,
      created_by:     user.id,
      teams_event_id: event.id,
    }, { onConflict: 'teams_event_id', ignoreDuplicates: false });
    synced++;
  }

  return NextResponse.json({ synced, total: events?.length ?? 0 });
}
