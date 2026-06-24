import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getJWTAccessToken, sendEnvelope } from '@/lib/docusign';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, recipient_name, recipient_email, waitlist_id } = body;

    if (!recipient_name || !recipient_email) {
      return NextResponse.json(
        { error: 'recipient_name and recipient_email are required' },
        { status: 400 }
      );
    }

    // Get JWT access token
    let accessToken: string;
    try {
      accessToken = await getJWTAccessToken();
    } catch (e: any) {
      console.error('JWT token error:', e.message);
      return NextResponse.json({ error: `JWT auth failed: ${e.message}` }, { status: 500 });
    }

    // Send the envelope
    let envelope: { envelopeId: string; status: string; statusDateTime: string };
    try {
      envelope = await sendEnvelope({
        accessToken,
        recipientName:  recipient_name,
        recipientEmail: recipient_email,
        recipientId:    user_id ?? recipient_email,
        metadata:       { user_id: user_id ?? '', waitlist_id: waitlist_id ?? '' },
      });
    } catch (e: any) {
      console.error('DocuSign send envelope error:', e.message);
      return NextResponse.json({ error: `Envelope send failed: ${e.message}` }, { status: 500 });
    }

    // Update profile onboarding status
    if (user_id) {
      await supabaseAdmin.from('profiles').update({
        onboarding_status: 'Agreement Sent',
        updated_at:        new Date().toISOString(),
      }).eq('id', user_id);
    }

    // Store envelope record
    const { error: dbError } = await supabaseAdmin.from('docusign_envelopes').insert({
      envelope_id:     envelope.envelopeId,
      user_id:         user_id ?? null,
      waitlist_id:     waitlist_id ?? null,
      recipient_name,
      recipient_email,
      status:          envelope.status,
      sent_at:         envelope.statusDateTime,
    });

    if (dbError) {
      console.error('DB insert error:', dbError.message);
      // Don't fail the whole request — envelope was sent successfully
    }

    return NextResponse.json({
      success:    true,
      envelopeId: envelope.envelopeId,
      status:     envelope.status,
    });

  } catch (err: any) {
    console.error('DocuSign send route unexpected error:', err);
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 });
  }
}
