// Shared Teams → calendar_events sync (used by the "Sync Teams" button and the hourly cron).
// Stores each meeting's invitees (attendees + organizer) so members only see meetings they're
// invited to — enforced in the database by kl_can_view_event() (migration-039). Server-only.
import { supabaseAdmin } from '@/lib/supabase-server';
import { getValidTeamsToken } from '@/lib/teams-token';

type GraphEvent = {
  id: string; subject?: string; bodyPreview?: string;
  start?: { dateTime?: string; date?: string };
  location?: { displayName?: string };
  onlineMeeting?: { joinUrl?: string } | null;
  isCancelled?: boolean;
  attendees?: { emailAddress?: { address?: string; name?: string } }[];
  organizer?: { emailAddress?: { address?: string; name?: string } };
};

export async function syncTeamsCalendar(): Promise<{ synced: number; total: number; errors: string[]; error?: string; expired?: boolean }> {
  const token = await getValidTeamsToken();
  if (!token) return { synced: 0, total: 0, errors: [], error: 'Teams not connected or token expired', expired: true };

  const now   = new Date();
  const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const end   = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const events: GraphEvent[] = [];
  let url: string | null =
    `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start.toISOString()}&endDateTime=${end.toISOString()}` +
    `&$select=id,subject,start,end,location,bodyPreview,isOnlineMeeting,onlineMeeting,attendees,organizer,isCancelled&$top=200`;
  while (url && events.length < 1000) {
    const res: Response = await fetch(url, { headers: { Authorization: `Bearer ${token.access_token}` } });
    const body = await res.json();
    if (!res.ok) return { synced: 0, total: 0, errors: [], error: `Graph API error (${res.status}): ${body?.error?.message}`, expired: res.status === 401 };
    events.push(...(body.value ?? []));
    url = body['@odata.nextLink'] ?? null;
  }

  const { data: admin } = await supabaseAdmin
    .from('profiles').select('id').in('role', ['admin', 'super-admin', 'developer']).limit(1).maybeSingle();

  let synced = 0;
  const errors: string[] = [];
  for (const event of events) {
    const people = [...(event.attendees ?? []), ...(event.organizer ? [event.organizer] : [])];
    const emails = [...new Set(people.map(p => p.emailAddress?.address?.trim().toLowerCase()).filter(Boolean) as string[])];
    const names  = [...new Set(people.map(p => p.emailAddress?.name?.trim().toLowerCase()).filter(Boolean) as string[])];

    if (event.isCancelled) {
      await supabaseAdmin.from('calendar_events').delete().eq('teams_event_id', event.id);
      continue;
    }

    const dateTimeStr = event.start?.dateTime ?? event.start?.date ?? '';
    const joinUrl = event.onlineMeeting?.joinUrl ?? null;

    const { error } = await supabaseAdmin.from('calendar_events').upsert({
      title:           event.subject ?? 'Teams Meeting',
      date:            dateTimeStr.slice(0, 10),
      time:            dateTimeStr.slice(11, 16) || 'All Day',
      type:            'meeting',
      location:        event.location?.displayName || (joinUrl ? 'Microsoft Teams' : 'TBD'),
      description:     event.bodyPreview?.slice(0, 200) || null,
      created_by:      admin?.id ?? null,
      teams_event_id:  event.id,
      teams_join_url:  joinUrl,
      attendee_emails: emails,
      attendee_names:  names,
    }, { onConflict: 'teams_event_id', ignoreDuplicates: false });

    if (error) errors.push(`${event.subject}: ${error.message}`);
    else synced++;
  }

  return { synced, total: events.length, errors };
}
