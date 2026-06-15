// POST /api/auth/invite
// Admin-only: invites a user and creates their profile row.
// When status = 'approved', called automatically from the waitlist queue.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { email, first_name, last_name, role = 'user', waitlist_id } = await req.json();

  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  // Check if user already exists in auth
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const alreadyExists = existingUsers?.users?.some(u => u.email === email);

  if (alreadyExists) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
  }

  // Invite user — Supabase sends them a setup email
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/`,
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Create profile row
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      first_name: first_name || null,
      last_name: last_name || null,
      role,
      onboarding_status: 'Platform Access Issued',
      is_first_login: true,
    });

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  // If this came from the waitlist queue, mark the submission as invited
  if (waitlist_id) {
    await supabaseAdmin
      .from('waitlist_submissions')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', waitlist_id);
  }

  return NextResponse.json({ success: true, user_id: authData.user.id });
}
