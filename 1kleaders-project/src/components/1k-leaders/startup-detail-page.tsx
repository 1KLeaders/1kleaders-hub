'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ExternalLink, Globe, MapPin, TrendingUp, Users, DollarSign, Rocket, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type TeamMember = { name: string; role: string; bio?: string };
type Financials  = { raise_target?: string; raise_currency?: string; stage?: string; arr_target?: string; arr_year?: number };

type Startup = {
  id: string; name: string; tagline: string | null; sector: string | null;
  stage: string | null; status: string; location: string | null; website: string | null;
  logo_url: string | null; primary_color: string | null; accent_color: string | null;
  description: string | null; problem: string | null; solution: string | null;
  market_size: string | null; traction: string | null;
  team: TeamMember[] | null; financials: Financials | null; deck_url: string | null;
};

interface Props { startupId: string; navigate?: (page: string) => void; }

const STATUS_COLOR: Record<string, string> = {
  Active:  'bg-emerald-100 text-emerald-700',
  Stealth: 'bg-amber-100 text-amber-700',
  Exited:  'bg-stone-100 text-stone-500',
};

export default function StartupDetailPage({ startupId, navigate }: Props) {
  const [startup, setStartup] = useState<Startup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('startups').select('*').eq('id', startupId).single()
      .then(({ data }) => { setStartup(data as Startup); setLoading(false); });
  }, [startupId]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[#9e9e9e]" />
    </div>
  );

  if (!startup) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Rocket className="w-10 h-10 text-[#9e9e9e]" />
      <p className="text-sm text-[#9e9e9e]">Startup not found.</p>
      {navigate && <Button variant="outline" onClick={() => navigate('startups')}>Back to Startups</Button>}
    </div>
  );

  const primary = startup.primary_color ?? '#222222';
  const accent  = startup.accent_color  ?? '#e33b5f';

  return (
    <div className="max-w-4xl space-y-0">
      {/* Back */}
      <button onClick={() => navigate?.('startups')}
        className="flex items-center gap-1.5 text-sm text-[#9e9e9e] hover:text-[#222] transition mb-6">
        <ArrowLeft className="w-4 h-4" />Back to Portfolio
      </button>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden border border-[#f0f0f0]">
        {/* Brand header */}
        <div className="h-2" style={{ background: `linear-gradient(90deg, ${primary}, ${accent})` }} />
        <div className="px-8 py-10" style={{ backgroundColor: primary }}>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-5">
              {/* Logo */}
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                {startup.logo_url
                  ? <img src={startup.logo_url} alt={startup.name} className="w-14 h-14 object-contain" />
                  : <span className="text-3xl font-black text-white">{startup.name[0]}</span>
                }
              </div>
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight">{startup.name}</h1>
                {startup.tagline && <p className="text-base mt-1 italic" style={{ color: accent }}>{startup.tagline}</p>}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge className={STATUS_COLOR[startup.status] ?? STATUS_COLOR.Active}>{startup.status}</Badge>
                  {startup.stage && <span className="text-xs font-bold text-white/60 uppercase tracking-widest">{startup.stage}</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {startup.location && (
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <MapPin className="w-3.5 h-3.5" />{startup.location}
                </span>
              )}
              {startup.sector && (
                <span className="flex items-center gap-1.5 text-sm text-white/70">
                  <TrendingUp className="w-3.5 h-3.5" />{startup.sector}
                </span>
              )}
              {startup.website && (
                <a href={startup.website} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm font-semibold text-white hover:opacity-80 transition">
                  <Globe className="w-3.5 h-3.5" />{startup.website.replace(/https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {startup.description && (
          <div className="px-8 py-6 border-t border-[#f0f0f0]">
            <p className="text-base text-[#555353] leading-relaxed">{startup.description}</p>
          </div>
        )}
      </div>

      {/* Problem / Solution */}
      {(startup.problem || startup.solution) && (
        <div className="grid sm:grid-cols-2 gap-4 pt-4">
          {startup.problem && (
            <div className="border border-[#f0f0f0] rounded-2xl p-6">
              <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-4">The Problem</p>
              <p className="text-sm text-[#555353] leading-relaxed">{startup.problem}</p>
            </div>
          )}
          {startup.solution && (
            <div className="rounded-2xl p-6 text-white" style={{ backgroundColor: primary }}>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: accent }}>The Solution</p>
              <p className="text-sm leading-relaxed opacity-90">{startup.solution}</p>
            </div>
          )}
        </div>
      )}

      {/* Market + Traction */}
      {(startup.market_size || startup.traction) && (
        <div className="grid sm:grid-cols-2 gap-4 pt-4">
          {startup.market_size && (
            <div className="border border-[#f0f0f0] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-4 h-4" style={{ color: accent }} />
                <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase">Market Opportunity</p>
              </div>
              <p className="text-sm text-[#555353] leading-relaxed">{startup.market_size}</p>
            </div>
          )}
          {startup.traction && (
            <div className="border border-[#f0f0f0] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: accent }} />
                <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase">Traction</p>
              </div>
              <p className="text-sm text-[#555353] leading-relaxed">{startup.traction}</p>
            </div>
          )}
        </div>
      )}

      {/* Team */}
      {startup.team && startup.team.length > 0 && (
        <div className="border border-[#f0f0f0] rounded-2xl p-6 mt-4">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4" style={{ color: accent }} />
            <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase">Team</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {startup.team.map((m, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: primary + '10' }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black text-white flex-shrink-0"
                  style={{ backgroundColor: primary }}>
                  {m.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-[#222]">{m.name}</p>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: accent }}>{m.role}</p>
                  {m.bio && <p className="text-xs text-[#7e7e7e] leading-relaxed">{m.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financials */}
      {startup.financials && (
        <div className="border border-[#f0f0f0] rounded-2xl p-6 mt-4">
          <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-4">Financials</p>
          <div className="flex items-center gap-8 flex-wrap">
            {startup.financials.raise_target && (
              <div>
                <p className="text-xs text-[#9e9e9e]">Raising</p>
                <p className="text-2xl font-black" style={{ color: primary }}>
                  {startup.financials.raise_currency ?? '$'}{startup.financials.raise_target}
                </p>
              </div>
            )}
            {startup.financials.stage && (
              <div>
                <p className="text-xs text-[#9e9e9e]">Round</p>
                <p className="text-lg font-bold text-[#222]">{startup.financials.stage}</p>
              </div>
            )}
            {startup.financials.arr_target && (
              <div>
                <p className="text-xs text-[#9e9e9e]">ARR Target</p>
                <p className="text-lg font-bold text-[#222]">${startup.financials.arr_target} by {startup.financials.arr_year}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center gap-3 pt-6 flex-wrap">
        {startup.website && (
          <a href={startup.website} target="_blank" rel="noopener noreferrer">
            <Button className="text-white" style={{ backgroundColor: primary }}>
              <Globe className="w-4 h-4 mr-2" />Visit Website <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
          </a>
        )}
        {startup.deck_url && (
          <a href={startup.deck_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">View Pitch Deck</Button>
          </a>
        )}
        <button onClick={() => navigate?.('startups')}
          className="ml-auto text-sm text-[#9e9e9e] hover:text-[#222] flex items-center gap-1 transition">
          Back to all startups <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
