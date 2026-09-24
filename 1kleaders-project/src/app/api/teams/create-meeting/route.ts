// POST /api/teams/create-meeting
import { NextRequest, NextResponse } from 'next/server';
import { getValidTeamsToken } from '@/lib/teams-token';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { title, start_datetime, end_datetime, description, invitee_emails = [] } = await req.json();

  if (!title || !start_datetime) {
    return NextResponse.json({ error: 'title and start_datetime required' }, { status: 400 });
  }

  // Get valid token with auto-refresh
  const tokenData = await getValidTeamsToken();
  if (!tokenData) {
    return NextResponse.json({ error: 'Teams not connected or token expired — reconnect from the Calendar page.' }, { status: 503 });
  }

  const endTime = end_datetime ?? new Date(new Date(start_datetime).getTime() + 60 * 60 * 1000).toISOString();

  // Create online meeting
  const meetingRes = await fetch('https://graph.microsoft.com/v1.0/me/onlineMeetings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
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
    return NextResponse.json({ error: `Teams error (${meetingRes.status}): ${errMsg}` }, { status: 500 });
  }

  const joinUrl  = meetingData.joinWebUrl;
  const meetingId = meetingData.id;

  // Send calendar invites to attendees if provided
  if (invitee_emails.length > 0) {
    const attendees = invitee_emails.map((email: string) => ({
      emailAddress: { address: email },
      type: 'required',
    }));

    await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject:   title,
        body:      { contentType: 'HTML', content: `${description ?? ''}<br/><br/>Teams link: <a href="${joinUrl}">${joinUrl}</a>` },
        start:     { dateTime: start_datetime, timeZone: 'UTC' },
        end:       { dateTime: endTime,        timeZone: 'UTC' },
        attendees,
        isOnlineMeeting:        true,
        onlineMeetingProvider:  'teamsForBusiness',
      }),
    });
  }

  return NextResponse.json({ success: true, join_url: joinUrl, meeting_id: meetingId });
}
