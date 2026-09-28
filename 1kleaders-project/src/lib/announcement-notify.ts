// Announcement publish notifications + scheduled publishing. Server-only (service role).
//   notify_in_app  → in-app notification for everyone in the audience
//   email_mode     → 'none' | 'opted_in' (profiles.email_announcements) | 'all' (everyone in the audience)
//   notify_admins  → also notify admins (they can always see announcements, so they're skipped by default)
import { supabaseAdmin } from '@/lib/supabase-server';
import { audienceIncludes, excerpt, ADMIN_ROLES, type Announcement } from '@/lib/announcements';
import { sendAnnouncementEmails } from '@/lib/resend-emails';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.1kleaders.com';

type AnnRow = Announcement & { notify_in_app?: boolean | null; email_mode?: string | null; notify_admins?: boolean | null };

export type NotifyResult = { skipped?: boolean; reason?: string; audience: number; in_app: number; emailed: number; errors: string[] };

async function allProfiles() {
  const all: { id: string; email: string | null; first_name: string | null; role: string; subroles: string[] | null; email_announcements: boolean | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabaseAdmin.from('profiles')
      .select('id, email, first_name, role, subroles, email_announcements').range(from, from + 999);
    all.push(...(data ?? []) as typeof all);
    if (!data || data.length < 1000) break;
  }
  return all;
}

export async function notifyAnnouncement(
  announcementId: string,
  opts: { force?: boolean; excludeUserId?: string; onlyUserId?: string } = {},
): Promise<NotifyResult> {
  const empty = { audience: 0, in_app: 0, emailed: 0, errors: [] as string[] };
  const { data } = await supabaseAdmin.from('announcements').select('*').eq('id', announcementId).single();
  const a = data as AnnRow | null;
  if (!a) return { ...empty, skipped: true, reason: 'Announcement not found' };

  const testOnly = !!opts.onlyUserId;
  if (!testOnly) {
    if (!a.is_published) return { ...empty, skipped: true, reason: 'Not published' };
    if (a.notified_at && !opts.force) return { ...empty, skipped: true, reason: 'Already notified' };
    // Claim the send first so two quick publishes can't double-notify
    let claim = supabaseAdmin.from('announcements').update({ notified_at: new Date().toISOString() }).eq('id', a.id);
    if (!opts.force) claim = claim.is('notified_at', null);
    const { data: claimed } = await claim.select('id');
    if (!claimed?.length) return { ...empty, skipped: true, reason: 'Already notified' };
  }

  const people = await allProfiles();
  const recipients = testOnly
    ? people.filter(p => p.id === opts.onlyUserId)
    : people.filter(p => p.id !== opts.excludeUserId && (
        (a.notify_admins && ADMIN_ROLES.includes(p.role)) ||
        // Admins can see everything, so only count them when explicitly targeted
        audienceIncludes(a.audience, { id: p.id, role: ADMIN_ROLES.includes(p.role) ? '__admin__' : p.role, subroles: p.subroles })
      ));

  const errors: string[] = [];
  const summary = excerpt(a, 160);
  const prefix  = testOnly ? '[Test] ' : '';

  let inApp = 0;
  if (a.notify_in_app !== false || testOnly) {
    const rows = recipients.map(p => ({
      user_id:           p.id,
      title:             `${prefix}New ${String(a.category).toLowerCase()}: ${a.title}`,
      message:           summary || 'A new announcement was posted on 1KL Hub.',
      notification_type: 'info',
      action_url:        `page:announcement-${a.id}`,
      is_read:           false,
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await supabaseAdmin.from('notifications').insert(chunk);
      if (error) errors.push(`In-app notifications: ${error.message}`);
      else inApp += chunk.length;
    }
  }

  const mode = testOnly ? 'all' : (a.email_mode ?? 'opted_in');
  let emailed = 0;
  if (mode !== 'none') {
    const emailTo = recipients
      .filter(p => p.email && (mode === 'all' || p.email_announcements))
      .map(p => ({ email: p.email as string, firstName: p.first_name ?? 'Partner' }));
    if (emailTo.length) {
      const url = a.visibility === 'external_use' ? `${APP_URL}/announcements/${a.id}` : `${APP_URL}/?page=announcement-${a.id}`;
      try {
        emailed = (await sendAnnouncementEmails(emailTo, { title: `${prefix}${a.title}`, excerpt: summary, category: a.category, url })).sent;
        if (emailed < emailTo.length) errors.push(`Only ${emailed} of ${emailTo.length} emails were accepted by Resend`);
      } catch (e: any) { errors.push(`Email: ${e.message}`); }
    }
  }

  return { audience: recipients.length, in_app: inApp, emailed, errors };
}

// Publish announcements whose scheduled time has passed, then notify their audiences
export async function publishDueAnnouncements() {
  const now = new Date().toISOString();
  const { data: due } = await supabaseAdmin.from('announcements')
    .select('id').eq('is_published', false).not('publish_at', 'is', null).lte('publish_at', now);

  const results: { id: string; result: NotifyResult | { error: string } }[] = [];
  for (const { id } of due ?? []) {
    const { data: flipped } = await supabaseAdmin.from('announcements')
      .update({ is_published: true, published_at: now, publish_at: null, updated_at: now })
      .eq('id', id).eq('is_published', false).select('id');
    if (!flipped?.length) continue; // someone else published it
    try { results.push({ id, result: await notifyAnnouncement(id) }); }
    catch (e: any) { results.push({ id, result: { error: e.message } }); }
  }
  return { published: results.length, results };
}
