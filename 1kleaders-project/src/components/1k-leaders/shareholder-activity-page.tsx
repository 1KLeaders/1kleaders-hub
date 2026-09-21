'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Activity, Users, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Shareholder = {
  id: string; first_name: string; last_name: string; email: string;
  role: string; last_seen: string | null; profile_photo_url: string | null;
  org_name: string | null; onboarding_status: string | null;
};

function timeAgo(date: string | null): { text: string; isOnline: boolean; isRecent: boolean } {
  if (!date) return { text: 'Never', isOnline: false, isRecent: false };
  const mins = (Date.now() - new Date(date).getTime()) / 60000;
  const isOnline = mins < 5;
  const isRecent = mins < 60;
  if (isOnline) return { text: 'Online now', isOnline: true, isRecent: true };
  if (mins < 60) return { text: `${Math.round(mins)}m ago`, isOnline: false, isRecent: true };
  if (mins < 1440) return { text: `${Math.round(mins / 60)}h ago`, isOnline: false, isRecent: false };
  if (mins < 10080) return { text: `${Math.round(mins / 1440)}d ago`, isOnline: false, isRecent: false };
  return { text: new Date(date).toLocaleDateString(), isOnline: false, isRecent: false };
}

export default function ShareholderActivityPage() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');

  useEffect(() => {
    supabase.from('profiles')
      .select('id, first_name, last_name, email, role, last_seen, profile_photo_url, org_name, onboarding_status')
      .in('role', ['shareholder', 'admin', 'super-admin', 'developer'])
      .order('last_seen', { ascending: false, nullsFirst: false })
      .then(({ data }) => { setShareholders((data ?? []) as Shareholder[]); setLoading(false); });
  }, []);

  const filtered = shareholders.filter(s =>
    !search || `${s.first_name} ${s.last_name} ${s.email} ${s.org_name ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const online  = filtered.filter(s => s.last_seen && (Date.now() - new Date(s.last_seen).getTime()) < 300000);
  const offline = filtered.filter(s => !s.last_seen || (Date.now() - new Date(s.last_seen).getTime()) >= 300000);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          <Activity className="w-6 h-6 text-[#e33b5f]" />Shareholder Activity
        </h1>
        <p className="text-[#7e7e7e] mt-1">Track when shareholders last accessed the platform</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-emerald-500">{online.length}</p>
            <p className="text-xs text-[#9e9e9e] mt-1">Online Now</p>
          </CardContent>
        </Card>
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-[#222]">{shareholders.filter(s => s.last_seen).length}</p>
            <p className="text-xs text-[#9e9e9e] mt-1">Have Logged In</p>
          </CardContent>
        </Card>
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-black text-[#9e9e9e]">{shareholders.filter(s => !s.last_seen).length}</p>
            <p className="text-xs text-[#9e9e9e] mt-1">Never Logged In</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
        <Input className="pl-9 border-[#f0f0f0]" placeholder="Search shareholders..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#9e9e9e]">
          <Loader2 className="w-5 h-5 animate-spin" />Loading...
        </div>
      ) : (
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-0">
            {/* Online users first */}
            {online.length > 0 && (
              <div className="px-4 py-2 bg-emerald-50 border-b border-[#f0f0f0]">
                <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" />Currently Online — {online.length}
                </p>
              </div>
            )}
            {[...online, ...offline].map((s, i) => {
              const { text, isOnline, isRecent } = timeAgo(s.last_seen);
              const initials = `${s.first_name?.[0] ?? ''}${s.last_name?.[0] ?? ''}`.toUpperCase() || '?';
              return (
                <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${i < filtered.length - 1 ? 'border-b border-[#f0f0f0]' : ''} hover:bg-[#fafafa] transition`}>
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {s.profile_photo_url
                      ? <img src={s.profile_photo_url} alt={s.first_name} className="w-9 h-9 rounded-full object-cover" />
                      : <div className="w-9 h-9 rounded-full bg-[#e33b5f]/10 flex items-center justify-center text-xs font-bold text-[#e33b5f]">{initials}</div>
                    }
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-400' : 'bg-[#e0e0e0]'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#222] truncate">{s.first_name} {s.last_name}</p>
                      <Badge className="text-[9px] bg-[#f0f0f0] text-[#555353] py-0 hidden sm:block">{s.role}</Badge>
                    </div>
                    <p className="text-xs text-[#9e9e9e] truncate">{s.org_name || s.email}</p>
                  </div>

                  {/* Last seen */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-medium ${isOnline ? 'text-emerald-500' : isRecent ? 'text-amber-500' : 'text-[#9e9e9e]'}`}>
                      {text}
                    </p>
                    {s.last_seen && (
                      <p className="text-[10px] text-[#9e9e9e]">
                        {new Date(s.last_seen).toLocaleDateString()} {new Date(s.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {!s.last_seen && (
                      <p className="text-[10px] text-[#9e9e9e]">Not yet signed in</p>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-[#9e9e9e] text-center py-8">No results found</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
