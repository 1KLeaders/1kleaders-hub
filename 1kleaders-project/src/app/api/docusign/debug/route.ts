// TEMPORARY — DELETE AFTER USE
// GET /api/docusign/debug
import { NextRequest, NextResponse } from 'next/server';
import { getJWTAccessToken } from '@/lib/docusign';

export async function GET(req: NextRequest) {
  let accessToken: string;
  try {
    accessToken = await getJWTAccessToken();
  } catch (e: any) {
    return NextResponse.json({ step: 'token', error: e.message });
  }

  // Decode the JWT payload (middle section) without verifying
  const parts = accessToken.split('.');
  let decoded: any = {};
  try {
    decoded = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch (e) {
    decoded = { error: 'could not decode' };
  }

  return NextResponse.json({
    token_claims: decoded,
    env_user_id:  process.env.DOCUSIGN_USER_ID,
    env_int_key:  process.env.DOCUSIGN_INTEGRATION_KEY,
    env_auth_url: process.env.DOCUSIGN_AUTH_URL,
    env_account:  process.env.DOCUSIGN_ACCOUNT_ID,
  });
}
