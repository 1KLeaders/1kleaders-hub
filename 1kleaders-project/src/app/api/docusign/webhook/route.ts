// POST /api/docusign/webhook
// DocuSign Connect webhook — configure this URL in DocuSign production:
// Admin → Connect → Add Configuration → URL: https://1kl-partner-hub.vercel.app/api/docusign/webhook
// Trigger on: Envelope Completed, Envelope Declined, Envelope Voided, Envelope Sent
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendAgreementSignedEmail } from '@/lib/sendgrid-emails';

export async function POST(req: NextRequest) {
  try {
    const raw  = await req.text();
    let body: any = {};
    try { body = JSON.parse(raw); } catch {
      // DocuSign sometimes sends XML — handle gracefully
      console.log('DocuSign webhook received non-JSON body, length:', raw.length);
      return NextResponse.json({ received: true });
    }

    console.log('DocuSign webhook body keys:', Object.keys(body));

    // DocuSign Connect sends different shapes depending on version
    const envelopeId =
      body?.data?.envelopeId ??
      body?.envelopeId ??
      body?.EnvelopeStatus?.EnvelopeID ??
      null;

    const rawStatus =
      body?.data?.envelopeSummary?.status ??
      body?.status ??
      body?.EnvelopeStatus?.Status ??
      null;

    const email =
      body?.data?.envelopeSummary?.recipients?.signers?.[0]?.email ??
      body?.recipients?.signers?.[0]?.email ??
      body?.EnvelopeStatus?.RecipientStatuses?.RecipientStatus?.Email ??
      null;

    if (!envelopeId || !rawStatus) {
      console.warn('DocuSign webhook: missing envelopeId or status', { envelopeId, rawStatus });
      return NextResponse.json({ received: true });
    }

    const status = rawStatus.toLowerCase();
    console.log(`DocuSign webhook: envelope ${envelopeId} → ${status}`);

    // Update envelope record
    await supabaseAdmin
      .from('docusign_envelopes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('envelope_id', envelopeId);

    if (status === 'completed') {
      // Find the user — try by user_id on envelope first, then by email
      let userId: string | null = null;
      let userEmail: string | null = email;
      let firstName = 'Partner';

      const { data: envelope } = await supabaseAdmin
        .from('docusign_envelopes')
        .select('user_id, recipient_email')
        .eq('envelope_id', envelopeId)
        .single();

      if (envelope?.user_id) {
        userId = envelope.user_id;
      } else if (envelope?.recipient_email || email) {
        userEmail = envelope?.recipient_email ?? email;
        const { data: profileByEmail } = await supabaseAdmin
          .from('profiles')
          .select('id, first_name, email')
          .eq('email', userEmail)
          .maybeSingle();
        if (profileByEmail) {
          userId = profileByEmail.id;
          firstName = profileByEmail.first_name ?? 'Partner';
          userEmail = profileByEmail.email;
        }
      }

      if (userId) {
        // Advance onboarding
        await supabaseAdmin.from('profiles').update({
          onboarding_status: 'Agreement Signed',
          updated_at: new Date().toISOString(),
        }).eq('id', userId);

        // Also link envelope to user if not already
        await supabaseAdmin.from('docusign_envelopes')
          .update({ user_id: userId })
          .eq('envelope_id', envelopeId);

        // In-platform notification
        await supabaseAdmin.from('notifications').insert({
          user_id:           userId,
          title:             'Agreement Signed — Welcome to 1K Leaders! ✓',
          message:           'Your partnership agreement has been signed. You now have full access to the platform. Complete your KYC documents next.',
          notification_type: 'success',
          is_read:           false,
        });

        // SendGrid email
        if (userEmail) {
          try {
            await sendAgreementSignedEmail(userEmail, firstName);
          } catch (e) {
            console.warn('Agreement signed email failed:', e);
          }
        }
      } else {
        console.warn('DocuSign webhook: could not find user for envelope', envelopeId, 'email:', email);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('DocuSign webhook unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
