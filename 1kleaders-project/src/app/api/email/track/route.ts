// GET /api/sendgrid/track
// Tracking pixel endpoint — records when a newsletter is opened
// Query: ?nl=<newsletter_id>&uid=<user_id>
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const newsletterId = searchParams.get('nl');
  const userId       = searchParams.get('uid');

  if (newsletterId) {
    // Record open (ignore errors — don't block image response)
    supabaseAdmin.from('newsletter_opens').insert({
      newsletter_id: newsletterId,
      user_id:       userId ?? null,
      opened_at:     new Date().toISOString(),
    }).then(() => {});
  }

  // Return 1x1 transparent GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  return new NextResponse(gif, {
    headers: {
      'Content-Type':  'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
