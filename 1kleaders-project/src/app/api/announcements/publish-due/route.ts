// POST /api/announcements/publish-due
// Admin-only. Publishes scheduled announcements whose time has passed (called when an admin opens
// Announcements, so scheduling works even between cron runs).
import { NextRequest, NextResponse } from 'next/server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { publishDueAnnouncements } from '@/lib/announcement-notify';

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;
  try {
    return NextResponse.json(await publishDueAnnouncements());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
