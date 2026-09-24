import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const { id, table } = await req.json();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const admin = createClient(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // List all tables to see what actually exists
  const { data: tables, error: tablesError } = await admin
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (tablesError) {
    // Try a different approach
    const { data, error } = await admin.rpc('version');
    return NextResponse.json({ 
      url_prefix: url?.slice(0, 30),
      key_prefix: serviceKey?.slice(0, 20),
      rpc_error: error?.message,
      rpc_data: data,
    });
  }

  return NextResponse.json({ 
    tables: tables?.map(t => t.table_name),
    url_prefix: url?.slice(0, 30),
    key_prefix: serviceKey?.slice(0, 20),
  });
}
