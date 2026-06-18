// DocuSign configuration and helper functions

export const DS_CONFIG = {
  // Sandbox (developer) credentials — swap for production on Go Live
  integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY!,
  secretKey:      process.env.DOCUSIGN_SECRET_KEY!,
  accountId:      process.env.DOCUSIGN_ACCOUNT_ID!,
  userId:         process.env.DOCUSIGN_USER_ID!,
  templateId:     process.env.DOCUSIGN_TEMPLATE_ID!,

  // Sandbox base URL — change to https://www.docusign.net/restapi for production
  baseUrl:        process.env.DOCUSIGN_BASE_URL ?? 'https://demo.docusign.net/restapi',
  authUrl:        process.env.DOCUSIGN_AUTH_URL ?? 'https://account-d.docusign.com',
  redirectUri:    process.env.NEXT_PUBLIC_APP_URL + '/api/docusign/callback',
};

// Exchange authorization code for access token
export async function getAccessToken(code: string): Promise<string> {
  const credentials = Buffer.from(`${DS_CONFIG.integrationKey}:${DS_CONFIG.secretKey}`).toString('base64');
  const res = await fetch(`${DS_CONFIG.authUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
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

// Get a stored access token from Supabase (or refresh it)
// For simplicity we use JWT grant (server-to-server) in the actual send route
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

// Send an envelope using a template
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
    templateId: DS_CONFIG.templateId,
    templateRoles: [{
      name:       recipientName,
      email:      recipientEmail,
      roleName:   'Signer',
      clientUserId: undefined, // undefined = email delivery (not embedded)
    }],
    customFields: {
      textCustomFields: Object.entries(metadata ?? {}).map(([name, value]) => ({
        name, value, show: 'false', required: 'false',
      })),
    },
    status: 'sent',
    emailSubject: '1K Leaders — Partnership Agreement Ready for Signature',
    emailBlurb: `Dear ${recipientName}, your partnership agreement with 1K Leaders is ready for your review and signature. Please click the link below to access and sign the document.`,
  };

  const res = await fetch(
    `${DS_CONFIG.baseUrl}/v2.1/accounts/${DS_CONFIG.accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(envelope),
    }
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Failed to send envelope');
  return data as { envelopeId: string; status: string; statusDateTime: string };
}

// Get envelope status
export async function getEnvelopeStatus(accessToken: string, envelopeId: string) {
  const res = await fetch(
    `${DS_CONFIG.baseUrl}/v2.1/accounts/${DS_CONFIG.accountId}/envelopes/${envelopeId}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  return res.json();
}

// Get JWT access token using impersonation (server-to-server, no user login needed)
export async function getJWTAccessToken(): Promise<string> {
  // JWT Grant — sign an assertion to get a token without user redirect
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss:   DS_CONFIG.integrationKey,
    sub:   DS_CONFIG.userId,
    aud:   DS_CONFIG.authUrl.replace('https://', ''),
    iat:   now,
    exp:   now + 3600,
    scope: 'signature impersonation',
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');

  // Sign with RSA private key
  const { createSign } = await import('crypto');
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY!.replace(/\\n/g, '\n');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, 'base64url');
  const assertion = `${header}.${payload}.${signature}`;

  const res = await fetch(`https://${claims.aud}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description ?? 'JWT grant failed');
  return data.access_token;
}
