// POST /api/docusign/send
// Sends a DocuSign agreement envelope to a user.
// Body: { user_id, recipient_name, recipient_email }
// Called from the admin dashboard when approving a waitlist applicant.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getJWTAccessToken, sendEnvelope } from '@/lib/docusign';

export async function POST(req: NextRequest) {
  try {
    const { user_id, recipient_name, recipient_email, waitlist_id } = await req.json();

    if (!recipient_name || !recipient_email) {
      return NextResponse.json({ error: 'recipient_name and recipient_email are required' }, { status: 400 });
    }

    // Get JWT access token (server-to-server, no user redirect needed)
    const accessToken = await getJWTAccessToken();

    // Send the envelope
    const envelope = await sendEnvelope({
      accessToken,
      recipientName:  recipient_name,
      recipientEmail: recipient_email,
      recipientId:    user_id ?? recipient_email,
      metadata: {
        user_id:     user_id ?? '',
        waitlist_id: waitlist_id ?? '',
      },
    });

    // Store envelope details in onboarding_tracker or profiles
    if (user_id) {
      await supabaseAdmin.from('profiles').update({
        onboarding_status: 'Agreement Sent',
        updated_at: new Date().toISOString(),
      }).eq('id', user_id);
    }

    // Store envelope in docusign_envelopes table
    await supabaseAdmin.from('docusign_envelopes').insert({
      envelope_id:      envelope.envelopeId,
      user_id:          user_id ?? null,
      waitlist_id:      waitlist_id ?? null,
      recipient_name,
      recipient_email,
      status:           envelope.status,
      sent_at:          envelope.statusDateTime,
    });

    return NextResponse.json({
      success:    true,
      envelopeId: envelope.envelopeId,
      status:     envelope.status,
    });

  } catch (err: any) {
    console.error('DocuSign send error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
