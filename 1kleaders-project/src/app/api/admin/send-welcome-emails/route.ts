// POST /api/admin/send-welcome-emails
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
<tr><td style="padding:24px 0;text-align:center;">
<p style="color:#9e9e9e;font-size:12px;margin:0;">© 2026 1000 Leaders Holdings Limited · Abu Dhabi Global Market, UAE</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

export async function POST(req: NextRequest) {
  const { users } = await req.json();
  if (!users?.length) return NextResponse.json({ error: 'No users provided' }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

  let sent = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Try magic link first
      let setupLink: string | null = null;

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/` },
      });

      if (!linkError && linkData?.properties?.action_link) {
        setupLink = linkData.properties.action_link;
      } else {
        // If magic link fails (user may not exist in auth yet), use recovery link
        const { data: recData, error: recError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: user.email,
          options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/` },
        });
        if (!recError && recData?.properties?.action_link) {
          setupLink = recData.properties.action_link;
        }
      }

      if (!setupLink) {
        errors.push(`${user.email}: Could not generate link — ${linkError?.message}`);
        continue;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'info@1kleaders.com',
          to:      user.email,
          subject: 'Welcome to 1KL Hub — Set Up Your Account',
          html:    EMAIL_HTML(user.first_name ?? 'Partner', user.email, setupLink),
        }),
      });

      if (res.ok) {
        sent++;
        await supabaseAdmin.from('profiles')
          .update({ welcome_email_sent: true })
          .eq('email', user.email);
      } else {
        const d = await res.json();
        errors.push(`${user.email}: ${d.message ?? res.status}`);
      }
    } catch (e: any) {
      errors.push(`${user.email}: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  return NextResponse.json({ sent, total: users.length, errors });
}
