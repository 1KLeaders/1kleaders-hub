// POST /api/teams/create-meeting
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { title, start_datetime, end_datetime, description } = await req.json();

  if (!title || !start_datetime) {
    return NextResponse.json({ error: 'title and start_datetime required' }, { status: 400 });
  }

  // Get stored token — try current user first, then any admin connection
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Cookie: req.headers.get('cookie') ?? '' } } }
  );
  const { data: { user } } = await supabaseClient.auth.getUser();

  const { data: connection } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at, user_id')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection?.access_token) {
    return NextResponse.json({ error: 'Teams not connected. Go to Calendar and click Connect Teams.' }, { status: 503 });
  }

  if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Teams token expired — please reconnect Teams from the Calendar page.' }, { status: 401 });
  }

  const endTime = end_datetime ?? new Date(new Date(start_datetime).getTime() + 60 * 60 * 1000).toISOString();

  const meetingRes = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subject:       title,
      startDateTime: start_datetime,
      endDateTime:   endTime,
      ...(description ? { description: { content: description, contentType: 'text' } } : {}),
    }),
  });

  const meetingData = await meetingRes.json();

  if (!meetingRes.ok) {
    const errMsg = meetingData?.error?.message ?? meetingData?.error?.code ?? JSON.stringify(meetingData);
    console.error('Teams meeting creation failed:', meetingRes.status, errMsg);
    return NextResponse.json({
      error: `Teams error (${meetingRes.status}): ${errMsg}`,
      details: meetingData,
    }, { status: 500 });
  }

  return NextResponse.json({
    success:    true,
    join_url:   meetingData.joinWebUrl,
    meeting_id: meetingData.id,
  });
}
