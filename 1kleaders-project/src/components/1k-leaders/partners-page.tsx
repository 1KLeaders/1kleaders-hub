'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, MessageSquare, Star, Mail, Linkedin, ExternalLink, DollarSign, Building2, Briefcase, Lightbulb, Tag, X, Check, Loader2, RefreshCw } from 'lucide-react';
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
};

const ALL_SUBROLES: SubRole[] = ['idea-owner', 'founder', 'vep-builder', 'mab-builder'];

export default function ShareholdersPage({ navigate, role }: Props) {
  const { profile: currentUser } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  const [partners,      setPartners]      = useState<DbPartner[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [filter,        setFilter]        = useState('All');
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState<DbPartner | null>(null);
  const [editingBadges, setEditingBadges] = useState(false);
  const [badgeDraft,    setBadgeDraft]    = useState<SubRole[]>([]);
  const [savingBadges,  setSavingBadges]  = useState(false);

  async function fetchPartners() {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, subroles, partner_level, onboarding_status, bio, org_name, org_website, org_industries, expertise_domains, linkedin_url, profile_photo_url, city, country')
      .in('role', ['shareholder', 'user', 'admin', 'super-admin', 'developer'])
      .order('first_name');
    if (error) setError(error.message);
    else setPartners((data ?? []) as DbPartner[]);
    setLoading(false);
  }

  useEffect(() => { fetchPartners(); }, []);

  const filtered = partners.filter(p => {
    if (filter === 'Shareholder' && p.role !== 'shareholder') return false;
    if (filter === 'User' && !['user', 'developer'].includes(p.role)) return false;
    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase()) && !p.email.includes(search.toLowerCase())) return false;
    return true;
  });

  const initials = (p: DbPartner) =>
    `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || '?';

  const fullName = (p: DbPartner) =>
    `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || p.email;

  const openProfile = (p: DbPartner) => {
    setSelected(p);
    setBadgeDraft((p.subroles ?? []) as SubRole[]);
    setEditingBadges(false);
  };

  const toggleBadge = (sr: SubRole) =>
    setBadgeDraft(prev => prev.includes(sr) ? prev.filter(x => x !== sr) : [...prev, sr]);

  const saveBadges = async () => {
    if (!selected) return;
    setSavingBadges(true);
    const { error } = await supabase
      .from('profiles')
      .update({ subroles: badgeDraft, updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    if (!error) {
      setPartners(prev => prev.map(p => p.id === selected.id ? { ...p, subroles: badgeDraft } : p));
      setSelected(prev => prev ? { ...prev, subroles: badgeDraft } : null);
    }
    setSavingBadges(false);
    setEditingBadges(false);
  };

  const isActive = (p: DbPartner) => p.onboarding_status === 'Officially Registered Partner' || p.onboarding_status === 'Platform Access Issued' || p.role === 'admin' || p.role === 'super-admin' || p.role === 'developer';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Shareholders & Members</h1>
          <p className="text-[#7e7e7e]">Connect with platform shareholders and members</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchPartners} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {['All', 'Shareholder', 'User'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filter === f ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#555353] hover:bg-[#e8e8e8]'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Members',   value: partners.length },
          { label: 'Shareholders',    value: partners.filter(p => p.role === 'shareholder').length },
          { label: 'Users',           value: partners.filter(p => p.role === 'user').length },
          { label: 'Admins',          value: partners.filter(p => ['admin','super-admin','developer'].includes(p.role)).length },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-[#222]">{loading ? '—' : s.value}</div>
              <div className="text-xs text-[#7e7e7e]">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#7e7e7e]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading members...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#9e9e9e]">No members found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="hover:shadow-md transition cursor-pointer group" onClick={() => openProfile(p)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-10 h-10">
                    {p.profile_photo_url
                      ? <img src={p.profile_photo_url} alt={fullName(p)} className="w-full h-full object-cover rounded-full" />
                      : <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm font-semibold">{initials(p)}</AvatarFallback>
                    }
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-[#222] truncate group-hover:text-[#e33b5f] transition">{fullName(p)}</p>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      <Badge variant="secondary" className="text-xs capitalize">{p.role}</Badge>
                      {p.partner_level && <span className="flex items-center gap-1 text-xs text-[#f07969]"><Star className="w-3 h-3" />{p.partner_level}</span>}
                    </div>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {p.org_name && <p className="text-xs text-[#7e7e7e] flex items-center gap-1.5"><Building2 className="w-3 h-3 shrink-0" />{p.org_name}</p>}
                  {p.org_industries?.[0] && <p className="text-xs text-[#7e7e7e] flex items-center gap-1.5"><Briefcase className="w-3 h-3 shrink-0" />{p.org_industries[0]}</p>}
                </div>

                {(p.subroles ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(p.subroles ?? []).map(sr => {
                      const cfg = roleBadgeConfig[sr as keyof typeof roleBadgeConfig];
                      if (!cfg) return null;
                      return <span key={sr} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <Badge className={`text-xs ${isActive(p) ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : 'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
                    {isActive(p) ? 'active' : 'pending'}
                  </Badge>
                  {p.id === currentUser?.id && <span className="text-[10px] text-[#9e9e9e]">You</span>}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={e => e.stopPropagation()}><MessageSquare className="w-3 h-3 mr-1" /> Message</Button>
                  <Button variant="outline" size="sm" className="flex-1 text-[#e33b5f] border-[#e33b5f]/30 hover:bg-[#e33b5f]/5" onClick={e => { e.stopPropagation(); openProfile(p); }}>View</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Profile Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Member Profile</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 shrink-0">
                  {selected.profile_photo_url
                    ? <img src={selected.profile_photo_url} alt={fullName(selected)} className="w-full h-full object-cover rounded-full" />
                    : <AvatarFallback className="bg-gradient-to-br from-[#e33b5f] to-[#E65F5C] text-white text-xl font-bold">{initials(selected)}</AvatarFallback>
                  }
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-[#222]">{fullName(selected)}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="capitalize">{selected.role}</Badge>
                    {selected.partner_level && <span className="flex items-center gap-1 text-xs text-[#f07969]"><Star className="w-3 h-3" />{selected.partner_level}</span>}
                    <Badge className={`text-xs ${isActive(selected) ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : 'bg-[#f07969]/10 text-[#E65F5C]'}`}>
                      {isActive(selected) ? 'active' : 'pending'}
                    </Badge>
                  </div>
                  {(selected.subroles ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(selected.subroles ?? []).map(sr => {
                        const cfg = roleBadgeConfig[sr as keyof typeof roleBadgeConfig];
                        if (!cfg) return null;
                        return <span key={sr} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selected.bio && <p className="text-sm text-[#555353]">{selected.bio}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                  <p className="text-xs text-[#9e9e9e] mb-0.5">Company</p>
                  <p className="text-sm font-medium text-[#222]">{selected.org_name || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                  <p className="text-xs text-[#9e9e9e] mb-0.5">Sector</p>
                  <p className="text-sm font-medium text-[#222]">{selected.org_industries?.[0] || '—'}</p>
                </div>
                {(selected.city || selected.country) && (
                  <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0] col-span-2">
                    <p className="text-xs text-[#9e9e9e] mb-0.5">Location</p>
                    <p className="text-sm font-medium text-[#222]">{[selected.city, selected.country].filter(Boolean).join(', ')}</p>
                  </div>
                )}
              </div>

              {(selected.expertise_domains ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#444] mb-2 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-[#e33b5f]" /> Expertise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selected.expertise_domains ?? []).map(e => <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>)}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#555353]">
                  <Mail className="w-4 h-4 text-[#9e9e9e]" /><span>{selected.email}</span>
                </div>
                {selected.linkedin_url && (
                  <a href={selected.linkedin_url.startsWith('http') ? selected.linkedin_url : `https://${selected.linkedin_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#0077b5] hover:underline">
                    <Linkedin className="w-4 h-4" />{selected.linkedin_url} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {isAdmin && (
                <div className="border border-[#f0f0f0] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#444] flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-[#e33b5f]" /> Subrole Badges</p>
                    {!editingBadges
                      ? <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setEditingBadges(true)}>Edit</Button>
                      : <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs px-2 bg-[#e33b5f] text-white" onClick={saveBadges} disabled={savingBadges}>
                            {savingBadges ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Save</>}
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => { setEditingBadges(false); setBadgeDraft((selected.subroles ?? []) as SubRole[]); }}><X className="w-3 h-3" /></Button>
                        </div>
                    }
                  </div>
                  {!editingBadges ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(selected.subroles ?? []).length === 0
                        ? <p className="text-xs text-[#9e9e9e]">No subrole badges assigned</p>
                        : (selected.subroles ?? []).map(sr => {
                            const cfg = roleBadgeConfig[sr as keyof typeof roleBadgeConfig];
                            if (!cfg) return null;
                            return <span key={sr} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
                          })
                      }
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {ALL_SUBROLES.map(sr => {
                        const cfg = roleBadgeConfig[sr];
                        const active = badgeDraft.includes(sr);
                        return (
                          <button key={sr} onClick={() => toggleBadge(sr)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition ${active ? `${cfg.color}` : 'bg-white text-[#9e9e9e] border-[#e8e8e8] hover:border-[#ccc]'}`}>
                            {active && <Check className="w-3 h-3" />}{cfg.icon} {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button className="flex-1 bg-[#e33b5f] hover:bg-[#c02d4f] text-white"><MessageSquare className="w-4 h-4 mr-2" /> Message</Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
