// /api/onboarding/prospects — admin-started shareholder onboarding
// POST  { first_name, last_name, email, phone?, notes? }          → create prospect + send DocuSign agreement
// PATCH { id, action: 'resend' | 'cancel' | 'create_account' }     → manage a prospect
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { getJWTAccessToken, sendEnvelope, DS_CONFIG } from '@/lib/docusign';
import { createAccountForProspect, type Prospect } from '@/lib/prospects';

async function sendAgreement(p: { id: string; first_name: string; last_name: string; email: string }) {
  const accessToken = await getJWTAccessToken();
  const recipientName = `${p.first_name} ${p.last_name}`.trim();
  const envelope = await sendEnvelope({
    accessToken, recipientName, recipientEmail: p.email, recipientId: p.id,
    metadata: { prospect_id: p.id },
  });
  await supabaseAdmin.from('docusign_envelopes').insert({
    envelope_id: envelope.envelopeId, user_id: null, recipient_name: recipientName,
    recipient_email: p.email, status: envelope.status, sent_at: envelope.statusDateTime,
  });
  return envelope.envelopeId;
}

async function voidEnvelope(envelopeId: string, reason: string) {
  const token = await getJWTAccessToken();
  const res = await fetch(`${DS_CONFIG.baseUrl}/v2.1/accounts/${DS_CONFIG.accountId}/envelopes/${envelopeId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'voided', voidedReason: reason }),
  });
  if (res.ok) await supabaseAdmin.from('docusign_envelopes').update({ status: 'voided', voided_at: new Date().toISOString(), void_reason: reason }).eq('envelope_id', envelopeId);
  return res.ok;
}

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const body = await req.json();
  const first_name = String(body.first_name ?? '').trim();
  const last_name  = String(body.last_name ?? '').trim();
  const email      = String(body.email ?? '').trim().toLowerCase();
  const phone      = String(body.phone ?? '').trim() || null;
  const notes      = String(body.notes ?? '').trim() || null;

  if (!first_name || !last_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'First name, last name and a valid email are required' }, { status: 400 });
  }

  const { data: existingProfile } = await supabaseAdmin
    .from('profiles').select('role').ilike('email', email.replace(/[%_\\]/g, '\\$&')).maybeSingle();
  if (existingProfile && ['shareholder', ...ADMIN_ROLES].includes(existingProfile.role)) {
    return NextResponse.json({ error: `${email} is already a ${existingProfile.role} on the Hub` }, { status: 409 });
  }

  const { data: prospect, error } = await supabaseAdmin.from('shareholder_prospects')
    .insert({ first_name, last_name, email, phone, notes, created_by: auth.caller.id, status: 'agreement_sent' })
    .select().single();
  if (error) {
    const dup = error.code === '23505';
    return NextResponse.json({ error: dup ? 'An agreement is already pending for this email' : error.message }, { status: dup ? 409 : 500 });
  }

  try {
    const envelopeId = await sendAgreement(prospect);
    await supabaseAdmin.from('shareholder_prospects').update({ envelope_id: envelopeId }).eq('id', prospect.id);
    return NextResponse.json({ success: true, id: prospect.id, envelope_id: envelopeId });
  } catch (e: any) {
    await supabaseAdmin.from('shareholder_prospects').update({ status: 'error', last_error: e.message }).eq('id', prospect.id);
    return NextResponse.json({ error: `Prospect saved, but DocuSign failed: ${e.message}` }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { id, action } = await req.json();
  const { data } = await supabaseAdmin.from('shareholder_prospects').select('*').eq('id', id).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  const p = data as Prospect;
  const now = new Date().toISOString();

  try {
    if (action === 'resend') {
      if (p.envelope_id && p.status === 'agreement_sent') await voidEnvelope(p.envelope_id, 'Replaced by a new agreement');
      const envelopeId = await sendAgreement(p);
      await supabaseAdmin.from('shareholder_prospects')
        .update({ envelope_id: envelopeId, status: 'agreement_sent', last_error: null, updated_at: now }).eq('id', p.id);
      return NextResponse.json({ success: true, envelope_id: envelopeId });
    }
    if (action === 'cancel') {
      if (p.envelope_id && p.status === 'agreement_sent') await voidEnvelope(p.envelope_id, 'Cancelled by 1K Leaders');
      await supabaseAdmin.from('shareholder_prospects').update({ status: 'cancelled', updated_at: now }).eq('id', p.id);
      return NextResponse.json({ success: true });
    }
    if (action === 'create_account') {
      // Manual override, e.g. the agreement was signed outside DocuSign
      const userId = await createAccountForProspect(p);
      return NextResponse.json({ success: true, user_id: userId });
    }
  } catch (e: any) {
    await supabaseAdmin.from('shareholder_prospects').update({ last_error: e.message, updated_at: now }).eq('id', p.id);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
