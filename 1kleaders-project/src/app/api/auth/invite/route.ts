// POST /api/auth/invite
// Creates a Supabase auth user, profile, and sends a welcome email via SendGrid
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendWelcomeEmail } from '@/lib/sendgrid-emails';

export async function POST(req: NextRequest) {
  const { email, first_name, last_name, role = 'user', waitlist_id } = await req.json();

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  // Check if already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  if (existingUsers?.users?.some(u => u.email === email)) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
  }

  // Invite via Supabase (sends their setup email)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/`,
  });
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Upsert profile
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id:                authData.user.id,
    email,
    first_name:        first_name || null,
    last_name:         last_name  || null,
    role,
    onboarding_status: 'Meeting Completed',
    is_first_login:    true,
  }, { onConflict: 'id' });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  // Mark waitlist as approved
  if (waitlist_id) {
    await supabaseAdmin.from('waitlist_submissions').update({
      status: 'approved', reviewed_at: new Date().toISOString(),
    }).eq('id', waitlist_id);
  }

  // Send welcome email via SendGrid
  try {
    await sendWelcomeEmail(email, first_name || 'Partner');
  } catch (e) {
    console.warn('Welcome email failed (non-fatal):', e);
  }

  return NextResponse.json({ success: true, user_id: authData.user.id });
}
