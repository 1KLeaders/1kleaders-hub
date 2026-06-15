import { createClient } from '@supabase/supabase-js';

// Server-side client using service role key — bypasses RLS for admin operations.
// NEVER import this in client components — only use in API routes (/app/api/).
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
