// /api/onboarding/prospects/check
// Checks every pending prospect agreement with DocuSign and creates accounts for signed ones.
// Called by the admin Prospects panel, and can be added as a cron job (cron-job.org) with
//   GET https://app.1kleaders.com/api/onboarding/prospects/check?secret=<CRON_SECRET>
// so accounts are created even when nobody has the admin page open.
import { NextRequest, NextResponse } from 'next/server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { syncPendingProspects } from '@/lib/prospects';

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const viaCron = !!secret && (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.nextUrl.searchParams.get('secret') === secret
  );
  if (!viaCron) {
    const auth = await requireCaller(req, ADMIN_ROLES);
    if ('response' in auth) return auth.response;
  }
  try {
    return NextResponse.json(await syncPendingProspects());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
