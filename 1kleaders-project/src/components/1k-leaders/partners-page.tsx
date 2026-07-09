'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Search, Mail, Linkedin, Building2, Tag, X, Check, Loader2,
  RefreshCw, ChevronRight, Lightbulb, FileText, CheckCircle2,
  Clock, Users, ExternalLink, MapPin, Star
} from 'lucide-react';
import type { Page, DashboardRole, SubRole } from './types';
import { roleBadgeConfig } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { navigate?: (page: Page) => void; role?: DashboardRole; }

type DbPartner = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  subroles: string[] | null;
  partner_level: string | null;
  onboarding_status: string;
  bio: string | null;
  org_name: string | null;
  org_website: string | null;
  org_industries: string[] | null;
  expertise_domains: string[] | null;
  linkedin_url: string | null;
  profile_photo_url: string | null;
  city: string | null;
  country: string | null;
  created_at: string;
};

type PartnerIdea = {
  id: string; title: string; status: string; sector: string | null; vep_score: number | null; created_at: string;
};

type PartnerDoc = {
  id: string; doc_type: string; status: string; created_at: string;
};

const ALL_SUBROLES: SubRole[] = ['idea-owner', 'founder', 'vep-builder', 'mab-builder'];

const ONBOARDING_STEPS = [
  'Meeting Completed', 'Agreement Signed', 'Platform Access Issued',
  'KYC Submitted', 'KYC Approved', 'Payment Receipt Submitted',
  'Payment Confirmed', 'Awaiting ADGM Registration', 'Officially Registered Partner',
];

const levelColors: Record<string, string> = {
  Bronze:   'bg-amber-100 text-amber-800 border-amber-300',
  Silver:   'bg-stone-100 text-stone-600 border-stone-300',
  Gold:     'bg-yellow-100 text-yellow-800 border-yellow-300',
  Diamond:  'bg-sky-100 text-sky-800 border-sky-300',
};

function DigitalBadge({ role }: { role: string }) {
  const cfg = roleBadgeConfig[role as SubRole];
  if (!cfg) return null;
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
}

