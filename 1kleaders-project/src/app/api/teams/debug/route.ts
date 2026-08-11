// GET /api/teams/debug
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  // Check stored Teams connection
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at, connected, user_id, email, display_name, created_at, ms_user_id')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: 'No Teams connection found' });

  const expired = conn.expires_at && new Date(conn.expires_at) < new Date();

  // Check recent calendar events in DB
  const { data: events } = await supabaseAdmin
    .from('calendar_events')
    .select('id, title, date, time, teams_event_id, teams_join_url, description')
    .order('date', { ascending: false })
    .limit(10);

  // Test Graph API
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { 'Authorization': `Bearer ${conn.access_token}` }
  });
  const meData = await meRes.json();

  return NextResponse.json({
    connection: {
      email: conn.email,
      display_name: conn.display_name,
      expires_at: conn.expires_at,
      expired,
    },
    graph_me: {
      status: meRes.status,
      displayName: meData.displayName,
      error: meData.error,
    },
    recent_calendar_events: (events ?? []).map(e => ({
      title:          e.title,
      date:           e.date,
      time:           e.time,
      has_join_url:   !!e.teams_join_url,
      has_event_id:   !!e.teams_event_id,
      join_url_preview: e.teams_join_url?.slice(0, 60),
      desc_has_link:  e.description?.includes('Teams link:'),
    })),
  });
}
