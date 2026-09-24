import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const ALLOWED_TABLES = ['discussion_messages', 'ideas', 'calendar_events', 'announcements'];

export async function POST(req: NextRequest) {
  const { id, table } = await req.json();
  if (!id || !table) return NextResponse.json({ error: 'id and table required' }, { status: 400 });
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });

  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}