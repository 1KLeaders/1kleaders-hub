// TEMPORARY DEBUG ROUTE — DELETE AFTER FIXING DOCUSIGN
// GET /api/docusign/debug
import { NextRequest, NextResponse } from 'next/server';
import { createSign } from 'crypto';

export async function GET(req: NextRequest) {
  const key = process.env.DOCUSIGN_PRIVATE_KEY ?? '';

  // Normalize
  const normalized = key.replace(/\\n/g, '\n');

  // Diagnose
  const info = {
    raw_length:         key.length,
    raw_has_newlines:   key.includes('\n'),
    raw_has_literal_n:  key.includes('\\n'),
    norm_length:        normalized.length,
    starts_with:        normalized.slice(0, 40),
    ends_with:          normalized.slice(-40),
    line_count:         normalized.split('\n').length,
    integration_key:    process.env.DOCUSIGN_INTEGRATION_KEY?.slice(0, 8) + '...',
    user_id:            process.env.DOCUSIGN_USER_ID?.slice(0, 8) + '...',
    auth_url:           process.env.DOCUSIGN_AUTH_URL,
  };

  // Try signing something small to verify the key is valid
  let sign_test = 'unknown';
  try {
    const s = createSign('RSA-SHA256');
    s.update('test');
    s.sign(normalized, 'base64url');
    sign_test = 'SUCCESS — key parsed and signed correctly';
  } catch (e: any) {
    sign_test = `FAILED: ${e.message}`;
  }

  return NextResponse.json({ ...info, sign_test });
}