export default function ShareholdersPage({ navigate, role }: Props) {
  const { profile: currentUser } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';
  const isShareholder = role === 'shareholder' || isAdmin;

  const [partners,      setPartners]      = useState<DbPartner[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('All');
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState<DbPartner | null>(null);
  const [partnerIdeas,  setPartnerIdeas]  = useState<PartnerIdea[]>([]);
  const [partnerDocs,   setPartnerDocs]   = useState<PartnerDoc[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingBadges, setEditingBadges] = useState(false);
  const [badgeDraft,    setBadgeDraft]    = useState<SubRole[]>([]);
  const [savingBadges,  setSavingBadges]  = useState(false);

  async function fetchPartners() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, subroles, partner_level, onboarding_status, bio, org_name, org_website, org_industries, expertise_domains, linkedin_url, profile_photo_url, city, country, created_at')
      .in('role', ['shareholder', 'user', 'admin', 'super-admin', 'developer'])
      .order('created_at', { ascending: false });
    setPartners((data ?? []) as DbPartner[]);
    setLoading(false);
  }

  useEffect(() => { fetchPartners(); }, []);

  async function openProfile(partner: DbPartner) {
    setSelected(partner);
    setLoadingDetail(true);
    const [{ data: ideas }, { data: docs }] = await Promise.all([
      supabase.from('ideas').select('id, title, status, sector, vep_score, created_at')
        .eq('submitted_by', partner.id).order('created_at', { ascending: false }),
      supabase.from('kyc_documents').select('id, doc_type, status, created_at')
        .eq('user_id', partner.id).order('created_at', { ascending: false }),
    ]);
    setPartnerIdeas((ideas ?? []) as PartnerIdea[]);
    setPartnerDocs((docs ?? []) as PartnerDoc[]);
    setLoadingDetail(false);
  }

  async function saveBadges(partnerId: string, badges: SubRole[]) {
    setSavingBadges(true);
    await supabase.from('profiles').update({ subroles: badges }).eq('id', partnerId);
    setPartners(prev => prev.map(p => p.id === partnerId ? { ...p, subroles: badges } : p));
    if (selected?.id === partnerId) setSelected(prev => prev ? { ...prev, subroles: badges } : prev);
    setEditingBadges(false);
    setSavingBadges(false);
  }

  const filtered = partners.filter(p => {
    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.org_name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || p.role === filter ||
      (filter === 'Idea Owners' && p.subroles?.includes('idea-owner')) ||
      (filter === 'VEP' && p.subroles?.includes('vep-builder')) ||
      (filter === 'MAB' && p.subroles?.includes('mab-builder'));
    return matchSearch && matchFilter;
  });

  // Profile detail view
  if (selected) {
    const name = `${selected.first_name ?? ''} ${selected.last_name ?? ''}`.trim() || selected.email;
    const initials = `${selected.first_name?.[0] ?? ''}${selected.last_name?.[0] ?? ''}`.toUpperCase() || '?';
    const stepIdx = ONBOARDING_STEPS.indexOf(selected.onboarding_status);
    const pct = stepIdx >= 0 ? Math.round(((stepIdx + 1) / ONBOARDING_STEPS.length) * 100) : 0;
    const isRegistered = selected.onboarding_status === 'Officially Registered Partner';
    const isOwnProfile = currentUser?.id === selected.id;

    return (
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelected(null)} className="text-sm text-[#7e7e7e] hover:text-[#222]">← Back to Partners</button>
          <ChevronRight className="w-4 h-4 text-[#d0d0d0]" />
          <span className="text-sm font-medium text-[#222] truncate">{name}</span>
        </div>

        {/* Header card */}
        <Card className="border-[#f0f0f0]">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="w-16 h-16 flex-shrink-0">
                <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold text-[#222]">{name}</h2>
                    <p className="text-sm text-[#7e7e7e]">{selected.email}</p>
                    {(selected.city || selected.country) && (
                      <p className="text-xs text-[#9e9e9e] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />{[selected.city, selected.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {selected.partner_level && (
                      <Badge className={`text-xs border ${levelColors[selected.partner_level] ?? 'bg-stone-100 text-stone-600'}`}>
                        <Star className="w-3 h-3 mr-1" />{selected.partner_level}
                      </Badge>
                    )}
                    <Badge className="text-xs bg-[#f0f0f0] text-[#555353]">{selected.role}</Badge>
                  </div>
                </div>

                {/* Subrole badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(selected.subroles ?? []).map(sr => <DigitalBadge key={sr} role={sr} />)}
                  {isAdmin && !editingBadges && (
                    <button onClick={() => { setBadgeDraft(selected.subroles as SubRole[] ?? []); setEditingBadges(true); }}
                      className="px-2 py-0.5 rounded text-[10px] border border-dashed border-[#d0d0d0] text-[#9e9e9e] hover:border-[#e33b5f] hover:text-[#e33b5f] transition">
                      + Edit Badges
                    </button>
                  )}
                </div>

                {isAdmin && editingBadges && (
                  <div className="mt-3 p-3 bg-[#f6f6f6] rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-[#555353]">Edit Badges</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_SUBROLES.map(sr => {
                        const on = badgeDraft.includes(sr);
                        const cfg = roleBadgeConfig[sr];
                        return (
                          <button key={sr} onClick={() => setBadgeDraft(prev => on ? prev.filter(x => x !== sr) : [...prev, sr])}
                            className={`px-2 py-1 rounded-full text-xs font-medium border transition flex items-center gap-1 ${on ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0]'}`}>
                            {cfg?.icon}{cfg?.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-[#e33b5f] text-white"
                        onClick={() => saveBadges(selected.id, badgeDraft)} disabled={savingBadges}>
                        {savingBadges ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingBadges(false)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {/* Contact links */}
                <div className="flex gap-3 mt-3 flex-wrap">
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 text-xs text-[#7e7e7e] hover:text-[#e33b5f] transition">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </a>
                  {selected.linkedin_url && (
                    <a href={selected.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#7e7e7e] hover:text-[#e33b5f] transition">
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                  {selected.org_website && (
                    <a href={selected.org_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#7e7e7e] hover:text-[#e33b5f] transition">
                      <ExternalLink className="w-3.5 h-3.5" /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>

            {selected.bio && (
              <>
                <Separator className="my-4" />
                <p className="text-sm text-[#444] leading-relaxed">{selected.bio}</p>
              </>
            )}

            {(selected.org_name || (selected.org_industries ?? []).length > 0 || (selected.expertise_domains ?? []).length > 0) && (
              <>
                <Separator className="my-4" />
                <div className="grid sm:grid-cols-2 gap-4">
                  {selected.org_name && (
                    <div>
                      <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Organisation</p>
                      <p className="text-sm font-medium text-[#222] flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#9e9e9e]" />{selected.org_name}
                      </p>
                    </div>
                  )}
                  {(selected.expertise_domains ?? []).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Expertise</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.expertise_domains!.map(d => <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Onboarding progress — admin and own profile only */}
        {(isAdmin || isOwnProfile) && (
          <Card className="border-[#f0f0f0]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#e33b5f]" /> Onboarding Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#222]">{selected.onboarding_status}</p>
                {isRegistered
                  ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">✓ Registered Partner</Badge>
                  : <span className="text-xs text-[#9e9e9e]">{stepIdx + 1} / {ONBOARDING_STEPS.length} steps</span>
                }
              </div>
              <Progress value={pct} className="h-2" />
              <div className="flex flex-wrap gap-1.5">
                {ONBOARDING_STEPS.map((step, i) => (
                  <div key={step} className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full ${
                    i < stepIdx ? 'bg-emerald-100 text-emerald-700' :
                    i === stepIdx ? 'bg-[#e33b5f]/10 text-[#e33b5f] font-semibold' :
                    'bg-[#f0f0f0] text-[#9e9e9e]'
                  }`}>
                    {i < stepIdx && <CheckCircle2 className="w-2.5 h-2.5" />}
                    {step}
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#9e9e9e]">Partner since {new Date(selected.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
            </CardContent>
          </Card>
        )}

        {/* Ideas */}
        {(isAdmin || isShareholder) && (
          <Card className="border-[#f0f0f0]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#e33b5f]" /> Submitted Ideas
                <Badge className="text-xs bg-[#f0f0f0] text-[#555353]">{partnerIdeas.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDetail ? (
                <div className="flex items-center gap-2 text-[#9e9e9e] text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : partnerIdeas.length === 0 ? (
                <p className="text-sm text-[#9e9e9e]">No ideas submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {partnerIdeas.map(idea => (
                    <div key={idea.id} className="flex items-center gap-3 p-3 bg-[#f6f6f6] rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#222] truncate">{idea.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-[#7e7e7e]">
                          {idea.sector && <span>{idea.sector}</span>}
                          <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {idea.vep_score != null && <span className="text-xs font-medium text-purple-600">{idea.vep_score}/100</span>}
                        <Badge className={`text-xs ${
                          idea.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          idea.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-[#f0f0f0] text-[#555353]'
                        }`}>{idea.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Documents — admin only */}
        {isAdmin && (
          <Card className="border-[#f0f0f0]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#e33b5f]" /> KYC Documents
                <Badge className="text-xs bg-[#f0f0f0] text-[#555353]">{partnerDocs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDetail ? (
                <div className="flex items-center gap-2 text-[#9e9e9e] text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : partnerDocs.length === 0 ? (
                <p className="text-sm text-[#9e9e9e]">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {partnerDocs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-[#f6f6f6] rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#9e9e9e]" />
                        <div>
                          <p className="text-sm font-medium text-[#222] capitalize">{doc.doc_type.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-[#9e9e9e]">{new Date(doc.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <Badge className={`text-xs ${
                        doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        doc.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                        'bg-[#f0f0f0] text-[#555353]'
                      }`}>{doc.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Partner list view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#e33b5f]" /> Partner Directory
          </h1>
          <p className="text-[#7e7e7e]">{loading ? '—' : filtered.length} partners</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchPartners} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search by name, email, or company..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['All', 'shareholder', 'user', 'Idea Owners', 'VEP', 'MAB'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${filter === f ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading partners...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-[#f0f0f0]">
          <CardContent className="p-8 text-center">
            <Users className="w-10 h-10 text-[#9e9e9e] mx-auto mb-2" />
            <p className="text-sm text-[#7e7e7e]">No partners found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email;
            const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || '?';
            const isRegistered = p.onboarding_status === 'Officially Registered Partner';
            return (
              <Card key={p.id} className="border-[#f0f0f0] hover:shadow-md transition cursor-pointer"
                onClick={() => openProfile(p)}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 justify-between">
                        <p className="font-semibold text-sm text-[#222] truncate">{name}</p>
                        {isRegistered && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-[#7e7e7e] truncate">{p.email}</p>
                      {p.org_name && (
                        <p className="text-xs text-[#9e9e9e] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />{p.org_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <Badge className="text-xs bg-[#f0f0f0] text-[#555353]">{p.role}</Badge>
                    {(p.subroles ?? []).map(sr => <DigitalBadge key={sr} role={sr} />)}
                    {p.partner_level && (
                      <Badge className={`text-xs border ${levelColors[p.partner_level] ?? ''}`}>
                        <Star className="w-2.5 h-2.5 mr-0.5" />{p.partner_level}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] text-[#9e9e9e]">{p.onboarding_status}</p>
                    <ChevronRight className="w-4 h-4 text-[#9e9e9e]" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
