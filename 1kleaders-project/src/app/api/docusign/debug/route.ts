// GET /api/docusign/debug — shows JWT token status (admin only)
import { NextRequest, NextResponse } from 'next/server';
import { getJWTAccessToken, DS_CONFIG } from '@/lib/docusign';

export async function GET(req: NextRequest) {
  try {
    const token = await getJWTAccessToken();
    return NextResponse.json({
      success: true,
      token_preview: token.slice(0, 20) + '...',
      config: {
        has_integration_key: !!DS_CONFIG.integrationKey,
        has_user_id:         !!DS_CONFIG.userId,
        has_private_key:     !!process.env.DOCUSIGN_PRIVATE_KEY,
        auth_url:            DS_CONFIG.authUrl,
        base_url:            DS_CONFIG.baseUrl,
        account_id:          DS_CONFIG.accountId,
      }
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error:   e.message,
      config: {
        has_integration_key: !!DS_CONFIG.integrationKey,
        has_user_id:         !!DS_CONFIG.userId,
        has_private_key:     !!process.env.DOCUSIGN_PRIVATE_KEY,
        auth_url:            DS_CONFIG.authUrl,
        base_url:            DS_CONFIG.baseUrl,
        account_id:          DS_CONFIG.accountId,
      }
    });
  }
}
