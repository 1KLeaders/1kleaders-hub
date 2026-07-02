// TEMPORARY — DELETE AFTER USE
// GET /api/docusign/debug
import { NextRequest, NextResponse } from 'next/server';
import { getJWTAccessToken } from '@/lib/docusign';

export async function GET(req: NextRequest) {
  const accountId  = process.env.DOCUSIGN_ACCOUNT_ID!;
  const baseUrl    = process.env.DOCUSIGN_BASE_URL!;
  const templateId = process.env.DOCUSIGN_TEMPLATE_ID!;

  let accessToken: string;
  try {
    accessToken = await getJWTAccessToken();
  } catch (e: any) {
    return NextResponse.json({ step: 'token', error: e.message });
  }

  // First get userinfo to confirm who we're authenticated as
  const userInfoRes = await fetch('https://account.docusign.com/oauth/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const userInfo = await userInfoRes.json();

  // Then try the envelope
  const envelopeRes = await fetch(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        templateId,
        templateRoles: [{ name: 'Test', email: 'test@example.com', roleName: 'Signer' }],
        status: 'sent',
        emailSubject: 'Test',
      }),
    }
  );
  const envelopeResponse = await envelopeRes.text();

  return NextResponse.json({
    base_url:          baseUrl,
    account_id:        accountId,
    user_info:         userInfo,
    envelope_status:   envelopeRes.status,
    envelope_response: envelopeResponse,
  });
}
