// POST /api/announcements/notify
// Admin-only. Notify the audience of a published announcement (once, unless { force: true }),
// or { test: true } to send the in-app notification + email to yourself only.
// Body: { announcement_id, force?, test? }
import { NextRequest, NextResponse } from 'next/server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { notifyAnnouncement } from '@/lib/announcement-notify';

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { announcement_id, force, test } = await req.json();
  if (!announcement_id) return NextResponse.json({ error: 'announcement_id required' }, { status: 400 });

  try {
    const result = await notifyAnnouncement(announcement_id, test
      ? { onlyUserId: auth.caller.id }
      : { force: !!force, excludeUserId: auth.caller.id });
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
