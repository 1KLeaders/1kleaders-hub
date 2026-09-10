// GET /api/admin/auth-debug?email=xxx
// Returns the actual error from generateLink for a specific user
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email required' });

  // Check if user exists in auth
  const { data: { users }, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

  // Try generating magic link
  const { data: magicData, error: magicErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/` },
  });

  // Try recovery link
  const { data: recData, error: recErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/` },
  });

  return NextResponse.json({
    auth_user_exists:      !!authUser,
    auth_user_id:          authUser?.id,
    auth_user_confirmed:   authUser?.email_confirmed_at,
    auth_user_created_at:  authUser?.created_at,
    magiclink_error:       magicErr?.message ?? null,
    magiclink_works:       !!magicData?.properties?.action_link,
    recovery_error:        recErr?.message ?? null,
    recovery_works:        !!recData?.properties?.action_link,
  });
}
