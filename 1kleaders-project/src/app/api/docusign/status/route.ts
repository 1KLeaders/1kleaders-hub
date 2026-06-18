// GET /api/docusign/status?envelope_id=xxx
// Returns current status of a DocuSign envelope.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const envelopeId = req.nextUrl.searchParams.get('envelope_id');
  if (!envelopeId) return NextResponse.json({ error: 'envelope_id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('docusign_envelopes')
    .select('*')
    .eq('envelope_id', envelopeId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
