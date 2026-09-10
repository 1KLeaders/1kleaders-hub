import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { users } = await req.json();
  if (!users?.length) return NextResponse.json({ error: 'No users provided' }, { status: 400 });

  // Get all existing auth users
  const allAuthUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data: { users: batch } } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (!batch?.length) break;
    allAuthUsers.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }
  const authMap = new Map(allAuthUsers.map(u => [u.email?.toLowerCase(), u]));

  let recreated = 0, updated = 0, failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const emailLower = user.email.toLowerCase();
    const existing = authMap.get(emailLower);

    try {
      if (existing) {
        // Delete the broken SQL-created account
        await supabaseAdmin.auth.admin.deleteUser(existing.id);
      }

      // Get profile data before recreating
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', emailLower)
        .maybeSingle();

      // Recreate via admin API — this creates a proper Supabase auth account
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email:         user.email,
        password:      user.password,
        email_confirm: true,
        user_metadata: {
          first_name: profile?.first_name ?? user.first_name ?? '',
          last_name:  profile?.last_name  ?? user.last_name  ?? '',
        },
      });

      if (createErr) {
        errors.push(`${user.email}: ${createErr.message}`);
        failed++;
        continue;
      }

      // Update profile to use new auth user ID
      if (profile) {
        await supabaseAdmin.from('profiles')
          .update({ id: newUser.user.id })
          .eq('email', emailLower);
      } else {
        await supabaseAdmin.from('profiles').insert({
          id:                newUser.user.id,
          email:             user.email,
          first_name:        user.first_name ?? '',
          last_name:         user.last_name  ?? '',
          role:              'shareholder',
          onboarding_status: 'Platform Access Issued',
          is_first_login:    true,
        });
      }

      existing ? recreated++ : updated++;

    } catch (e: any) {
      errors.push(`${user.email}: ${e.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 150));
  }

  return NextResponse.json({
    recreated, updated, failed, total: users.length,
    errors: errors.slice(0, 10)
  });
}
