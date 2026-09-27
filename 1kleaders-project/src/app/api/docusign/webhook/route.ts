// POST /api/docusign/webhook
// DocuSign Connect webhook — called by DocuSign when envelope status changes.
// The request body is NOT trusted: we only take the envelope ID from it and re-read the
// real status from the DocuSign API before changing anything.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getJWTAccessToken, getEnvelopeStatus } from '@/lib/docusign';
import { syncProspectEnvelope, type Prospect } from '@/lib/prospects';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const envelopeId: string | undefined = body?.data?.envelopeId ?? body?.envelopeId;
    if (!envelopeId || !/^[0-9a-f-]{36}$/i.test(envelopeId)) {
      return NextResponse.json({ error: 'Missing envelopeId' }, { status: 400 });
    }

    // Only envelopes we sent
    const { data: known } = await supabaseAdmin
      .from('docusign_envelopes').select('envelope_id').eq('envelope_id', envelopeId).maybeSingle();
    const { data: prospect } = await supabaseAdmin
      .from('shareholder_prospects').select('id, first_name, last_name, email, phone, status, envelope_id, user_id')
      .eq('envelope_id', envelopeId).maybeSingle();
    if (!known && !prospect) return NextResponse.json({ received: true, ignored: true });

    const token = await getJWTAccessToken();

    // Admin-started onboarding: signed → create account + welcome email
    if (prospect) {
      const result = await syncProspectEnvelope(prospect as Prospect, token);
      return NextResponse.json({ received: true, prospect: result });
    }

    const env = await getEnvelopeStatus(token, envelopeId);
    const status = String(env?.status ?? '').toLowerCase();
    if (!status) return NextResponse.json({ received: true });

    await supabaseAdmin.from('docusign_envelopes').update({
      status,
      signed_at:   env?.completedDateTime ?? undefined,
      declined_at: env?.declinedDateTime  ?? undefined,
      voided_at:   env?.voidedDateTime    ?? undefined,
      updated_at:  new Date().toISOString(),
    }).eq('envelope_id', envelopeId);

    // Existing members: mark agreement signed and notify them
    const email = env?.recipients?.signers?.[0]?.email ?? null;
    if (status === 'completed' && email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id, onboarding_status').ilike('email', String(email).replace(/[%_\\]/g, '\\$&')).maybeSingle();

      if (profile) {
        const early = [null, '', 'Meeting Completed', 'Platform Access Issued', 'Agreement Sent'];
        if (early.includes(profile.onboarding_status)) {
          await supabaseAdmin.from('profiles').update({
            onboarding_status: 'Agreement Signed',
            updated_at: new Date().toISOString(),
          }).eq('id', profile.id);
        }
        await supabaseAdmin.from('notifications').insert({
          user_id:           profile.id,
          title:             'Agreement Signed — Welcome to 1K Leaders!',
          message:           'Your partnership agreement has been signed. Next step: complete your KYC on the KYC & Onboarding page.',
          notification_type: 'success',
          action_url:        'page:onboarding',
          is_read:           false,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('DocuSign webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
