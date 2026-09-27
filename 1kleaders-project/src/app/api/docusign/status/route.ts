// GET /api/docusign/status?envelope_id=xxx
// Returns current status of a DocuSign envelope (admins, or the envelope's own recipient).

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const auth = await requireCaller(req);
  if ('response' in auth) return auth.response;

  const envelopeId = req.nextUrl.searchParams.get('envelope_id');
  if (!envelopeId) return NextResponse.json({ error: 'envelope_id required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('docusign_envelopes')
    .select('*')
    .eq('envelope_id', envelopeId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { caller } = auth;
  const isOwner = data.user_id === caller.id || data.recipient_email?.toLowerCase() === caller.email.toLowerCase();
  if (!isOwner && !ADMIN_ROLES.includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(data);
}
