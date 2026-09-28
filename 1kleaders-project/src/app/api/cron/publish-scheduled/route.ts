// GET /api/cron/publish-scheduled?secret=<CRON_SECRET>
// Publishes announcements whose scheduled time has passed and notifies their audiences.
// Add to cron-job.org every 5–15 minutes for accurate scheduling (the hourly teams-sync job also runs it).
import { NextRequest, NextResponse } from 'next/server';
import { publishDueAnnouncements } from '@/lib/announcement-notify';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const ok = !!secret && (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.nextUrl.searchParams.get('secret') === secret
  );
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    return NextResponse.json(await publishDueAnnouncements());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
