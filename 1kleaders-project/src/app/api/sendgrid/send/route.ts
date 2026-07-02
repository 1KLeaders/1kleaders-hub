// POST /api/sendgrid/send
// Send a transactional email via SendGrid
// Body: { to, toName, subject, html, templateId?, templateData? }
import { NextRequest, NextResponse } from 'next/server';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL       = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@1kleaders.com';
const FROM_NAME        = process.env.SENDGRID_FROM_NAME  ?? '1K Leaders';

export async function POST(req: NextRequest) {
  if (!SENDGRID_API_KEY) {
    return NextResponse.json({ error: 'SendGrid not configured — add SENDGRID_API_KEY to environment variables' }, { status: 503 });
  }

  const { to, toName, subject, html, text, templateId, templateData } = await req.json();

  if (!to || !subject) {
    return NextResponse.json({ error: 'to and subject are required' }, { status: 400 });
  }

  const body: Record<string, any> = {
    personalizations: [{ to: [{ email: to, name: toName ?? to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
  };

  if (templateId) {
    body.template_id = templateId;
    body.personalizations[0].dynamic_template_data = templateData ?? {};
  } else {
    body.content = [
      ...(text  ? [{ type: 'text/plain', value: text  }] : []),
      ...(html   ? [{ type: 'text/html',  value: html  }] : []),
    ];
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('SendGrid error:', err);
    return NextResponse.json({ error: `SendGrid error: ${res.status}` }, { status: 500 });
  }

  // SendGrid returns 202 Accepted with no body on success
  return NextResponse.json({ success: true, messageId: res.headers.get('x-message-id') });
}
