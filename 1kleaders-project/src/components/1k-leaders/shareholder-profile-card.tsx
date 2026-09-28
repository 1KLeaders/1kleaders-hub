'use client';
// The public shareholder profile card (what other members see in the Shareholders directory).
// Used for the live preview in Settings → Profile.
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Mail, Linkedin, ExternalLink, MapPin, Star, Building2, Briefcase } from 'lucide-react';
import { roleBadgeConfig } from './types';

export type PublicProfile = {
  first_name: string | null; last_name: string | null; email: string; role: string;
  subroles?: string[] | null; partner_level?: string | null; profile_photo_url?: string | null;
  city?: string | null; country?: string | null; bio?: string | null; linkedin_url?: string | null;
  org_name?: string | null; org_website?: string | null; job_title?: string | null;
  expertise_domains?: string[] | null; org_industries?: string[] | null;
};

const levelColors: Record<string, string> = {
  Bronze:  'bg-amber-100 text-amber-800 border-amber-300',
  Silver:  'bg-stone-100 text-stone-600 border-stone-300',
  Gold:    'bg-yellow-100 text-yellow-800 border-yellow-300',
  Diamond: 'bg-sky-100 text-sky-800 border-sky-300',
};

const withHttp = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

export default function ShareholderProfileCard({ p }: { p: PublicProfile }) {
  const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email;
  const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || '?';
  const roleCfg = roleBadgeConfig[p.role as keyof typeof roleBadgeConfig];

  return (
    <Card className="border-[#f0f0f0]">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16 flex-shrink-0">
            {p.profile_photo_url && <AvatarImage src={p.profile_photo_url} alt={name} className="object-cover" />}
            <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-[#222] break-words">{name}</h2>
                {(p.job_title || p.org_name) && (
                  <p className="text-sm text-[#555353]">{[p.job_title, p.org_name].filter(Boolean).join(' at ')}</p>
                )}
                {(p.city || p.country) && (
                  <p className="text-xs text-[#9e9e9e] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />{[p.city, p.country].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {p.partner_level && (
                  <Badge className={`text-xs border ${levelColors[p.partner_level] ?? 'bg-stone-100 text-stone-600'}`}>
                    <Star className="w-3 h-3 mr-1" />{p.partner_level}
                  </Badge>
                )}
                {roleCfg && <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${roleCfg.color}`}>{roleCfg.icon} {roleCfg.label}</span>}
              </div>
            </div>

            {(p.subroles ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(p.subroles ?? []).map(sr => {
                  const cfg = roleBadgeConfig[sr as keyof typeof roleBadgeConfig];
                  return cfg ? <span key={sr} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.icon} {cfg.label}</span> : null;
                })}
              </div>
            )}

            <div className="flex gap-3 mt-3 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-[#7e7e7e]"><Mail className="w-3.5 h-3.5" />Email</span>
              {p.linkedin_url && (
                <a href={withHttp(p.linkedin_url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#7e7e7e] hover:text-[#e33b5f]">
                  <Linkedin className="w-3.5 h-3.5" />LinkedIn
                </a>
              )}
              {p.org_website && (
                <a href={withHttp(p.org_website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#7e7e7e] hover:text-[#e33b5f]">
                  <ExternalLink className="w-3.5 h-3.5" />Website
                </a>
              )}
            </div>
          </div>
        </div>

        {p.bio ? (
          <>
            <Separator className="my-4" />
            <p className="text-sm text-[#444] leading-relaxed whitespace-pre-wrap">{p.bio}</p>
          </>
        ) : (
          <p className="text-xs text-[#c0c0c0] italic mt-4">No bio yet — add one so other shareholders know who you are.</p>
        )}

        {(p.org_name || (p.expertise_domains ?? []).length > 0 || (p.org_industries ?? []).length > 0) && (
          <>
            <Separator className="my-4" />
            <div className="grid sm:grid-cols-2 gap-4">
              {p.org_name && (
                <div>
                  <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Organisation</p>
                  <p className="text-sm font-medium text-[#222] flex items-center gap-1.5"><Building2 className="w-4 h-4 text-[#9e9e9e]" />{p.org_name}</p>
                </div>
              )}
              {(p.expertise_domains ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Expertise</p>
                  <div className="flex flex-wrap gap-1">{p.expertise_domains!.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}</div>
                </div>
              )}
              {(p.org_industries ?? []).length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" />Industries</p>
                  <div className="flex flex-wrap gap-1">{p.org_industries!.map(d => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}</div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
