// GET /api/cron/teams-sync
// Hourly job (cron-job.org): signed prospect agreements → accounts, scheduled announcements → published,
// Teams calendar → calendar_events (with invitees).
import { NextRequest, NextResponse } from 'next/server';
import { syncPendingProspects } from '@/lib/prospects';
import { syncTeamsCalendar } from '@/lib/teams-calendar';
import { publishDueAnnouncements } from '@/lib/announcement-notify';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Verify via Authorization header OR secret query param
  const secret = process.env.CRON_SECRET;
  const ok = !!secret && (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.nextUrl.searchParams.get('secret') === secret
  );
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try { return await fn(); }
    catch (e: any) { console.error(`[Cron] ${label} failed:`, e.message); return { error: e.message }; }
  };

  const announcements = await run('Scheduled announcements', publishDueAnnouncements);
  const prospects     = await run('Prospect sync', syncPendingProspects);
  const teams         = await run('Teams sync', syncTeamsCalendar);

  return NextResponse.json({ announcements, prospects, teams, timestamp: new Date().toISOString() });
}
