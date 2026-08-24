import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('email, display_name, expires_at, connected, created_at, ms_user_id')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn) return NextResponse.json({ error: 'No Teams connection found' });

  // Check who the token actually belongs to
  const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
    headers: { 'Authorization': `Bearer ${(await supabaseAdmin.from('teams_connections').select('access_token').eq('connected', true).order('created_at', { ascending: false }).limit(1).maybeSingle()).data?.access_token}` }
  });
  const meData = await meRes.json();

  return NextResponse.json({
    stored_connection: {
      email:        conn.email,
      display_name: conn.display_name,
      ms_user_id:   conn.ms_user_id,
      expires_at:   conn.expires_at,
      expired:      conn.expires_at && new Date(conn.expires_at) < new Date(),
    },
    actual_token_owner: {
      status:            meRes.status,
      displayName:       meData.displayName,
      mail:              meData.mail,
      userPrincipalName: meData.userPrincipalName,
      id:                meData.id,
      error:             meData.error?.message,
    }
  });
}
