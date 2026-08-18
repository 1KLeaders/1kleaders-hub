// POST /api/auth/invite
// Admin-only: invites a user or approves an existing one
// Body: { email, first_name, last_name, role, waitlist_id? }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { email, first_name, last_name, role, waitlist_id } = await req.json();

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  // Check if a profile already exists with this email
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, onboarding_status')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    // User already exists — just update their profile to approved status
    await supabaseAdmin
      .from('profiles')
      .update({
        role,
        onboarding_status: 'Platform Access Issued',
      })
      .eq('id', existingProfile.id);

    // Update waitlist entry if provided
    if (waitlist_id) {
      await supabaseAdmin
        .from('waitlist_submissions')
        .update({ status: 'approved' })
        .eq('id', waitlist_id);
    }

    return NextResponse.json({
      success: true,
      user_id: existingProfile.id,
      existing: true,
      message: 'Existing account approved — no invite email sent.',
    });
  }

  // No existing user — send invite email
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/`,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create their profile row
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id:                authData.user.id,
      email,
      first_name,
      last_name,
      role,
      onboarding_status: 'Platform Access Issued',
      is_first_login:    true,
    });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Update waitlist entry if provided
  if (waitlist_id) {
    await supabaseAdmin
      .from('waitlist_submissions')
      .update({ status: 'approved' })
      .eq('id', waitlist_id);
  }

  return NextResponse.json({ success: true, user_id: authData.user.id, existing: false });
}
