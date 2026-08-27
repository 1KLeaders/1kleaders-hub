// Centralised Resend email helpers — drop-in replacement for sendgrid-emails.ts
// All routes that import from '@/lib/sendgrid-emails' should be updated to '@/lib/resend-emails'

const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.1kleaders.com';
const FROM_EMAIL = 'info@1kleaders.com';
const FROM_NAME  = '1K Leaders';
const API_KEY    = process.env.RESEND_API_KEY;

async function sendEmail(to: string, toName: string, subject: string, html: string) {
  if (!API_KEY) {
    console.warn('RESEND_API_KEY not configured — skipping email to', to);
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      toName ? `${toName} <${to}>` : to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    console.error('Resend error:', res.status, err);
    throw new Error(`Resend error ${res.status}: ${err.message ?? JSON.stringify(err)}`);
  }
  const data = await res.json();
  return { sent: true, id: data.id };
}

function base(content: string, title: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f6f6f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f6f6;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background-color:#141414;padding:32px 40px;border-radius:12px 12px 0 0;">
<img src="${APP_URL}/logos/logos_1KL-Hub_Horizontal_Light.png" alt="1KL Hub" style="height:28px;width:auto;display:block;" />
</td></tr>
<tr><td style="background:linear-gradient(90deg,#e33b5f,#f07969);height:4px;"></td></tr>
<tr><td style="background-color:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
<h2 style="font-size:22px;font-weight:800;color:#222;margin:0 0 20px;">${title}</h2>
${content}
<hr style="border:none;border-top:1px solid #f0f0f0;margin:28px 0 20px;" />
<p style="color:#9e9e9e;font-size:12px;line-height:1.6;margin:0;">
  Questions? <a href="mailto:info@1kleaders.com" style="color:#e33b5f;">info@1kleaders.com</a><br>
  © 2026 1000 Leaders Holdings Limited · Abu Dhabi Global Market, UAE
</p>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;">
  <a href="${APP_URL}" style="color:#9e9e9e;font-size:12px;text-decoration:none;">app.1kleaders.com</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function btn(url: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background:linear-gradient(30deg,#e33b5f,#E65F5C);border-radius:6px;">
<a href="${url}" style="display:inline-block;padding:13px 26px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">${label}</a>
</td></tr></table>`;
}

// ── EMAILS ────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'Welcome to 1KL Hub', base(`
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px;">Welcome to the <strong>1KL Hub</strong> — the partner platform for 1000 Leaders Holdings. Your account is ready and you can now access the platform.</p>
    ${btn(APP_URL, 'Sign In to 1KL Hub →')}
    <p style="color:#7e7e7e;font-size:14px;line-height:1.6;margin:0;">If you have any questions, don't hesitate to reach out to the team.</p>
  `, 'Welcome to 1KL Hub 👋'));
}

export async function sendAgreementEmail(to: string, firstName: string, envelopeId: string) {
  return sendEmail(to, firstName, 'Your Partnership Agreement is Ready', base(`
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px;">Your partnership agreement with 1K Leaders is ready for your review and signature. Please check your email from DocuSign to complete signing.</p>
    <div style="background:#f6f6f6;border-radius:8px;padding:14px 16px;margin:0 0 20px;">
      <p style="margin:0;color:#9e9e9e;font-size:12px;">Reference: ${envelopeId}</p>
    </div>
    ${btn(APP_URL, 'View on 1KL Hub →')}
  `, 'Partnership Agreement Ready'));
}

export async function sendAgreementSignedEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'Agreement Signed — Next Steps', base(`
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Thank you for signing your partnership agreement. You now have full access to the 1KL Hub.</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 8px;"><strong>Your next steps:</strong></p>
    <ol style="color:#555;font-size:14px;line-height:2;margin:0 0 20px;">
      <li>Complete your profile</li>
      <li>Upload your KYC documents</li>
      <li>Submit your payment receipt</li>
    </ol>
    ${btn(APP_URL, 'Go to Platform →')}
  `, 'Agreement Signed — Welcome!'));
}

export async function sendKYCSubmittedEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'KYC Documents Received', base(`
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px;">We have received your KYC documents. Our compliance team will review them within 2–5 business days and you will be notified once the review is complete.</p>
    ${btn(APP_URL, 'Check Status →')}
  `, 'KYC Documents Received'));
}

export async function sendKYCApprovedEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'KYC Approved — Please Submit Payment', base(`
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px;">Great news — your KYC documents have been approved! Your next step is to submit your partner fee payment. Please complete the bank transfer and upload your payment receipt on the platform.</p>
    ${btn(APP_URL, 'Submit Payment Receipt →')}
  `, 'KYC Approved ✓'));
}

export async function sendPaymentConfirmedEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'Payment Confirmed', base(`
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Your payment has been received and confirmed. Thank you!</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px;">Your file has been submitted for ADGM registration. This typically takes 2–4 weeks — you will be notified once complete.</p>
    <div style="background:#f0fdf4;border-radius:8px;padding:14px 16px;margin:0 0 20px;">
      <p style="margin:0;color:#16a34a;font-size:14px;">🎉 You're almost officially a 1K Leaders partner!</p>
    </div>
    ${btn(APP_URL, 'Go to Platform →')}
  `, 'Payment Confirmed ✓'));
}

export async function sendMeetingScheduledEmail(to: string, firstName: string, meetingDate: string) {
  return sendEmail(to, firstName, 'Your Intro Meeting has been Scheduled', base(`
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Your introductory meeting with the 1K Leaders team has been scheduled.</p>
    <div style="border-left:4px solid #e33b5f;padding:12px 16px;margin:0 0 20px;background:#fff5f7;border-radius:0 8px 8px 0;">
      <p style="margin:0;font-weight:700;color:#222;font-size:15px;">${meetingDate}</p>
    </div>
    <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 20px;">Please add this to your calendar. A Teams link will be shared separately if applicable.</p>
    ${btn(APP_URL, 'View Calendar →')}
  `, 'Meeting Scheduled'));
}

export async function sendAdminNotificationEmail(to: string, toName: string, subject: string, message: string) {
  return sendEmail(to, toName, subject, base(`
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi ${toName},</p>
    <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px;">${message}</p>
    ${btn(APP_URL, 'Go to Platform →')}
  `, subject));
}
