// GET /api/docusign/callback
// DocuSign redirects here after the one-time consent grant.
// For JWT grant flow, we don't need to exchange the code —
// consent is now stored by DocuSign against the integration key.
// Just redirect back to the app with a success indicator.

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1kl-partner-hub.vercel.app';

  if (error) {
    return NextResponse.redirect(`${appUrl}/?docusign_error=${encodeURIComponent(error)}`);
  }

  // Consent granted — JWT grant will now work server-side without user interaction
  return NextResponse.redirect(`${appUrl}/?docusign_connected=true`);
}
