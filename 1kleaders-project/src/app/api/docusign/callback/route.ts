// GET /api/docusign/callback
// OAuth callback — DocuSign redirects here after user grants consent.
// Stores the access token and redirects back to the admin dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/docusign';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get('code');
  const state = searchParams.get('state'); // contains admin user_id
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (error) {
    return NextResponse.redirect(`${appUrl}/?docusign_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?docusign_error=no_code`);
  }

  try {
    const accessToken = await getAccessToken(code);

    // Store token in Supabase for the admin (keyed by state = admin user_id)
    if (state) {
      await supabaseAdmin.from('docusign_tokens').upsert({
        user_id:      state,
        access_token: accessToken,
        updated_at:   new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    return NextResponse.redirect(`${appUrl}/?docusign_connected=true`);
  } catch (err: any) {
    return NextResponse.redirect(`${appUrl}/?docusign_error=${encodeURIComponent(err.message)}`);
  }
}
