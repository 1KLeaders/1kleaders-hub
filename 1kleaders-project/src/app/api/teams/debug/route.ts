// GET /api/teams/debug
// Temporary debug endpoint — no auth check, just checks DB connection
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  // Get most recent Teams connection regardless of user
  // Check ALL rows regardless of connected flag
  const { data: allRows } = await supabaseAdmin
    .from('teams_connections')
    .select('user_id, email, display_name, connected, expires_at, created_at, ms_user_id')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: conn, error: connErr } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at, connected, user_id, email, display_name, created_at, ms_user_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!conn) {
    return NextResponse.json({ 
      error: 'No Teams connection found in DB at all',
      all_rows: allRows ?? [],
      row_count: allRows?.length ?? 0,
    });
  }



  const expired = conn.expires_at && new Date(conn.expires_at) < new Date();

  // Test Graph API
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { 'Authorization': `Bearer ${conn.access_token}` }
  });
  const meData = await meRes.json();

  // Test calendar
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const calRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}&$top=5`,
    { headers: { 'Authorization': `Bearer ${conn.access_token}` } }
  );
  const calData = await calRes.json();

  return NextResponse.json({
    connection: {
      user_id:      conn.user_id,
      email:        conn.email,
      display_name: conn.display_name,
      expires_at:   conn.expires_at,
      expired,
      connected_at: conn.created_at,
    },
    graph_me: {
      status:      meRes.status,
      displayName: meData.displayName,
      mail:        meData.mail,
      error:       meData.error,
    },
    calendar: {
      status:      calRes.status,
      event_count: calData.value?.length ?? 0,
      error:       calData.error,
      events:      calData.value?.map((e: any) => ({
        subject: e.subject,
        start:   e.start?.dateTime,
      })) ?? [],
    },
  });
}
