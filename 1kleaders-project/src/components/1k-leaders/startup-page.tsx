'use client';
// "My Startup" (founder sidebar link) — opens the founder's real startup page(s) in edit-capable mode.
// Which startups a founder manages comes from profiles.founder_startup_ids (set by an admin).
import { useState, useEffect } from 'react';
import { Rocket, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import StartupDetailPage from './startup-detail-page';
import { StartupLogo } from './startup-shared';

type Mini = { id: string; name: string; logo_url: string | null; accent_color: string | null };

export default function StartupPage({ navigate }: { navigate?: (page: string) => void }) {
  const { profile } = useAuth();
  const ids: string[] = ((profile as any)?.founder_startup_ids ?? []).map(String);
  const [startups, setStartups] = useState<Mini[]>([]);
  const [active,   setActive]   = useState<string | null>(ids[0] ?? null);
  const [loading,  setLoading]  = useState(ids.length > 1);

  useEffect(() => {
    if (ids.length <= 1) return;
    supabase.from('startups').select('id, name, logo_url, accent_color').in('id', ids)
      .then(({ data }) => { setStartups((data ?? []) as Mini[]); setLoading(false); });
  }, [ids.join(',')]);

  if (!ids.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Rocket className="w-12 h-12 text-[#9e9e9e]" />
        <h2 className="text-xl font-bold text-[#222]">No startup linked yet</h2>
        <p className="text-[#7e7e7e] max-w-sm">
          Your founder account isn&apos;t linked to a startup page yet. Ask a 1K Leaders admin to link you, then you can edit your page and post updates here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ids.length > 1 && (
        loading ? <Loader2 className="w-4 h-4 animate-spin text-[#9e9e9e]" /> : (
          <div className="flex gap-2 flex-wrap">
            {startups.map(s => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm font-medium transition ${active === s.id ? 'border-[#e33b5f] bg-[#e33b5f]/5 text-[#222]' : 'border-[#f0f0f0] bg-white text-[#555353]'}`}>
                <StartupLogo startup={s} size={24} rounded="rounded-full" />{s.name}
              </button>
            ))}
          </div>
        )
      )}
      {active && <StartupDetailPage key={active} startupId={active} navigate={navigate} hideBack />}
    </div>
  );
}
