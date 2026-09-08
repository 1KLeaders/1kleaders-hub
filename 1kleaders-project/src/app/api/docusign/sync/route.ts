// POST /api/docusign/sync
// Pulls ALL envelopes from DocuSign and upserts them into our DB
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getAccessToken } from '@/lib/docusign';

export async function POST(req: NextRequest) {
  try {
    const token = await getAccessToken();
    const baseUrl   = process.env.DOCUSIGN_BASE_URL;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    if (!token || !baseUrl || !accountId) {
      return NextResponse.json({ error: 'DocuSign not configured' }, { status: 500 });
    }

    // Pull ALL envelopes from DocuSign (last 2 years)
    const fromDate = new Date();
    fromDate.setFullYear(fromDate.getFullYear() - 2);
    const fromStr = fromDate.toISOString().split('T')[0];

    const listRes = await fetch(
      `${baseUrl}/v2.1/accounts/${accountId}/envelopes?from_date=${fromStr}&include=recipients`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const listData = await listRes.json();

    if (!listRes.ok) {
      return NextResponse.json({ error: `DocuSign error: ${listData.message}` }, { status: 500 });
    }

    const envelopes = listData.envelopes ?? [];
    let synced = 0;
    const errors: string[] = [];

    for (const env of envelopes) {
      try {
        const signerEmail = env.recipients?.signers?.[0]?.email ?? null;
        const signerName  = env.recipients?.signers?.[0]?.name  ?? null;

        // Find matching profile
        let userId = null;
        if (signerEmail) {
          const { data: profile } = await supabaseAdmin
            .from('profiles').select('id').eq('email', signerEmail).maybeSingle();
          userId = profile?.id ?? null;
        }

        // Upsert envelope into DB
        await supabaseAdmin.from('docusign_envelopes').upsert({
          envelope_id:     env.envelopeId,
          user_id:         userId,
          recipient_name:  signerName ?? 'Unknown',
          recipient_email: signerEmail ?? '',
          status:          env.status,
          sent_at:         env.sentDateTime ?? null,
          signed_at:       env.completedDateTime ?? null,
          declined_at:     env.declinedDateTime  ?? null,
          voided_at:       env.voidedDateTime    ?? null,
          void_reason:     env.voidedReason      ?? null,
        }, { onConflict: 'envelope_id' });

        // Update profile onboarding status if completed
        if (env.status === 'completed' && userId) {
          await supabaseAdmin.from('profiles')
            .update({ onboarding_status: 'Agreement Signed' })
            .eq('id', userId);
        }

        synced++;
      } catch (e: any) {
        errors.push(`${env.envelopeId}: ${e.message}`);
      }
    }

    return NextResponse.json({
      synced,
      total: envelopes.length,
      errors,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
