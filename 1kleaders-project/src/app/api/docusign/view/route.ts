// GET /api/docusign/view?envelope_id=xxx
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getJWTAccessToken as getAccessToken } from '@/lib/docusign';

export async function GET(req: NextRequest) {
  try {
    const envelopeId = req.nextUrl.searchParams.get('envelope_id');
    if (!envelopeId) return NextResponse.json({ error: 'envelope_id required' }, { status: 400 });

    // Get envelope
    const { data: envelope } = await supabaseAdmin
      .from('docusign_envelopes')
      .select('envelope_id, status, recipient_email, user_id')
      .eq('envelope_id', envelopeId)
      .maybeSingle();

    if (!envelope) return NextResponse.json({ error: 'Envelope not found' }, { status: 404 });

    const token   = await getAccessToken();
    const baseUrl = process.env.DOCUSIGN_BASE_URL;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    if (envelope.status === 'completed') {
      // Fetch signed PDF directly
      const pdfRes = await fetch(
        `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/pdf' } }
      );

      if (!pdfRes.ok) {
        const err = await pdfRes.text();
        return NextResponse.json({ error: `DocuSign error (${pdfRes.status}): ${err.slice(0, 200)}` }, { status: 500 });
      }

      const pdfBuffer = await pdfRes.arrayBuffer();
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `inline; filename="agreement-${envelopeId.slice(0, 8)}.pdf"`,
        },
      });
    }

    // Pending — generate embedded signing URL
    const recipientRes = await fetch(
      `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authenticationMethod: 'none',
          email:                envelope.recipient_email,
          userName:             envelope.recipient_email,
          returnUrl:            `${process.env.NEXT_PUBLIC_APP_URL}/?page=agreements`,
          clientUserId:         envelope.user_id ?? envelopeId,
        }),
      }
    );
    const recipientData = await recipientRes.json();
    if (!recipientRes.ok) return NextResponse.json({ error: recipientData.message ?? 'Could not generate signing URL' }, { status: 500 });

    return NextResponse.json({ type: 'sign', url: recipientData.url });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
