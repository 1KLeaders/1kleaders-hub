// Admin-started onboarding ("prospect shareholders"):
//   admin enters name/email/phone → DocuSign agreement sent → once DocuSign reports it signed,
//   an account is created automatically and a branded magic-link welcome email is sent.
//   On first login the person completes the full registration profile (profiles.needs_registration).
// Server-only (uses the service role).
import { supabaseAdmin } from '@/lib/supabase-server';
import { getJWTAccessToken, getEnvelopeStatus } from '@/lib/docusign';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.1kleaders.com';

export type Prospect = {
  id: string; first_name: string; last_name: string; email: string; phone: string | null;
  status: string; envelope_id: string | null; user_id: string | null;
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const WELCOME_HTML = (firstName: string, email: string, link: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background-color:#141414;padding:32px 40px;border-radius:12px 12px 0 0;">
<img src="${APP_URL}/logos/logos_1KL-Hub_Horizontal_Light.png" alt="1KL Hub" style="height:28px;width:auto;display:block;" />
</td></tr>
<tr><td style="background:linear-gradient(90deg,#e33b5f,#f07969);height:4px;"></td></tr>
<tr><td style="background-color:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
<h1 style="font-size:26px;font-weight:800;color:#222;margin:0 0 8px;">Welcome to 1KL Hub 👋</h1>
<p style="color:#7e7e7e;font-size:14px;margin:0 0 28px;">Thank you for signing your shareholder agreement</p>
<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${esc(firstName)},</p>
<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Your agreement with <strong>1000 Leaders Holdings</strong> is signed and your 1KL Hub account is ready. Click below to set your password and complete your profile, then finish your KYC and payment to activate your shareholding. The link is valid for <strong>24 hours</strong>.</p>
<div style="background:#f6f6f6;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
<p style="margin:0;font-size:13px;color:#9e9e9e;">Signing in as:</p>
<p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#222;">${esc(email)}</p>
</div>
<table cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td style="background:linear-gradient(30deg,#e33b5f,#E65F5C);border-radius:6px;">
<a href="${link}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">Set Up My Account →</a>
</td></tr></table>
<p style="color:#9e9e9e;font-size:13px;margin:0 0 8px;">If the button doesn't work, copy this link into your browser:</p>
<p style="color:#e33b5f;font-size:12px;word-break:break-all;margin:0 0 24px;">${link}</p>
<hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;" />
<p style="color:#9e9e9e;font-size:13px;line-height:1.6;margin:0;">Questions? <a href="mailto:info@1kleaders.com" style="color:#e33b5f;">info@1kleaders.com</a><br>© 2026 1000 Leaders Holdings Limited</p>
</td></tr></table>
</td></tr></table>
</body></html>`;

export async function sendMagicLinkWelcome(email: string, firstName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink', email, options: { redirectTo: `${APP_URL}/` },
  });
  if (error || !data?.properties?.action_link) throw new Error(`Magic link failed: ${error?.message}`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: '1K Leaders <info@1kleaders.com>', to: email,
      subject: 'Welcome to 1KL Hub — Set Up Your Account',
      html: WELCOME_HTML(firstName, email, data.properties.action_link),
    }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}

// Creates (or links) the account for a prospect whose agreement is signed. Idempotent.
export async function createAccountForProspect(p: Prospect): Promise<string> {
  const email = p.email.trim().toLowerCase();
  const now = new Date().toISOString();

  const { data: existing } = await supabaseAdmin
    .from('profiles').select('id, role').ilike('email', email.replace(/[%_\\]/g, '\\$&')).maybeSingle();

  let userId = existing?.id as string | undefined;
  if (!userId) {
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { first_name: p.first_name, last_name: p.last_name, role: 'user' },
    });
    if (error || !created?.user) throw new Error(`Could not create account: ${error?.message}`);
    userId = created.user.id;
    const { error: pErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId, email, first_name: p.first_name, last_name: p.last_name,
      phone_number: p.phone, role: 'user',
      onboarding_status: 'Agreement Signed', is_first_login: true, needs_registration: true,
    });
    if (pErr) throw new Error(`Profile insert failed: ${pErr.message}`);
  } else {
    // Existing member (e.g. a waitlist user) — keep their role, mark the agreement signed
    await supabaseAdmin.from('profiles').update({
      onboarding_status: 'Agreement Signed', phone_number: p.phone ?? undefined, updated_at: now,
    }).eq('id', userId);
  }

  if (p.envelope_id) {
    await supabaseAdmin.from('docusign_envelopes').update({ user_id: userId, status: 'completed' }).eq('envelope_id', p.envelope_id);
  }

  await supabaseAdmin.from('shareholder_prospects')
    .update({ status: 'account_created', user_id: userId, signed_at: p.status === 'agreement_sent' ? now : undefined, updated_at: now, last_error: null })
    .eq('id', p.id);

  await sendMagicLinkWelcome(email, p.first_name);
  return userId;
}

// Look up the envelope's real status at DocuSign (never trust a webhook body) and act on it.
export async function syncProspectEnvelope(p: Prospect, accessToken?: string): Promise<string> {
  if (!p.envelope_id || !['agreement_sent', 'signed'].includes(p.status)) return p.status;
  const token = accessToken ?? await getJWTAccessToken();
  const env = await getEnvelopeStatus(token, p.envelope_id);
  const dsStatus = String(env?.status ?? '').toLowerCase();
  const now = new Date().toISOString();

  await supabaseAdmin.from('docusign_envelopes').update({
    status: dsStatus || undefined,
    signed_at: env?.completedDateTime ?? undefined,
    voided_at: env?.voidedDateTime ?? undefined,
    declined_at: env?.declinedDateTime ?? undefined,
  }).eq('envelope_id', p.envelope_id);

  if (dsStatus === 'completed') {
    try {
      await createAccountForProspect({ ...p, status: 'signed' });
      return 'account_created';
    } catch (e: any) {
      await supabaseAdmin.from('shareholder_prospects')
        .update({ status: 'signed', signed_at: env?.completedDateTime ?? now, last_error: e.message, updated_at: now }).eq('id', p.id);
      return 'signed';
    }
  }
  if (dsStatus === 'declined' || dsStatus === 'voided') {
    await supabaseAdmin.from('shareholder_prospects').update({ status: dsStatus, updated_at: now }).eq('id', p.id);
    return dsStatus;
  }
  return p.status;
}

export async function syncPendingProspects() {
  const { data } = await supabaseAdmin.from('shareholder_prospects')
    .select('id, first_name, last_name, email, phone, status, envelope_id, user_id')
    .in('status', ['agreement_sent', 'signed']).not('envelope_id', 'is', null);
  const pending = (data ?? []) as Prospect[];
  if (!pending.length) return { checked: 0, created: 0 };
  const token = await getJWTAccessToken();
  let created = 0;
  for (const p of pending) {
    try { if (await syncProspectEnvelope(p, token) === 'account_created') created++; }
    catch (e: any) { console.error('Prospect sync failed', p.id, e.message); }
  }
  return { checked: pending.length, created };
}
