// POST /api/docusign/webhook
// DocuSign Connect webhook — updates status and sends emails on signing events
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendAgreementSignedEmail } from '@/lib/sendgrid-emails';

const STATUS_MAP: Record<string, string> = {
  sent:      'Agreement Sent',
  delivered: 'Agreement Sent',
  completed: 'Agreement Signed',
  declined:  'Agreement Declined',
  voided:    'Agreement Voided',
};

export async function POST(req: NextRequest) {
  try {
    const body    = await req.json();
    const envelopeId = body?.data?.envelopeId ?? body?.envelopeId;
    const status     = body?.data?.envelopeSummary?.status ?? body?.status;
    const email      = body?.data?.envelopeSummary?.recipients?.signers?.[0]?.email;

    if (!envelopeId || !status) {
      return NextResponse.json({ error: 'Missing envelopeId or status' }, { status: 400 });
    }

    // Update envelope record
    await supabaseAdmin.from('docusign_envelopes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('envelope_id', envelopeId);

    if (status.toLowerCase() === 'completed' && email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name, email')
        .eq('email', email)
        .single();

      if (profile) {
        // Update onboarding status
        await supabaseAdmin.from('profiles').update({
          onboarding_status: 'Agreement Signed',
          updated_at:        new Date().toISOString(),
        }).eq('id', profile.id);

        // In-platform notification
        await supabaseAdmin.from('notifications').insert({
          user_id:           profile.id,
          title:             'Agreement Signed — Welcome to 1K Leaders!',
          message:           'Your partnership agreement has been signed. You now have full platform access. The team will follow up with your KYC requirements shortly.',
          notification_type: 'success',
          audience_roles:    ['user'],
          is_read:           false,
        });

        // SendGrid email
        try {
          await sendAgreementSignedEmail(profile.email, profile.first_name ?? 'Partner');
        } catch (e) {
          console.warn('Agreement signed email failed (non-fatal):', e);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('DocuSign webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
