// POST /api/auth/reset-password
// Public: sends the branded Resend password-reset email (replaces Supabase's default recovery email).
// Always responds with success so the endpoint can't be used to discover which emails have accounts.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { sendPasswordResetEmail } from '@/lib/resend-emails';

// Best-effort throttle per email (per server instance) to stop the button being spammed
const lastSent = new Map<string, number>();
const THROTTLE_MS = 60_000;

export async function POST(req: NextRequest) {
  const { email: rawEmail } = await req.json().catch(() => ({}));
  const email = String(rawEmail ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const now = Date.now();
  if (now - (lastSent.get(email) ?? 0) < THROTTLE_MS) return NextResponse.json({ success: true });
  lastSent.set(email, now);

  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('first_name').ilike('email', email.replace(/[%_\\]/g, '\\$&')).maybeSingle();

    if (profile) {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/?reset=1` },
      });
      if (error || !data?.properties?.action_link) {
        console.error('Recovery link generation failed:', error?.message);
      } else {
        await sendPasswordResetEmail(email, profile.first_name ?? 'Partner', data.properties.action_link);
      }
    }
  } catch (e: any) {
    console.error('Password reset email failed:', e.message);
  }

  return NextResponse.json({ success: true });
}
