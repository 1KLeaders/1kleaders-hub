// POST /api/docusign/webhook
// DocuSign Connect webhook — called by DocuSign when envelope status changes.
// Updates onboarding_tracker and profiles when someone signs.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

// Map DocuSign statuses to our onboarding statuses
const STATUS_MAP: Record<string, string> = {
  sent:       'Agreement Sent',
  delivered:  'Agreement Sent',
  completed:  'Agreement Signed',
  declined:   'Agreement Declined',
  voided:     'Agreement Voided',
};

export async function POST(req: NextRequest) {
  try {
    // DocuSign sends XML or JSON depending on Connect config
    // We configure JSON in the Connect setup
    const body = await req.json();

    const envelopeId = body?.data?.envelopeId ?? body?.envelopeId;
    const status     = body?.data?.envelopeSummary?.status ?? body?.status;
    const email      = body?.data?.envelopeSummary?.recipients?.signers?.[0]?.email;

    if (!envelopeId || !status) {
      return NextResponse.json({ error: 'Missing envelopeId or status' }, { status: 400 });
    }

    const onboardingStatus = STATUS_MAP[status.toLowerCase()];

    // Update our envelope record
    await supabaseAdmin.from('docusign_envelopes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('envelope_id', envelopeId);

    // If signed, update the user's onboarding status and notify them
    if (status.toLowerCase() === 'completed' && email) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id, first_name')
        .eq('email', email)
        .single();

      if (profile) {
        await supabaseAdmin.from('profiles').update({
          onboarding_status: 'Agreement Signed',
          updated_at: new Date().toISOString(),
        }).eq('id', profile.id);

        // Send in-platform notification
        await supabaseAdmin.from('notifications').insert({
          user_id:           profile.id,
          title:             'Agreement Signed Successfully',
          message:           'Your partnership agreement has been signed. The team will review it and proceed with the next onboarding steps.',
          notification_type: 'success',
          audience_roles:    ['user'],
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
