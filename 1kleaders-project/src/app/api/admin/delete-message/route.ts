import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = ['discussion_messages', 'ideas', 'calendar_events', 'announcements'];

export async function POST(req: NextRequest) {
  const { id, table } = await req.json();
  if (!id || !table) return NextResponse.json({ error: 'id and table required' }, { status: 400 });
  if (!ALLOWED_TABLES.includes(table)) return NextResponse.json({ error: 'Table not allowed' }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const admin = createClient(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // First verify we can read
  const { data: readTest, error: readError } = await admin
    .from(table).select('id').eq('id', id).maybeSingle();

  if (readError) return NextResponse.json({ error: `Read failed: ${readError.message}` }, { status: 500 });
  if (!readTest) return NextResponse.json({ error: `Row not found: ${id}` }, { status: 404 });

  const { error } = await admin.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ 
    error: error.message, 
    code: error.code,
    details: error.details,
    hint: error.hint
  }, { status: 500 });
  
  return NextResponse.json({ success: true });
}
