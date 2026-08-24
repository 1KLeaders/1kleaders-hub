// GET /api/teams/sync-calendar
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getValidTeamsToken } from '@/lib/teams-token';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const tokenData = await getValidTeamsToken();
  if (!tokenData) {
    return NextResponse.json({ error: 'Teams not connected or token could not be refreshed. Click Connect Teams.', expired: true }, { status: 401 });
  }

  // Also check if Graph API returns 401 (token invalid even if not expired in DB)
  // This is handled by the event loop below which returns errors per event

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
    // Return 401 so the client knows to re-auth
    const status = eventsRes.status === 401 ? 401 : 500;
    return NextResponse.json({
      error: eventsRes.status === 401 ? 'Teams token expired' : `Teams API error (${eventsRes.status}): ${errMsg}`,
      expired: eventsRes.status === 401,
      details: eventsBody,
    }, { status });
  }

  const events = eventsBody.value ?? [];
  let synced = 0;
  const errors: string[] = [];

  // Get a valid user_id to use as created_by — use the teams connection owner or first admin
  const { data: adminProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'super-admin', 'developer'])
    .limit(1)
    .maybeSingle();
  const createdBy = adminProfile?.id ?? null;

  for (const event of events) {
    // Parse date directly from the string to avoid UTC timezone shifting
    // Teams returns dates like "2026-08-09T13:00:00.0000000" (local time, no Z)
    const dateTimeStr = event.start?.dateTime ?? event.start?.date ?? '';
    const date = dateTimeStr.slice(0, 10); // "2026-08-09"
    const timePart = dateTimeStr.slice(11, 16); // "13:00"
    const time = timePart || 'All Day';
    const joinUrl  = event.onlineMeeting?.joinUrl ?? null;
    const location = event.location?.displayName || (joinUrl ? 'Microsoft Teams' : 'TBD');

    const { error: upsertErr } = await supabaseAdmin.from('calendar_events').upsert({
      title:          event.subject ?? 'Teams Meeting',
      date,
      time,
      type:           'meeting',
      location,
      description:    [event.bodyPreview?.slice(0, 200), joinUrl ? `Teams link: ${joinUrl}` : null].filter(Boolean).join('\n') || null,
      created_by:     createdBy,
      teams_event_id: event.id,
      teams_join_url: joinUrl,
    }, { onConflict: 'teams_event_id', ignoreDuplicates: false });

    if (upsertErr) {
      console.error('Event upsert error:', upsertErr);
      errors.push(`${event.subject}: ${upsertErr.message}`);
    } else {
      synced++;
    }
  }

  return NextResponse.json({
    synced,
    total: events.length,
    errors,
    sample_events: events.slice(0, 3).map((e: any) => ({
      subject: e.subject,
      start: e.start?.dateTime,
      id: e.id?.slice(0, 20) + '...',
    })),
    token_user: tokenData.user_id,
  });
}
