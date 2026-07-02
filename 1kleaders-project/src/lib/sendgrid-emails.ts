// Centralised SendGrid email helpers
// Import and call these from API routes whenever an email needs sending

const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1kl-partner-hub.vercel.app';
const FROM_EMAIL   = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@1kleaders.com';
const FROM_NAME    = process.env.SENDGRID_FROM_NAME  ?? '1K Leaders';
const API_KEY      = process.env.SENDGRID_API_KEY;

async function sendEmail(to: string, toName: string, subject: string, html: string) {
  if (!API_KEY) {
    console.warn('SendGrid not configured — skipping email to', to);
    return { skipped: true };
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to, name: toName }] }],
      from:    { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('SendGrid error:', res.status, err);
    throw new Error(`SendGrid error ${res.status}`);
  }
  return { sent: true, messageId: res.headers.get('x-message-id') };
}

function base(content: string, title: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f6f6;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#e33b5f;padding:24px 32px">
    <img src="${APP_URL}/logo-light-mid.png" alt="1K Leaders" style="height:36px;object-fit:contain" />
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 16px;color:#222;font-size:20px">${title}</h2>
    ${content}
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0" />
    <p style="margin:0;color:#9e9e9e;font-size:12px">
      © 2025 1KL Holdings Limited · ADGM Registration No: 34946<br>
      <a href="${APP_URL}" style="color:#e33b5f">Visit Platform</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

// ── EMAILS ────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'Welcome to 1K Leaders', base(`
    <p style="color:#555;line-height:1.6">Hi ${firstName},</p>
    <p style="color:#555;line-height:1.6">Welcome to the 1K Leaders Partner Hub. Your account has been created and you can now access the platform.</p>
    <div style="margin:24px 0">
      <a href="${APP_URL}" style="background:#e33b5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
        Access the Platform →
      </a>
    </div>
    <p style="color:#555;line-height:1.6">If you have any questions, don't hesitate to reach out to the team.</p>
    <p style="color:#555">The 1K Leaders Team</p>
  `, 'Welcome to 1K Leaders'));
}

export async function sendAgreementEmail(to: string, firstName: string, envelopeId: string) {
  return sendEmail(to, firstName, 'Your Partnership Agreement is Ready for Signature', base(`
    <p style="color:#555;line-height:1.6">Hi ${firstName},</p>
    <p style="color:#555;line-height:1.6">Your partnership agreement with 1K Leaders is ready for your review and signature.</p>
    <p style="color:#555;line-height:1.6">Please check your email from DocuSign to sign the agreement. Once signed, your onboarding will proceed to the next step.</p>
    <div style="background:#f6f6f6;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#7e7e7e;font-size:12px">Reference: ${envelopeId}</p>
    </div>
    <p style="color:#555">The 1K Leaders Team</p>
  `, 'Partnership Agreement Ready'));
}

export async function sendAgreementSignedEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'Agreement Signed — Next Steps', base(`
    <p style="color:#555;line-height:1.6">Hi ${firstName},</p>
    <p style="color:#555;line-height:1.6">Thank you for signing your partnership agreement. You now have full access to the 1K Leaders platform.</p>
    <p style="color:#555;line-height:1.6"><strong>Your next steps:</strong></p>
    <ol style="color:#555;line-height:2">
      <li>Complete your profile</li>
      <li>Upload your KYC documents</li>
      <li>Submit your payment receipt</li>
    </ol>
    <div style="margin:24px 0">
      <a href="${APP_URL}" style="background:#e33b5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
        Go to Platform →
      </a>
    </div>
    <p style="color:#555">The 1K Leaders Team</p>
  `, 'Agreement Signed — Welcome!'));
}

export async function sendKYCSubmittedEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'KYC Documents Received', base(`
    <p style="color:#555;line-height:1.6">Hi ${firstName},</p>
    <p style="color:#555;line-height:1.6">We have received your KYC documents. Our compliance team will review them within 2–5 business days.</p>
    <p style="color:#555;line-height:1.6">You will be notified once the review is complete. In the meantime, you can track your status on the platform.</p>
    <div style="margin:24px 0">
      <a href="${APP_URL}" style="background:#e33b5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
        Check Status →
      </a>
    </div>
    <p style="color:#555">The 1K Leaders Team</p>
  `, 'KYC Documents Received'));
}

export async function sendKYCApprovedEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'KYC Approved — Please Submit Payment', base(`
    <p style="color:#555;line-height:1.6">Hi ${firstName},</p>
    <p style="color:#555;line-height:1.6">Great news — your KYC documents have been approved!</p>
    <p style="color:#555;line-height:1.6">Your next step is to submit your partner fee payment. Please complete the bank transfer and upload your payment receipt on the platform.</p>
    <div style="margin:24px 0">
      <a href="${APP_URL}" style="background:#e33b5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
        Submit Payment Receipt →
      </a>
    </div>
    <p style="color:#555">The 1K Leaders Team</p>
  `, 'KYC Approved'));
}

export async function sendPaymentConfirmedEmail(to: string, firstName: string) {
  return sendEmail(to, firstName, 'Payment Confirmed — Awaiting ADGM Registration', base(`
    <p style="color:#555;line-height:1.6">Hi ${firstName},</p>
    <p style="color:#555;line-height:1.6">Your payment has been received and confirmed. Thank you!</p>
    <p style="color:#555;line-height:1.6">Your file has now been submitted for ADGM registration. This process typically takes 2–4 weeks. You will be notified once registration is complete.</p>
    <div style="background:#f6f6f6;border-radius:8px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#555;font-size:14px">🎉 You're almost officially a 1K Leaders partner!</p>
    </div>
    <p style="color:#555">The 1K Leaders Team</p>
  `, 'Payment Confirmed'));
}

export async function sendMeetingScheduledEmail(to: string, firstName: string, meetingDate: string) {
  return sendEmail(to, firstName, 'Your Intro Meeting has been Scheduled', base(`
    <p style="color:#555;line-height:1.6">Hi ${firstName},</p>
    <p style="color:#555;line-height:1.6">Your introductory meeting with the 1K Leaders team has been scheduled.</p>
    <div style="background:#e33b5f/10;border-left:4px solid #e33b5f;padding:12px 16px;margin:16px 0;background:#fff5f7">
      <p style="margin:0;font-weight:bold;color:#222">${meetingDate}</p>
    </div>
    <p style="color:#555;line-height:1.6">Please add this to your calendar. A Teams/Zoom link will be shared separately if applicable.</p>
    <p style="color:#555">The 1K Leaders Team</p>
  `, 'Meeting Scheduled'));
}

export async function sendAdminNotificationEmail(to: string, toName: string, subject: string, message: string) {
  return sendEmail(to, toName, subject, base(`
    <p style="color:#555;line-height:1.6">Hi ${toName},</p>
    <p style="color:#555;line-height:1.6">${message}</p>
    <div style="margin:24px 0">
      <a href="${APP_URL}" style="background:#e33b5f;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
        Go to Platform →
      </a>
    </div>
    <p style="color:#555">The 1K Leaders Team</p>
  `, subject));
}
