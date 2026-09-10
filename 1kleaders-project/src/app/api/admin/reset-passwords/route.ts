// POST /api/admin/reset-passwords
// Resets passwords for all imported users via Supabase admin API
// Protected by CRON_SECRET since cookie auth doesn't work reliably in some contexts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { users } = body;

  if (!users?.length) return NextResponse.json({ error: 'No users provided' }, { status: 400 });

  let success = 0, failed = 0;
  const errors: string[] = [];

  // Fetch all auth users once to build a lookup map
  const { data: { users: allAuthUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1, perPage: 2000
  });

  if (listError) {
    return NextResponse.json({ error: `Failed to list users: ${listError.message}` }, { status: 500 });
  }

  const authMap = new Map(allAuthUsers.map(u => [u.email?.toLowerCase(), u.id]));

  for (const user of users) {
    const userId = authMap.get(user.email.toLowerCase());
    if (!userId) {
      errors.push(`Not found: ${user.email}`);
      failed++;
      continue;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: user.password
    });

    if (error) {
      errors.push(`${user.email}: ${error.message}`);
      failed++;
    } else {
      success++;
    }
  }

  return NextResponse.json({ success, failed, total: users.length, errors: errors.slice(0, 10) });
}
