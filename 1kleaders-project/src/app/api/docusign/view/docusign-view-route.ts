// GET /api/docusign/view?envelope_id=xxx
// Generates a view URL for a signed document — no DocuSign account needed
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getDocuSignToken } from '@/lib/docusign';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const envelopeId = req.nextUrl.searchParams.get('envelope_id');
  if (!envelopeId) return NextResponse.json({ error: 'envelope_id required' }, { status: 400 });

  // Verify the requesting user owns this envelope
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false }, global: { headers: { Cookie: req.headers.get('cookie') ?? '' } } }
  );
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check they own this envelope
  const { data: envelope } = await supabaseAdmin
    .from('docusign_envelopes')
    .select('envelope_id, status, recipient_email, user_id')
    .eq('envelope_id', envelopeId)
    .maybeSingle();

  if (!envelope) return NextResponse.json({ error: 'Envelope not found' }, { status: 404 });

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('email').eq('id', user.id).maybeSingle();

  const isOwner = envelope.user_id === user.id || envelope.recipient_email === profile?.email;
  if (!isOwner) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  try {
    const token = await getDocuSignToken();
    const baseUrl = process.env.DOCUSIGN_BASE_URL;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    // For completed envelopes — get document download URL
    if (envelope.status === 'completed') {
      // Get the document list
      const docsRes = await fetch(
        `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const docsData = await docsRes.json();
      const doc = docsData.envelopeDocuments?.[0];

      if (!doc) return NextResponse.json({ error: 'No document found' }, { status: 404 });

      // Return a temporary download URL
      const downloadUrl = `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/${doc.documentId}`;
      return NextResponse.json({ type: 'download', url: downloadUrl, token, doc_name: doc.name });
    }

    // For pending envelopes — generate recipient view URL (embedded signing)
    const recipientRes = await fetch(
      `${baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authenticationMethod: 'none',
          email:       envelope.recipient_email,
          userName:    profile?.email ?? envelope.recipient_email,
          returnUrl:   `${process.env.NEXT_PUBLIC_APP_URL}/?agreements=true`,
          clientUserId: envelope.user_id ?? user.id,
        }),
      }
    );
    const recipientData = await recipientRes.json();

    if (!recipientRes.ok) {
      return NextResponse.json({ error: recipientData.message ?? 'Could not generate view URL' }, { status: 500 });
    }

    return NextResponse.json({ type: 'view', url: recipientData.url });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
