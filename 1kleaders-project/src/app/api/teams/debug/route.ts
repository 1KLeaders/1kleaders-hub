// GET /api/teams/debug
// Temporary debug endpoint — remove after fixing Teams sync
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
  if (!user) return NextResponse.json({ error: 'Not logged in' });

  // Check stored token
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at, connected, user_id, email, display_name')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: 'No Teams connection found in DB' });

  const expired = conn.expires_at && new Date(conn.expires_at) < new Date();

  // Try a simple Graph API call to check token validity
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { 'Authorization': `Bearer ${conn.access_token}` }
  });
  const meData = await meRes.json();

  // Try calendar view
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
      token_preview: conn.access_token?.slice(0, 20) + '...',
    },
    graph_me: {
      status:        meRes.status,
      displayName:   meData.displayName,
      mail:          meData.mail,
      error:         meData.error,
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
