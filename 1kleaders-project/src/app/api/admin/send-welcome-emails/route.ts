// POST /api/admin/send-welcome-emails
// Sends branded welcome emails to imported users via SendGrid
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const EMAIL_TEMPLATE = `<!DOCTYPE html>
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
<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi {{FIRST_NAME}},</p>
<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 24px;">Your account has been created on the <strong>1KL Hub</strong> — the partner platform for 1000 Leaders Holdings. You can now access your ideas, agreements, calendar, and more.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;border-radius:8px;padding:20px;margin-bottom:28px;">
<tr><td>
<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#9e9e9e;text-transform:uppercase;letter-spacing:1px;">Your Login Details</p>
<p style="margin:0 0 4px;font-size:15px;color:#222;"><strong>Email:</strong> {{EMAIL}}</p>
<p style="margin:0;font-size:15px;color:#222;"><strong>Temporary Password:</strong> <span style="font-family:monospace;background:#fff;padding:2px 8px;border-radius:4px;border:1px solid #e8e8e8;">{{TEMP_PASSWORD}}</span></p>
</td></tr>
</table>
<p style="color:#7e7e7e;font-size:13px;margin:0 0 24px;">⚠️ You will be asked to change your password on first login.</p>
<table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
<tr><td style="background:linear-gradient(30deg,#e33b5f,#E65F5C);border-radius:6px;">
<a href="https://app.1kleaders.com" style="display:inline-block;padding:14px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">Sign In to 1KL Hub →</a>
</td></tr>
</table>
<hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 24px;" />
<p style="color:#9e9e9e;font-size:13px;line-height:1.6;margin:0;">Questions? Contact us at <a href="mailto:info@1kleaders.com" style="color:#e33b5f;">info@1kleaders.com</a><br>This email was sent by 1000 Leaders Holdings Limited.</p>
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
  // users: [{ email, first_name, temp_password }]
  if (!users?.length) return NextResponse.json({ error: 'No users provided' }, { status: 400 });

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? 'info@1kleaders.com';
  const fromName  = process.env.SENDGRID_FROM_NAME  ?? '1K Leaders';

  let sent = 0;
  const errors: string[] = [];

  for (const user of users) {
    const html = EMAIL_TEMPLATE
      .replace(/{{FIRST_NAME}}/g, user.first_name ?? 'Partner')
      .replace(/{{EMAIL}}/g, user.email)
      .replace(/{{TEMP_PASSWORD}}/g, user.temp_password);

    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: user.email, name: `${user.first_name} ${user.last_name ?? ''}`.trim() }] }],
          from: { email: fromEmail, name: fromName },
          subject: 'Welcome to 1KL Hub — Your Account is Ready',
          content: [{ type: 'text/html', value: html }],
        }),
      });

      if (res.ok) {
        sent++;
        // Mark as welcome email sent in DB
        await supabaseAdmin.from('profiles')
          .update({ welcome_email_sent: true })
          .eq('email', user.email);
      } else {
        const err = await res.json();
        errors.push(`${user.email}: ${err.errors?.[0]?.message ?? res.status}`);
      }
    } catch (e: any) {
      errors.push(`${user.email}: ${e.message}`);
    }

    // Rate limit: SendGrid allows 100/sec, but be safe
    await new Promise(r => setTimeout(r, 50));
  }

  return NextResponse.json({ sent, total: users.length, errors });
}
