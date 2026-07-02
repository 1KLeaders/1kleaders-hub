// POST /api/onboarding/notify
// Called when admin updates a partner's onboarding status
// Sends appropriate SendGrid email for key status transitions
// Body: { user_id, new_status, meeting_date? }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import {
  sendKYCSubmittedEmail,
  sendKYCApprovedEmail,
  sendPaymentConfirmedEmail,
  sendMeetingScheduledEmail,
  sendAdminNotificationEmail,
} from '@/lib/sendgrid-emails';

// Which statuses trigger an email
const STATUS_EMAILS: Record<string, (email: string, firstName: string, extra?: any) => Promise<any>> = {
  'KYC Submitted':           (e, n) => sendKYCSubmittedEmail(e, n),
  'KYC Approved':            (e, n) => sendKYCApprovedEmail(e, n),
  'Payment Confirmed':       (e, n) => sendPaymentConfirmedEmail(e, n),
  'Agreement Signed':        (e, n) => sendAdminNotificationEmail(e, n, 'Agreement Signed', 'Your partnership agreement has been signed. Please log in to complete your KYC documents.'),
  'Awaiting ADGM Registration': (e, n) => sendAdminNotificationEmail(e, n, 'Awaiting ADGM Registration', 'Your file is complete and has been submitted to ADGM for registration. This typically takes 2–4 weeks.'),
  'Officially Registered Partner': (e, n) => sendAdminNotificationEmail(e, n, 'You are now an Officially Registered 1K Leaders Partner!', 'Congratulations! Your ADGM registration is complete. You are now an officially registered 1K Leaders partner.'),
};

export async function POST(req: NextRequest) {
  const { user_id, new_status, meeting_date } = await req.json();

  if (!user_id || !new_status) {
    return NextResponse.json({ error: 'user_id and new_status required' }, { status: 400 });
  }

  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, first_name')
    .eq('id', user_id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const firstName = profile.first_name ?? 'Partner';
  const email     = profile.email;

  // Meeting scheduled is special — needs the date
  if (new_status === 'Meeting Scheduled' && meeting_date) {
    try {
      const formatted = new Date(meeting_date).toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai',
      }) + ' GST';
      await sendMeetingScheduledEmail(email, firstName, formatted);
    } catch (e) {
      console.warn('Meeting scheduled email failed:', e);
    }
    return NextResponse.json({ sent: true });
  }

  // Other status emails
  const emailFn = STATUS_EMAILS[new_status];
  if (emailFn) {
    try {
      await emailFn(email, firstName);
    } catch (e) {
      console.warn(`Email for status "${new_status}" failed:`, e);
    }
  }

  return NextResponse.json({ sent: !!emailFn });
}
