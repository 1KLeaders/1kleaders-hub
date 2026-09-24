// POST /api/admin/delete-message
// Deletes a message/item using service role (bypasses RLS)
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const ALLOWED_TABLES = ['discussion_messages', 'ideas', 'calendar_events', 'announcements'];

export async function POST(req: NextRequest) {
  // Verify user is authenticated
  const supabaseClient = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check role
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role, id').eq('id', user.id).maybeSingle();
  const isAdmin = ['admin', 'super-admin', 'developer'].includes(profile?.role ?? '');

  const { id, table, user_id } = await req.json();
  if (!id || !table) return NextResponse.json({ error: 'id and table required' }, { status: 400 });
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });

  // Admins can delete anything; regular users can only delete their own
  if (!isAdmin && user_id !== profile?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
