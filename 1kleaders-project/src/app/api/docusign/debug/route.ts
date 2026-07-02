// TEMPORARY — DELETE AFTER USE
// GET /api/docusign/debug
import { NextRequest, NextResponse } from 'next/server';
import { getJWTAccessToken } from '@/lib/docusign';

export async function GET(req: NextRequest) {
  const accountId  = process.env.DOCUSIGN_ACCOUNT_ID!;
  const baseUrl    = process.env.DOCUSIGN_BASE_URL!;
  const templateId = process.env.DOCUSIGN_TEMPLATE_ID!;

  // Get token
  let accessToken: string;
  try {
    accessToken = await getJWTAccessToken();
  } catch (e: any) {
    return NextResponse.json({ step: 'token', error: e.message });
  }

  // Try sending a minimal test envelope
  const envelope = {
    templateId,
    templateRoles: [{
      name:     'Test Recipient',
      email:    'test@example.com',
      roleName: 'Signer',
    }],
    status: 'sent',
    emailSubject: 'Test envelope',
  };

  const res = await fetch(
    `${baseUrl}/v2.1/accounts/${accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(envelope),
    }
  );

  const raw = await res.text();

  return NextResponse.json({
    step:         'envelope',
    status:       res.status,
    account_id:   accountId,
    base_url:     baseUrl,
    template_id:  templateId,
    token_prefix: accessToken.slice(0, 20) + '...',
    response:     raw,
  });
}
