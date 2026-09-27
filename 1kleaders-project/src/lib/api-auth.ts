// Server-side caller verification for API routes.
// Clients must send `Authorization: Bearer <access_token>` — use apiFetch() from '@/lib/api-fetch'.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export const ADMIN_ROLES = ['admin', 'super-admin', 'developer'];

export type Caller = { id: string; email: string; role: string };

export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role, email').eq('id', user.id).maybeSingle();

  return { id: user.id, email: profile?.email ?? user.email ?? '', role: profile?.role ?? 'user' };
}

// Usage:
//   const auth = await requireCaller(req, ADMIN_ROLES);
//   if ('response' in auth) return auth.response;
//   auth.caller.id ...
export async function requireCaller(
  req: NextRequest,
  roles?: string[],
): Promise<{ caller: Caller } | { response: NextResponse }> {
  const caller = await getCaller(req);
  if (!caller) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  if (roles && !roles.includes(caller.role)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { caller };
}
