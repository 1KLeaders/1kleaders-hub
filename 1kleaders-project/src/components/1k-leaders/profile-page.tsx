'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Edit, Mail, Star, Briefcase, MapPin, Clock, Copy, Check, Users, Lightbulb, ClipboardCheck, Calendar, Linkedin } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { roleBadgeConfig } from './types';
import type { Page } from './types';

interface Props { navigate: (page: Page) => void; }

export default function ProfilePage({ navigate }: Props) {
  const { profile, role } = useAuth();
  const [copied, setCopied] = useState(false);

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?'
    : '?';

  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unnamed User'
    : 'Loading...';

  const referralLink = profile
    ? `https://1kleaders.com/join?ref=${profile.id.slice(0, 8).toUpperCase()}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isShareholder = role === 'shareholder' || role === 'admin' || role === 'super-admin' || role === 'developer';
  const mainRoleCfg = roleBadgeConfig[role] ?? roleBadgeConfig['user'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">My Profile</h1>
          <p className="text-[#7e7e7e]">View and manage your profile information</p>
        </div>
        <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" onClick={() => navigate('settings')}>
          <Edit className="w-4 h-4 mr-2" /> Edit Profile
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-20 h-20">
              {profile?.profile_photo_url
                ? <img src={profile.profile_photo_url} alt={fullName} className="w-full h-full object-cover rounded-full" />
                : <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-2xl font-bold">{initials}</AvatarFallback>
              }
            </Avatar>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-xl font-bold text-[#222]">{fullName}</h2>
              <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${mainRoleCfg.color}`}>
                  {mainRoleCfg.icon} {mainRoleCfg.label}
                </span>
                {profile?.subroles?.map(sr => {
                  const cfg = roleBadgeConfig[sr as keyof typeof roleBadgeConfig];
                  if (!cfg) return null;
                  return (
                    <span key={sr} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  );
                })}
                {profile?.partner_level && (
                  <span className="flex items-center gap-1 text-[#f07969] text-sm">
                    <Star className="w-4 h-4" /> {profile.partner_level} Level
                  </span>
                )}
              </div>
              {profile?.bio && (
                <p className="text-sm text-[#7e7e7e] mt-2">{profile.bio}</p>
              )}
              <div className="flex items-center gap-4 mt-3 justify-center sm:justify-start text-xs text-[#7e7e7e] flex-wrap">
                {profile?.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {profile.email}</span>
                )}
                {(profile?.city || profile?.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[profile.city, profile.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {profile?.org_industries?.[0] && (
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {profile.org_industries[0]}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contribution Stats — placeholder until contribution tracking is live */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Calendar,       label: 'Meetings Attended', value: '—' },
          { icon: Clock,          label: 'Contribution Hours', value: '—' },
          { icon: Lightbulb,      label: 'Ideas Reviewed',    value: '—' },
          { icon: ClipboardCheck, label: 'Tasks Completed',   value: '—' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className="w-5 h-5 text-[#e33b5f] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#222]">{stat.value}</p>
              <p className="text-xs text-[#7e7e7e] mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* About & Skills */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">About & Expertise</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                <p className="text-xs text-[#9e9e9e] mb-1">Company</p>
                <p className="text-sm font-medium text-[#222]">{profile?.org_name || '—'}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                <p className="text-xs text-[#9e9e9e] mb-1">Primary Sector</p>
                <p className="text-sm font-medium text-[#222]">{profile?.org_industries?.[0] || '—'}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                <p className="text-xs text-[#9e9e9e] mb-1">Years of Experience</p>
                <p className="text-sm font-medium text-[#222]">{profile?.years_experience != null ? `${profile.years_experience} years` : '—'}</p>
              </div>
            </div>

            {profile?.job_title && (
              <>
                <Separator />
                <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                  <p className="text-xs text-[#9e9e9e] mb-1">Job Title / Level</p>
                  <p className="text-sm font-medium text-[#222]">{profile.job_title}{profile.job_level ? ` — ${profile.job_level}` : ''}</p>
                </div>
              </>
            )}

            {profile?.expertise_domains && profile.expertise_domains.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-[#444] mb-2">Expertise Domains</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.expertise_domains.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {profile?.linkedin_url && (
              <>
                <Separator />
                <a
                  href={profile.linkedin_url.startsWith('http') ? profile.linkedin_url : `https://${profile.linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#0077b5] hover:underline"
                >
                  <Linkedin className="w-4 h-4" /> {profile.linkedin_url}
                </a>
              </>
            )}

            {/* Referral Link */}
            {isShareholder && referralLink && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-[#444] mb-1 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#e33b5f]" /> Your Referral Link
                  </p>
                  <p className="text-xs text-[#7e7e7e] mb-2">Share this unique link to refer prospective members to 1K Leaders.</p>
                  <div className="flex items-center gap-2 bg-[#f6f6f6] border border-[#f0f0f0] rounded-lg px-3 py-2">
                    <span className="text-sm text-[#444] flex-1 truncate font-mono">{referralLink}</span>
                    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-[#e33b5f] hover:text-[#c02d4f] font-medium transition shrink-0">
                      {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Onboarding Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Account Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-[#e33b5f]/5 border border-[#e33b5f]/20">
              <p className="text-xs text-[#9e9e9e] mb-0.5">Onboarding Status</p>
              <p className="text-sm font-semibold text-[#e33b5f]">{profile?.onboarding_status || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
              <p className="text-xs text-[#9e9e9e] mb-0.5">Member Since</p>
              <p className="text-sm font-medium text-[#222]">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}
              </p>
            </div>
            {profile?.pool && (
              <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                <p className="text-xs text-[#9e9e9e] mb-0.5">Pool</p>
                <p className="text-sm font-medium text-[#222]">{profile.pool}</p>
              </div>
            )}
            {profile?.nationality && (
              <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                <p className="text-xs text-[#9e9e9e] mb-0.5">Nationality</p>
                <p className="text-sm font-medium text-[#222]">{profile.nationality}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
