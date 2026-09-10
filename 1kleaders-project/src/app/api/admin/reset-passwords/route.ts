import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const { users } = await req.json();
  if (!users?.length) return NextResponse.json({ error: 'No users provided' }, { status: 400 });

  // Fetch ALL auth users across all pages
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

  let success = 0, failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    const userId = authMap.get(user.email.toLowerCase());
    if (!userId) {
      errors.push(`Not found: ${user.email}`);
      failed++;
      continue;
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: user.password });
    if (error) { errors.push(`${user.email}: ${error.message}`); failed++; }
    else success++;
  }

  return NextResponse.json({ success, failed, total: users.length, errors: errors.slice(0, 20) });
}
