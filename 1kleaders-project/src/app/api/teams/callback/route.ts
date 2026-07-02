// GET /api/teams/callback
// Microsoft Teams OAuth callback
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

const CLIENT_ID     = process.env.TEAMS_CLIENT_ID!;
const CLIENT_SECRET = process.env.TEAMS_CLIENT_SECRET!;
const APP_URL       = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1kl-partner-hub.vercel.app';
const REDIRECT      = `${APP_URL}/api/teams/callback`;
const TENANT        = process.env.TEAMS_TENANT_ID ?? 'common';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) return NextResponse.redirect(`${APP_URL}/?teams_error=${encodeURIComponent(error)}`);
  if (!code) return NextResponse.redirect(`${APP_URL}/?teams_error=no_code`);

  // Exchange code for token
  const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri:  REDIRECT,
      grant_type:    'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${APP_URL}/?teams_error=token_failed`);
  }

  // Get user info from Microsoft Graph
  const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
  });
  const graphData = await graphRes.json();

  // Get the current Supabase user from the auth header
  const authHeader = req.headers.get('authorization') ?? '';
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (user) {
    await supabaseAdmin.from('teams_connections').upsert({
      user_id:       user.id,
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token ?? null,
      expires_at:    new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      tenant_id:     graphData.id,
      display_name:  graphData.displayName,
      email:         graphData.mail ?? graphData.userPrincipalName,
      connected:     true,
    }, { onConflict: 'user_id' });
  }

  return NextResponse.redirect(`${APP_URL}/?teams_connected=true`);
}
