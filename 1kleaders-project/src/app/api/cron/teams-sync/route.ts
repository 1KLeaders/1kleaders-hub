// GET /api/cron/teams-sync
// Called automatically by Vercel Cron — syncs Teams calendar every hour
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron (not a random request)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get token directly
    const { data: conn } = await supabaseAdmin
      .from('teams_connections')
      .select('access_token, refresh_token, expires_at, ms_user_id')
      .eq('connected', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!conn?.access_token) {
      return NextResponse.json({ error: 'No Teams connection' });
    }

    // Refresh token if needed
    let accessToken = conn.access_token;
    const expiresAt = conn.expires_at ? new Date(conn.expires_at) : null;
    const tenMins = new Date(Date.now() + 10 * 60 * 1000);

    if (expiresAt && expiresAt < tenMins && conn.refresh_token) {
      const refreshRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'refresh_token',
          refresh_token: conn.refresh_token,
          client_id:     process.env.TEAMS_CLIENT_ID!,
          client_secret: process.env.TEAMS_CLIENT_SECRET!,
          scope:         'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite offline_access',
        }),
      });
      const refreshData = await refreshRes.json();
      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        await supabaseAdmin.from('teams_connections').update({
          access_token:  refreshData.access_token,
          refresh_token: refreshData.refresh_token ?? conn.refresh_token,
          expires_at:    new Date(Date.now() + (refreshData.expires_in ?? 3600) * 1000).toISOString(),
        }).eq('ms_user_id', conn.ms_user_id);
      }
    }

    // Fetch calendar events
    const now   = new Date();
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const end   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const eventsRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}&$select=id,subject,start,end,location,bodyPreview,isOnlineMeeting,onlineMeeting&$top=200`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const eventsBody = await eventsRes.json();
    if (!eventsRes.ok) return NextResponse.json({ error: `Graph error: ${eventsBody?.error?.message}` });

    const events = eventsBody.value ?? [];
    let synced = 0;

    const { data: admin } = await supabaseAdmin
      .from('profiles').select('id').in('role', ['admin', 'super-admin', 'developer']).limit(1).maybeSingle();

    for (const event of events) {
      const dateTimeStr = event.start?.dateTime ?? event.start?.date ?? '';
      const date = dateTimeStr.slice(0, 10);
      const time = dateTimeStr.slice(11, 16) || 'All Day';
      const joinUrl = event.onlineMeeting?.joinUrl ?? null;

      const { error } = await supabaseAdmin.from('calendar_events').upsert({
        title:          event.subject ?? 'Teams Meeting',
        date, time, type: 'meeting',
        location:       event.location?.displayName || (joinUrl ? 'Microsoft Teams' : 'TBD'),
        description:    event.bodyPreview?.slice(0, 200) || null,
        created_by:     admin?.id ?? null,
        teams_event_id: event.id,
        teams_join_url: joinUrl,
      }, { onConflict: 'teams_event_id', ignoreDuplicates: false });

      if (!error) synced++;
    }

    console.log(`[Teams Cron] Synced ${synced}/${events.length} events`);
    return NextResponse.json({ synced, total: events.length, timestamp: new Date().toISOString() });

  } catch (err: any) {
    console.error('[Teams Cron] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
