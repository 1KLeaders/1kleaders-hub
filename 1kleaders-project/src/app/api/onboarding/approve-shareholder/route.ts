// POST /api/onboarding/approve-shareholder
// Admin-only. Final onboarding step: after KYC + payment receipt are in.
//   { user_id, action: 'approve' }                 → approves submitted KYC docs + receipt, role → shareholder
//   { user_id, action: 'reject_receipt', reason }  → receipt rejected; member is asked to upload again
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { requireCaller, ADMIN_ROLES } from '@/lib/api-auth';
import { sendPaymentConfirmedEmail, sendAdminNotificationEmail } from '@/lib/resend-emails';

export async function POST(req: NextRequest) {
  const auth = await requireCaller(req, ADMIN_ROLES);
  if ('response' in auth) return auth.response;

  const { user_id, action, reason } = await req.json();
  if (!user_id || !['approve', 'reject_receipt'].includes(action)) {
    return NextResponse.json({ error: 'user_id and action (approve | reject_receipt) required' }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('id, email, first_name, role').eq('id', user_id).maybeSingle();
  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const now = new Date().toISOString();

  if (action === 'reject_receipt') {
    await supabaseAdmin.from('kyc_documents')
      .update({ status: 'rejected', rejection_reason: reason || 'Receipt could not be verified', reviewed_by: auth.caller.id, reviewed_at: now })
      .eq('user_id', user_id).eq('doc_type', 'payment-receipt');
    await supabaseAdmin.from('profiles').update({ onboarding_status: 'KYC Submitted', updated_at: now }).eq('id', user_id);
    await supabaseAdmin.from('notifications').insert({
      user_id, title: 'Payment receipt needs attention', notification_type: 'warning', is_read: false, action_url: 'page:onboarding',
      message: `We couldn't verify your payment receipt${reason ? `: ${reason}` : ''}. Please upload it again on the KYC & Onboarding page.`,
    });
    // Awaited: Vercel may stop the function as soon as the response is sent
    await sendAdminNotificationEmail(profile.email, profile.first_name ?? 'Partner', 'Payment receipt needs attention',
      `We couldn't verify your payment receipt${reason ? `: ${reason}` : ''}. Please sign in to 1KL Hub and upload it again on the KYC & Onboarding page.`)
      .catch(e => console.warn('Receipt rejection email failed:', e.message));
    return NextResponse.json({ success: true });
  }

  // Approve: need a receipt on file
  const { data: receipt } = await supabaseAdmin
    .from('kyc_documents').select('id, status').eq('user_id', user_id).eq('doc_type', 'payment-receipt').maybeSingle();
  if (!receipt) return NextResponse.json({ error: 'No payment receipt uploaded yet' }, { status: 400 });

  await supabaseAdmin.from('kyc_documents')
    .update({ status: 'approved', rejection_reason: null, reviewed_by: auth.caller.id, reviewed_at: now })
    .eq('user_id', user_id).in('status', ['submitted', 'pending', 'under-review']);

  const newRole = ADMIN_ROLES.includes(profile.role) ? profile.role : 'shareholder';
  const { error } = await supabaseAdmin.from('profiles')
    .update({ role: newRole, onboarding_status: 'Payment Confirmed', updated_at: now })
    .eq('id', user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('notifications').insert({
    user_id, title: '🎉 Welcome, Shareholder!', notification_type: 'success', is_read: false, action_url: 'page:dashboard',
    message: 'Your KYC and payment have been approved. You are now a 1K Leaders shareholder with full access to the Hub.',
  });
  await sendPaymentConfirmedEmail(profile.email, profile.first_name ?? 'Partner')
    .catch(e => console.warn('Payment confirmed email failed:', e.message));

  return NextResponse.json({ success: true, role: newRole });
}
