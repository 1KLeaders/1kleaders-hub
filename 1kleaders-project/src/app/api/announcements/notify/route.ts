// POST /api/announcements/notify
// Admin-only: notify the audience of a published announcement.
// In-app notification for everyone in the audience; email only for people with profiles.email_announcements = true.
// Sends once per announcement (announcements.notified_at) unless { force: true }.
// Body: { announcement_id, force? }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { audienceIncludes, excerpt, type Announcement } from '@/lib/announcements';
import { sendAnnouncementEmails } from '@/lib/resend-emails';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.1kleaders.com';

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { announcement_id, force } = await req.json();
  if (!announcement_id) return NextResponse.json({ error: 'announcement_id required' }, { status: 400 });

  const { data: ann, error } = await supabaseAdmin
    .from('announcements').select('*').eq('id', announcement_id).single();
  if (error || !ann) return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });

  const a = ann as Announcement;
  if (!a.is_published) return NextResponse.json({ error: 'Announcement is not published' }, { status: 400 });
  if (a.notified_at && !force) return NextResponse.json({ skipped: true, reason: 'Already notified' });

  // Claim the send first so two quick publishes can't double-notify
  let claim = supabaseAdmin
    .from('announcements')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', a.id);
  if (!force) claim = claim.is('notified_at', null);
  const { data: claimed } = await claim.select('id');
  if (!claimed?.length) return NextResponse.json({ skipped: true, reason: 'Already notified' });

  const { data: people } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, role, subroles, email_announcements');

  // Admins can see everything, but only notify them when they're explicitly in the audience
  const recipients = (people ?? []).filter(p =>
    p.id !== auth.caller.id &&
    audienceIncludes(a.audience, { id: p.id, role: ADMIN_ROLES.includes(p.role) ? '__admin__' : p.role, subroles: p.subroles }),
  );

  const summary = excerpt(a, 160);
  const rows = recipients.map(p => ({
    user_id:           p.id,
    title:             `New ${a.category.toLowerCase()}: ${a.title}`,
    message:           summary || 'A new announcement was posted on 1KL Hub.',
    notification_type: 'info',
    action_url:        `page:announcement-${a.id}`,
    is_read:           false,
  }));

  let inApp = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const { error: insErr } = await supabaseAdmin.from('notifications').insert(rows.slice(i, i + 500));
    if (insErr) console.error('Notification insert failed:', insErr.message);
    else inApp += Math.min(500, rows.length - i);
  }

  const emailTo = recipients
    .filter(p => p.email_announcements && p.email)
    .map(p => ({ email: p.email as string, firstName: p.first_name ?? 'Partner' }));

  const url = a.visibility === 'external_use'
    ? `${APP_URL}/announcements/${a.id}`
    : `${APP_URL}/?page=announcement-${a.id}`;

  const { sent } = emailTo.length
    ? await sendAnnouncementEmails(emailTo, { title: a.title, excerpt: summary, category: a.category, url })
    : { sent: 0 };

  return NextResponse.json({ success: true, in_app: inApp, emailed: sent, audience: recipients.length });
}
