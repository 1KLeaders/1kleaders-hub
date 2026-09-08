// GET /api/docusign/view?envelope_id=xxx
// Downloads signed PDF directly — no DocuSign account needed
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getJWTAccessToken as getAccessToken } from '@/lib/docusign';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const envelopeId = req.nextUrl.searchParams.get('envelope_id');
  if (!envelopeId) return NextResponse.json({ error: 'envelope_id required' }, { status: 400 });

  // Verify requesting user owns this envelope
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Cookie: req.headers.get('cookie') ?? '' } } }
  );
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get envelope
  const { data: envelope } = await supabaseAdmin
    .from('docusign_envelopes')
    .select('envelope_id, status, recipient_email, user_id')
    .eq('envelope_id', envelopeId)
    .maybeSingle();

  if (!envelope) return NextResponse.json({ error: 'Envelope not found' }, { status: 404 });

  // Check ownership
  const { data: profile } = await supabaseAdmin
    .from('profiles').select('email, role').eq('id', user.id).maybeSingle();

  const isAdmin = ['admin', 'super-admin', 'developer'].includes(profile?.role ?? '');
  const isOwner = envelope.user_id === user.id || envelope.recipient_email === profile?.email;

  if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  try {
    const token       = await getAccessToken();
    const baseUrl     = process.env.DOCUSIGN_BASE_URL;
    const accountId   = process.env.DOCUSIGN_ACCOUNT_ID;

    if (envelope.status === 'completed') {
      // Fetch the signed PDF directly from DocuSign
      const pdfRes = await fetch(
        `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/pdf' } }
      );

      if (!pdfRes.ok) {
        const err = await pdfRes.json().catch(() => ({}));
        return NextResponse.json({ error: `DocuSign error: ${err.message ?? pdfRes.status}` }, { status: 500 });
      }

      // Stream PDF directly to browser
      const pdfBuffer = await pdfRes.arrayBuffer();
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `inline; filename="agreement-${envelopeId.slice(0, 8)}.pdf"`,
          'Content-Length':      pdfBuffer.byteLength.toString(),
        },
      });
    }

    // For pending envelopes — generate embedded signing URL
    const recipientRes = await fetch(
      `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authenticationMethod: 'none',
          email:                envelope.recipient_email,
          userName:             profile?.email ?? envelope.recipient_email,
          returnUrl:            `${process.env.NEXT_PUBLIC_APP_URL}/?page=agreements`,
          clientUserId:         envelope.user_id ?? user.id,
        }),
      }
    );
    const recipientData = await recipientRes.json();

    if (!recipientRes.ok) {
      return NextResponse.json({ error: recipientData.message ?? 'Could not generate signing URL' }, { status: 500 });
    }

    return NextResponse.json({ type: 'sign', url: recipientData.url });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
