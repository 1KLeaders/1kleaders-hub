// POST /api/email/send
// Admin-only: send a transactional email via Resend
// Body: { to, toName?, subject, html?, text? }
import { NextRequest, NextResponse } from 'next/server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.RESEND_FROM_EMAIL ?? 'info@1kleaders.com';
const FROM_NAME      = process.env.RESEND_FROM_NAME  ?? '1K Leaders';

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: 'Resend not configured — add RESEND_API_KEY to environment variables' }, { status: 503 });
  }

  const { to, toName, subject, html, text } = await req.json();

  if (!to || !subject) {
    return NextResponse.json({ error: 'to and subject are required' }, { status: 400 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to:   toName ? `${toName} <${to}>` : to,
      subject,
      ...(html ? { html } : {}),
      ...(text ? { text } : {}),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Resend error:', data);
    return NextResponse.json({ error: `Resend error: ${data.message ?? res.status}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, messageId: data.id });
}
