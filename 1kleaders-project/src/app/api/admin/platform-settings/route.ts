// POST /api/admin/platform-settings — update a platform setting (admin only)
// GET  /api/admin/platform-settings?key=… — read setting(s) (any signed-in user)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { setPlatformSetting } from '@/lib/platform-settings';

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });

  const error = await setPlatformSetting(key, value);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const auth = await requireCaller(req);
  if ('response' in auth) return auth.response;

  const key = req.nextUrl.searchParams.get('key');
  const query = supabaseAdmin.from('platform_settings').select('key, value');
  const { data, error } = key ? await query.eq('key', key).maybeSingle() : await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? { key, value: null });
}
