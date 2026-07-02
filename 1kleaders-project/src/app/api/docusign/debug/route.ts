// TEMPORARY — DELETE AFTER USE
// GET /api/docusign/debug2
import { NextRequest, NextResponse } from 'next/server';
import { createSign } from 'crypto';

export async function GET(req: NextRequest) {
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY!;
  const userId = process.env.DOCUSIGN_USER_ID!;
  const authUrl = process.env.DOCUSIGN_AUTH_URL!;

  // Build the exact JWT we send to DocuSign
  const authHost = authUrl.replace('https://', '');
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const claims  = {
    iss:   integrationKey,
    sub:   userId,
    aud:   authHost,
    iat:   now,
    exp:   now + 3600,
    scope: 'signature impersonation',
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');
  const assertion = `${header}.${payload}.${signature}`;

  // Make the actual token request and return raw response
  const res = await fetch(`https://${authHost}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const raw = await res.text();

  return NextResponse.json({
    status:       res.status,
    auth_host:    authHost,
    iss:          integrationKey,
    sub:          userId,
    aud:          authHost,
    raw_response: raw,
    claims:       claims,
  });
}
