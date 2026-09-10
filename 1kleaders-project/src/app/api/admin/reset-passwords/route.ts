import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { users } = await req.json();
  if (!users?.length) return NextResponse.json({ error: 'No users provided' }, { status: 400 });

  // Fetch all existing auth users
  const allAuthUsers: any[] = [];
  let page = 1;
  while (true) {
    const { data: { users: batch }, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !batch?.length) break;
    allAuthUsers.push(...batch);
    if (batch.length < 1000) break;
    page++;
  }
  const authMap = new Map(allAuthUsers.map(u => [u.email?.toLowerCase(), u.id]));

  let created = 0, updated = 0, failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const emailLower = user.email.toLowerCase();
    const existingId = authMap.get(emailLower);

    try {
      if (existingId) {
        // Auth user exists — just reset password
        const { error } = await supabaseAdmin.auth.admin.updateUserById(existingId, {
          password: user.password
        });
        if (error) { errors.push(`update ${user.email}: ${error.message}`); failed++; }
        else updated++;
      } else {
        // Auth user doesn't exist — create it
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email:          user.email,
          password:       user.password,
          email_confirm:  true,
          user_metadata:  { first_name: user.first_name ?? '', last_name: user.last_name ?? '' },
        });

        if (error) { errors.push(`create ${user.email}: ${error.message}`); failed++; continue; }

        // Link to existing profile if it exists
        const { data: profile } = await supabaseAdmin
          .from('profiles').select('id').eq('email', emailLower).maybeSingle();

        if (profile) {
          // Update profile id to match new auth user
          await supabaseAdmin.from('profiles').update({ id: data.user.id }).eq('email', emailLower);
        } else {
          // Create profile
          await supabaseAdmin.from('profiles').insert({
            id: data.user.id, email: user.email,
            first_name: user.first_name ?? '', last_name: user.last_name ?? '',
            role: 'shareholder', onboarding_status: 'Platform Access Issued', is_first_login: true,
          });
        }
        created++;
      }
    } catch (e: any) {
      errors.push(`${user.email}: ${e.message}`);
      failed++;
    }
  }

  return NextResponse.json({
    created, updated, failed, total: users.length,
    errors: errors.slice(0, 10)
  });
}
