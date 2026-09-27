// Client-side fetch wrapper for our own /api routes — attaches the Supabase session token
// so routes can verify the caller with requireCaller() from '@/lib/api-auth'.
import { supabase } from '@/lib/supabase';

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}
