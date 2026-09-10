// POST /api/auth/invite
// Admin-only: invites a user or approves an existing one
// Sends the same branded magic link welcome email in both cases
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const EMAIL_HTML = (firstName: string, email: string, setupLink: string) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background-color:#141414;padding:32px 40px;border-radius:12px 12px 0 0;">
<img src="https://app.1kleaders.com/logos/logos_1KL-Hub_Horizontal_Light.png" alt="1KL Hub" style="height:28px;width:auto;display:block;" />
</td></tr>
<tr><td style="background:linear-gradient(90deg,#e33b5f,#f07969);height:4px;"></td></tr>
<tr><td style="background-color:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
<h1 style="font-size:26px;font-weight:800;color:#222;margin:0 0 8px;">Welcome to 1KL Hub 👋</h1>
<p style="color:#7e7e7e;font-size:14px;margin:0 0 28px;">Your partner portal for 1000 Leaders Holdings</p>
<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Your account on the <strong>1KL Hub</strong> is ready. Click the button below to set up your password and complete your profile. The link is valid for <strong>24 hours</strong>.</p>
<div style="background:#f6f6f6;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
<p style="margin:0;font-size:13px;color:#9e9e9e;">Signing in as:</p>
<p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#222;">${email}</p>
</div>
<table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
<tr><td style="background:linear-gradient(30deg,#e33b5f,#E65F5C);border-radius:6px;">
<a href="${setupLink}" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">Set Up My Account →</a>
</td></tr>
</table>
<p style="color:#9e9e9e;font-size:13px;margin:0 0 8px;">If the button doesn't work, copy this link into your browser:</p>
<p style="color:#e33b5f;font-size:12px;word-break:break-all;margin:0 0 24px;">${setupLink}</p>
<hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px;" />
<p style="color:#9e9e9e;font-size:13px;line-height:1.6;margin:0;">Questions? <a href="mailto:info@1kleaders.com" style="color:#e33b5f;">info@1kleaders.com</a><br>© 2026 1000 Leaders Holdings Limited</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

async function sendWelcomeEmail(email: string, firstName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  // Generate magic link
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/` },
  });

  if (error || !data?.properties?.action_link) {
    console.error('Magic link generation failed:', error?.message);
    return;
  }

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'info@1kleaders.com',
      to:      email,
      subject: 'Welcome to 1KL Hub — Set Up Your Account',
      html:    EMAIL_HTML(firstName, email, data.properties.action_link),
    }),
  });
}

export async function POST(req: NextRequest) {
  const { email, first_name, last_name, role, waitlist_id } = await req.json();

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  // Check if a profile already exists with this email
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, onboarding_status, first_name')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    // User already exists — update role and send welcome email
    await supabaseAdmin.from('profiles').update({
      role,
      onboarding_status: 'Platform Access Issued',
      is_first_login: true,
    }).eq('id', existingProfile.id);

    if (waitlist_id) {
      await supabaseAdmin.from('waitlist_submissions')
        .update({ status: 'approved' }).eq('id', waitlist_id);
    }

    // Send the same welcome email with magic link
    await sendWelcomeEmail(email, existingProfile.first_name ?? first_name ?? 'Partner');

    return NextResponse.json({ success: true, user_id: existingProfile.id, existing: true });
  }

  // New user — create auth account
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { first_name, last_name, role },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create profile
  await supabaseAdmin.from('profiles').insert({
    id:                authData.user.id,
    email,
    first_name,
    last_name,
    role,
    onboarding_status: 'Platform Access Issued',
    is_first_login:    true,
  });

  if (waitlist_id) {
    await supabaseAdmin.from('waitlist_submissions')
      .update({ status: 'approved' }).eq('id', waitlist_id);
  }

  // Send welcome email with magic link
  await sendWelcomeEmail(email, first_name ?? 'Partner');

  // Auto-send DocuSign agreement
  try {
    const { getJWTAccessToken, sendEnvelope } = await import('@/lib/docusign');
    const accessToken = await getJWTAccessToken();
    const envelope = await sendEnvelope({
      accessToken,
      recipientName:  `${first_name ?? ''} ${last_name ?? ''}`.trim(),
      recipientEmail: email,
      recipientId:    authData.user.id,
      metadata:       { user_id: authData.user.id, waitlist_id: waitlist_id ?? '' },
    });
    await supabaseAdmin.from('docusign_envelopes').insert({
      envelope_id:     envelope.envelopeId,
      user_id:         authData.user.id,
      recipient_name:  `${first_name ?? ''} ${last_name ?? ''}`.trim(),
      recipient_email: email,
      status:          envelope.status,
      sent_at:         envelope.statusDateTime,
    });
    await supabaseAdmin.from('profiles').update({ onboarding_status: 'Agreement Sent' }).eq('id', authData.user.id);
  } catch (e: any) {
    console.warn('DocuSign auto-send failed:', e.message);
    // Don't block the invite if DocuSign fails
  }

  return NextResponse.json({ success: true, user_id: authData.user.id, existing: false });
}
