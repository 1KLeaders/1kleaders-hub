// POST /api/docusign/hide
// Admin-only: hide/unhide an agreement from the platform. The envelope stays in DocuSign,
// and DocuSign sync never touches the `hidden` column, so hidden agreements stay hidden.
// Body: { envelope_id, hidden: boolean }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { envelope_id, hidden } = await req.json();
  if (!envelope_id || typeof hidden !== 'boolean') {
    return NextResponse.json({ error: 'envelope_id and hidden (boolean) required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('docusign_envelopes')
    .update({
      hidden,
      hidden_at: hidden ? new Date().toISOString() : null,
      hidden_by: hidden ? auth.caller.id : null,
    })
    .eq('envelope_id', envelope_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
