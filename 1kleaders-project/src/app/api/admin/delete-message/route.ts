import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = ['discussion_messages', 'ideas', 'calendar_events', 'announcements'];

export async function POST(req: NextRequest) {
  const { id, table } = await req.json();
  if (!id || !table) return NextResponse.json({ error: 'id and table required' }, { status: 400 });
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 });
  if (!url) return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL not set' }, { status: 500 });

  // Create admin client inline to rule out import issues
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { error } = await admin.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
