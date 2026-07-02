// GET /api/teams/auth
// Starts Microsoft Teams OAuth flow
import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID  = process.env.TEAMS_CLIENT_ID;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1kl-partner-hub.vercel.app';
const REDIRECT   = `${APP_URL}/api/teams/callback`;
const SCOPES     = 'openid profile email User.Read OnlineMeetings.ReadWrite Calendars.ReadWrite';
const TENANT     = process.env.TEAMS_TENANT_ID ?? 'common';

export async function GET(req: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'Teams not configured — add TEAMS_CLIENT_ID to environment variables' }, { status: 503 });
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    response_type: 'code',
    redirect_uri:  REDIRECT,
    scope:         SCOPES,
    response_mode: 'query',
    state,
  });

  const authUrl = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
