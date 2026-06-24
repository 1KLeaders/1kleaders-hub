// DocuSign configuration and helper functions
import { createSign } from 'crypto';

export const DS_CONFIG = {
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY!,
  secretKey:      process.env.DOCUSIGN_SECRET_KEY!,
  accountId:      process.env.DOCUSIGN_ACCOUNT_ID!,
  userId:         process.env.DOCUSIGN_USER_ID!,
  templateId:     process.env.DOCUSIGN_TEMPLATE_ID!,
  baseUrl:        process.env.DOCUSIGN_BASE_URL ?? 'https://demo.docusign.net/restapi',
  authUrl:        process.env.DOCUSIGN_AUTH_URL ?? 'https://account-d.docusign.com',
  redirectUri:    (process.env.NEXT_PUBLIC_APP_URL ?? '') + '/api/docusign/callback',
};

export function getOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    scope:         'signature impersonation',
    client_id:     DS_CONFIG.integrationKey,
    redirect_uri:  DS_CONFIG.redirectUri,
    state,
  });
  return `${DS_CONFIG.authUrl}/oauth/auth?${params}`;
}

export async function getAccessToken(code: string): Promise<string> {
  const credentials = Buffer.from(`${DS_CONFIG.integrationKey}:${DS_CONFIG.secretKey}`).toString('base64');
  const res = await fetch(`${DS_CONFIG.authUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type:   'authorization_code',
      code,
      redirect_uri: DS_CONFIG.redirectUri,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? 'Token exchange failed');
  return data.access_token;
}

export async function getJWTAccessToken(): Promise<string> {
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY!;

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now     = Math.floor(Date.now() / 1000);
  const aud     = DS_CONFIG.authUrl.replace('https://', '');
  const claims  = {
    iss:   DS_CONFIG.integrationKey,
    sub:   DS_CONFIG.userId,
    aud,
    iat:   now,
    exp:   now + 3600,
    scope: 'signature impersonation',
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');
  const assertion = `${header}.${payload}.${signature}`;

  const res = await fetch(`https://${aud}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? data.error ?? 'JWT grant failed');
  return data.access_token;
}

export async function sendEnvelope({
  accessToken,
  recipientName,
  recipientEmail,
  recipientId,
  metadata,
}: {
  accessToken:    string;
  recipientName:  string;
  recipientEmail: string;
  recipientId:    string;
  metadata?:      Record<string, string>;
}) {
  const envelope = {
    templateId:    DS_CONFIG.templateId,
    templateRoles: [{
      name:     recipientName,
      email:    recipientEmail,
      roleName: 'Signer',
    }],
    customFields: {
      textCustomFields: Object.entries(metadata ?? {}).map(([name, value]) => ({
        name, value, show: 'false', required: 'false',
      })),
    },
    status:       'sent',
    emailSubject: '1K Leaders — Partnership Agreement Ready for Signature',
    emailBlurb:   `Dear ${recipientName}, your partnership agreement with 1K Leaders is ready for your review and signature.`,
  };

  const res = await fetch(
    `${DS_CONFIG.baseUrl}/v2.1/accounts/${DS_CONFIG.accountId}/envelopes`,
    {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(envelope),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? JSON.stringify(data));
  return data as { envelopeId: string; status: string; statusDateTime: string };
}

export async function getEnvelopeStatus(accessToken: string, envelopeId: string) {
  const res = await fetch(
    `${DS_CONFIG.baseUrl}/v2.1/accounts/${DS_CONFIG.accountId}/envelopes/${envelopeId}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  return res.json();
}
