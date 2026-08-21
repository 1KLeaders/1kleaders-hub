// POST /api/docusign/sync
// Polls DocuSign API for all envelope statuses and updates our DB
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getDocuSignToken } from '@/lib/docusign';

export async function POST(req: NextRequest) {
  try {
    const token = await getDocuSignToken();
    const baseUrl = process.env.DOCUSIGN_BASE_URL;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    // Get all our envelope IDs
    const { data: envelopes } = await supabaseAdmin
      .from('docusign_envelopes')
      .select('envelope_id, status')
      .not('status', 'in', '(completed,declined,voided)');

    if (!envelopes?.length) return NextResponse.json({ synced: 0, message: 'No pending envelopes' });

    let synced = 0;
    const errors: string[] = [];

    for (const env of envelopes) {
      try {
        const res = await fetch(
          `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${env.envelope_id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) { errors.push(`${env.envelope_id}: ${data.message}`); continue; }

        const newStatus = data.status;
        const completedAt = data.completedDateTime ?? null;

        if (newStatus !== env.status) {
          await supabaseAdmin.from('docusign_envelopes').update({
            status:     newStatus,
            signed_at:  completedAt,
            updated_at: new Date().toISOString(),
          }).eq('envelope_id', env.envelope_id);

          // If completed, update the profile
          if (newStatus === 'completed') {
            const signerEmail = data.recipients?.signers?.[0]?.email;
            if (signerEmail) {
              const { data: profile } = await supabaseAdmin
                .from('profiles').select('id').eq('email', signerEmail).maybeSingle();
              if (profile) {
                await supabaseAdmin.from('profiles').update({
                  onboarding_status: 'Agreement Signed',
                }).eq('id', profile.id);
                await supabaseAdmin.from('notifications').insert({
                  user_id:           profile.id,
                  title:             'Agreement Signed — Welcome to 1K Leaders!',
                  message:           'Your partnership agreement has been signed successfully.',
                  notification_type: 'success',
                  is_read:           false,
                });
              }
            }
          }
          synced++;
        }
      } catch (e: any) {
        errors.push(e.message);
      }
    }

    return NextResponse.json({ synced, total: envelopes.length, errors });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
