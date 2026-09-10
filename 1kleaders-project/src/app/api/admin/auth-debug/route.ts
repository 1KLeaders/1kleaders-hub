import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email required' });

  // Try magic link directly — this is all that matters
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
    magiclink_works:  !!magicData?.properties?.action_link,
    magiclink_error:  magicErr?.message ?? null,
    magiclink_status: magicErr?.status ?? null,
    recovery_works:   !!recData?.properties?.action_link,
    recovery_error:   recErr?.message ?? null,
    preview:          magicData?.properties?.action_link?.slice(0, 100) ?? null,
  });
}
