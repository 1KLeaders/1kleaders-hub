// platform_settings helpers (server-only, service role).
import { supabaseAdmin } from '@/lib/supabase-server';

export async function getPlatformSettings(keys: string[]): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin.from('platform_settings').select('key, value').in('key', keys);
  return Object.fromEntries((data ?? []).map(r => [r.key, r.value == null ? '' : String(r.value)]));
}

// Upserts on `key`; falls back to writing without updated_at in case that column doesn't exist
export async function setPlatformSetting(key: string, value: string): Promise<string | null> {
  const first = await supabaseAdmin.from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (!first.error) return null;
  const retry = await supabaseAdmin.from('platform_settings').upsert({ key, value }, { onConflict: 'key' });
  return retry.error ? `${first.error.message} / ${retry.error.message}` : null;
}
