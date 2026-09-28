// GET /api/teams/sync-calendar — admin "Sync Teams" button
import { NextRequest, NextResponse } from 'next/server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { syncTeamsCalendar } from '@/lib/teams-calendar';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  try {
    const result = await syncTeamsCalendar();
    if (result.error) {
      return NextResponse.json({ error: result.error, expired: result.expired }, { status: result.expired ? 401 : 500 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: 'Unexpected error', detail: err.message }, { status: 500 });
  }
}
