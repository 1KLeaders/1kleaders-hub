// POST /api/auth/invite
// Admin-only: creates a Supabase auth user and sends them a temporary password email.
// Body: { email, first_name, last_name, role }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { email, first_name, last_name, role } = await req.json();

  if (!email || !role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  // inviteUserByEmail sends them a setup link — on first login they set their password
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { first_name, last_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/`,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  // Create their profile row immediately so RBAC works from first login
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      email,
      first_name,
      last_name,
      role,
      onboarding_status: 'Platform Access Issued',
      is_first_login: true,
    });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, user_id: authData.user.id });
}
