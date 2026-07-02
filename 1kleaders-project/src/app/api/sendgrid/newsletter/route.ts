// POST /api/sendgrid/newsletter
// Send a newsletter to all active platform members
// Body: { newsletter_id } — newsletter must exist in DB first
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL       = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@1kleaders.com';
const FROM_NAME        = process.env.SENDGRID_FROM_NAME  ?? '1K Leaders';
const APP_URL          = process.env.NEXT_PUBLIC_APP_URL ?? 'https://1kl-partner-hub.vercel.app';

export async function POST(req: NextRequest) {
  if (!SENDGRID_API_KEY) {
    return NextResponse.json({ error: 'SendGrid not configured' }, { status: 503 });
  }

  const { newsletter_id } = await req.json();
  if (!newsletter_id) return NextResponse.json({ error: 'newsletter_id required' }, { status: 400 });

  // Get newsletter
  const { data: nl } = await supabaseAdmin
    .from('newsletters')
    .select('*')
    .eq('id', newsletter_id)
    .single();

  if (!nl) return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });

  // Get all recipients
  const { data: recipients } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, last_name')
    .in('role', ['shareholder', 'user', 'admin', 'super-admin'])
    .not('email', 'is', null);

  if (!recipients?.length) {
    return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
  }

  // Add tracking pixel to HTML
  const trackingPixel = `<img src="${APP_URL}/api/sendgrid/track?nl=${newsletter_id}&uid={{user_id}}" width="1" height="1" style="display:none" />`;
  const bodyWithTracking = (nl.body_html ?? '') + trackingPixel;

  // Send via SendGrid
  const sendgridBody = {
    personalizations: recipients.map(r => ({
      to: [{ email: r.email, name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email }],
      dynamic_template_data: { first_name: r.first_name ?? 'Partner', user_id: r.id },
    })),
    from:    { email: FROM_EMAIL, name: FROM_NAME },
    subject: nl.subject,
    content: [{ type: 'text/html', value: bodyWithTracking }],
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(sendgridBody),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: `SendGrid error: ${err}` }, { status: 500 });
  }

  // Update newsletter record
  await supabaseAdmin.from('newsletters').update({
    status:          'sent',
    sent_at:         new Date().toISOString(),
    recipient_count: recipients.length,
    sendgrid_id:     res.headers.get('x-message-id'),
  }).eq('id', newsletter_id);

  return NextResponse.json({ success: true, sent_to: recipients.length });
}
