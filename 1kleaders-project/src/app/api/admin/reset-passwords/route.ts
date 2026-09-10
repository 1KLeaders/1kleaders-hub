// POST /api/admin/reset-passwords
// One-time route to reset all imported user passwords via Supabase admin API
// Body: { users: [{email, password}], secret: string }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { users, secret } = await req.json();

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let success = 0, failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      // Find user by email
      const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 2000 });
      const authUser = authUsers.find(u => u.email?.toLowerCase() === user.email.toLowerCase());

      if (!authUser) {
        errors.push(`Not found: ${user.email}`);
        failed++;
        continue;
      }

      // Reset password via admin API — this uses Supabase's own hashing
      const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: user.password
      });

      if (error) {
        errors.push(`${user.email}: ${error.message}`);
        failed++;
      } else {
        success++;
      }
    } catch (e: any) {
      errors.push(`${user.email}: ${e.message}`);
      failed++;
    }

    await new Promise(r => setTimeout(r, 100));
  }

  return NextResponse.json({ success, failed, total: users.length, errors });
}
