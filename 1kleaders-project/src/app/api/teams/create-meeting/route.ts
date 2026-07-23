// POST /api/teams/create-meeting
// Creates a Teams online meeting for a calendar event
// Body: { title, start_datetime, end_datetime, description? }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { title, start_datetime, end_datetime, description } = await req.json();

  if (!title || !start_datetime) {
    return NextResponse.json({ error: 'title and start_datetime required' }, { status: 400 });
  }

  // Get the stored Teams access token (use the first admin connection found)
  const { data: connection } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, expires_at, user_id')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection?.access_token) {
    return NextResponse.json({ error: 'Teams not connected — connect Teams first via the Calendar page' }, { status: 503 });
  }

  // Check if token is expired
  if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Teams token expired — reconnect Teams via the Calendar page' }, { status: 401 });
  }

  // Create online meeting via Microsoft Graph
  const endTime = end_datetime ?? new Date(new Date(start_datetime).getTime() + 60 * 60 * 1000).toISOString();

  const meetingRes = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      subject:   title,
      startDateTime: start_datetime,
      endDateTime:   endTime,
      ...(description ? { description: { content: description, contentType: 'text' } } : {}),
    }),
  });

  const meetingData = await meetingRes.json();

  if (!meetingRes.ok) {
    console.error('Teams meeting creation failed:', meetingData);
    return NextResponse.json({ error: meetingData.error?.message ?? 'Failed to create Teams meeting' }, { status: 500 });
  }

  return NextResponse.json({
    success:      true,
    join_url:     meetingData.joinWebUrl,
    meeting_id:   meetingData.id,
  });
}
