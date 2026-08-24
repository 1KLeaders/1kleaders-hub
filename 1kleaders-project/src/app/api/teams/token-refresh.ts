// Shared utility — refreshes Teams token if expired or about to expire
import { supabaseAdmin } from '@/lib/supabase-server';

export async function getValidTeamsToken(): Promise<{ access_token: string; user_id: string } | null> {
  const { data: conn } = await supabaseAdmin
    .from('teams_connections')
    .select('access_token, refresh_token, expires_at, ms_user_id, email')
    .eq('connected', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn?.access_token) return null;

  // Check if token expires within 10 minutes — refresh proactively
  const expiresAt = conn.expires_at ? new Date(conn.expires_at) : null;
  const tenMinsFromNow = new Date(Date.now() + 10 * 60 * 1000);
  const needsRefresh = !expiresAt || expiresAt < tenMinsFromNow;

  if (!needsRefresh) {
    return { access_token: conn.access_token, user_id: conn.ms_user_id };
  }

  if (!conn.refresh_token) {
    console.warn('Teams token expired and no refresh token stored');
    return null;
  }

  // Refresh the token
  try {
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: conn.refresh_token,
        client_id:     process.env.TEAMS_CLIENT_ID!,
        client_secret: process.env.TEAMS_CLIENT_SECRET!,
        scope:         'https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/OnlineMeetings.ReadWrite https://graph.microsoft.com/OnlineMeetings.Read offline_access',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      console.error('Token refresh failed:', data);
      return null;
    }

    // Save new tokens
    const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
    await supabaseAdmin.from('teams_connections')
      .update({
        access_token:  data.access_token,
        refresh_token: data.refresh_token ?? conn.refresh_token,
        expires_at:    newExpiry,
      })
      .eq('ms_user_id', conn.ms_user_id);

    console.log('Teams token refreshed, new expiry:', newExpiry);
    return { access_token: data.access_token, user_id: conn.ms_user_id };
  } catch (err) {
    console.error('Token refresh error:', err);
    return null;
  }
}
