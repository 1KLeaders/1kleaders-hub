'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, MessageSquare, Star, Mail, Linkedin, ExternalLink, DollarSign, Building2, Briefcase, Lightbulb, Tag, X, Check } from 'lucide-react';
import type { Page, DashboardRole, SubRole, subRoleConfig } from './types';
import { roleBadgeConfig } from './types';

interface Props { navigate?: (page: Page) => void; role?: DashboardRole; }

type Partner = {
  id: number;
  name: string;
  role: string;
  level: string;
  status: string;
  contribution: string;
  initials: string;
  email: string;
  linkedin: string;
  bio: string;
  company: string;
  sector: string;
  expertise: string[];
  subroles: SubRole[];
};

const partners: Partner[] = [
  { id: 1, name: 'Ahmed Al-Rashid',  role: 'Shareholder', level: 'Gold',     status: 'active',  contribution: '$800K',  initials: 'AR', email: 'ahmed@example.com',   linkedin: 'linkedin.com/in/ahmed',   bio: 'Serial entrepreneur and investor focused on MENA tech ecosystem.',         company: 'Al-Rashid Ventures',    sector: 'Technology',        expertise: ['Investment Strategy', 'Venture Capital', 'Board Advisory'],    subroles: ['founder'] },
  { id: 2, name: 'Fatima Khalid',    role: 'Shareholder', level: 'Silver',   status: 'active',  contribution: '$500K',  initials: 'FK', email: 'fatima@example.com',   linkedin: 'linkedin.com/in/fatima',  bio: 'HealthTech founder and strategic advisor.',                                company: 'Khalid Health Group',    sector: 'Healthcare',        expertise: ['HealthTech', 'Strategy', 'Operations'],                       subroles: ['idea-owner'] },
  { id: 3, name: 'Omar Hassan',      role: 'Shareholder', level: 'Platinum', status: 'active',  contribution: '$1.2M',  initials: 'OH', email: 'omar@example.com',     linkedin: 'linkedin.com/in/omar',    bio: 'Seasoned investor with 20+ portfolio companies across MENA.',              company: 'Hassan Capital',         sector: 'Financial Services', expertise: ['Portfolio Management', 'M&A', 'FinTech'],                     subroles: ['vep-builder'] },
  { id: 4, name: 'Sara Mohammed',    role: 'User',        level: '-',        status: 'pending', contribution: '-',      initials: 'SM', email: 'sara@example.com',     linkedin: '',                        bio: 'Fintech professional exploring investment opportunities.',                  company: 'Independent',            sector: 'FinTech',           expertise: ['Finance', 'Compliance'],                                      subroles: [] },
  { id: 5, name: 'Khalid Nasser',    role: 'Shareholder', level: 'Gold',     status: 'active',  contribution: '$400K',  initials: 'KN', email: 'khalid@example.com',   linkedin: 'linkedin.com/in/khalid',  bio: 'PropTech and real estate innovation specialist.',                          company: 'Nasser Properties',      sector: 'Real Estate Tech',  expertise: ['PropTech', 'Project Management', 'Sales'],                    subroles: [] },
  { id: 6, name: 'Noura Ali',        role: 'Shareholder', level: 'Silver',   status: 'active',  contribution: '$180K',  initials: 'NA', email: 'noura@example.com',     linkedin: 'linkedin.com/in/noura',   bio: 'EdTech investor and former academic.',                                     company: 'Ali EdVentures',         sector: 'Education',         expertise: ['EdTech', 'Data Analytics', 'Research'],                      subroles: ['mab-builder'] },
  { id: 7, name: 'Tariq Ibrahim',    role: 'Shareholder', level: 'Gold',     status: 'inactive', contribution: '$400K', initials: 'TI', email: 'tariq@example.com',    linkedin: '',                        bio: 'Manufacturing and logistics entrepreneur.',                                company: 'Ibrahim Manufacturing',  sector: 'Logistics',         expertise: ['Operations', 'Supply Chain', 'Sustainability'],               subroles: [] },
  { id: 8, name: 'Layla Abdullah',   role: 'User',        level: '-',        status: 'pending', contribution: '-',      initials: 'LA', email: 'layla@example.com',     linkedin: '',                        bio: 'Startup founder evaluating membership.',                                   company: 'Independent',            sector: 'Technology',        expertise: ['Marketing', 'Product Development'],                           subroles: ['founder', 'idea-owner'] },
];

const ALL_SUBROLES: SubRole[] = ['idea-owner', 'founder', 'vep-builder', 'mab-builder'];
const filterOptions = ['All', 'Shareholder', 'User'];

export default function ShareholdersPage({ navigate, role }: Props) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Partner | null>(null);
  const [partnerList, setPartnerList] = useState<Partner[]>(partners);
  const [editingBadges, setEditingBadges] = useState(false);
  const [badgeDraft, setBadgeDraft] = useState<SubRole[]>([]);

  const isAdmin = role === 'admin' || role === 'super-admin';

  const filtered = partnerList.filter(p => {
    if (filter !== 'All' && p.role !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openProfile = (p: Partner) => {
    setSelected(p);
    setBadgeDraft(p.subroles);
    setEditingBadges(false);
  };

  const toggleBadge = (sr: SubRole) => {
    setBadgeDraft(prev => prev.includes(sr) ? prev.filter(x => x !== sr) : [...prev, sr]);
  };

  const saveBadges = () => {
    if (!selected) return;
    setPartnerList(prev => prev.map(p => p.id === selected.id ? { ...p, subroles: badgeDraft } : p));
    setSelected(prev => prev ? { ...prev, subroles: badgeDraft } : null);
    setEditingBadges(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">Shareholders & Members</h1>
        <p className="text-[#7e7e7e]">Connect with platform shareholders and members</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search members..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterOptions.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filter === f ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#555353] hover:bg-[#e8e8e8]'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Members',   value: partnerList.length },
          { label: 'Active',          value: partnerList.filter(p => p.status === 'active').length },
          { label: 'Pending',         value: partnerList.filter(p => p.status === 'pending').length },
          ...(isAdmin
            ? [{ label: 'Total Contribution', value: '$2.88M' }]
            : [{ label: 'Shareholders', value: partnerList.filter(p => p.role === 'Shareholder').length }]),
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-[#222]">{s.value}</div>
              <div className="text-xs text-[#7e7e7e]">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Card key={p.id} className="hover:shadow-md transition cursor-pointer group" onClick={() => openProfile(p)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm font-semibold">{p.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-[#222] truncate group-hover:text-[#e33b5f] transition">{p.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <Badge variant="secondary" className="text-xs">{p.role}</Badge>
                    {p.level !== '-' && <span className="flex items-center gap-1 text-xs text-[#f07969]"><Star className="w-3 h-3" />{p.level}</span>}
                  </div>
                </div>
              </div>

              {/* Company & Sector */}
              <div className="space-y-1 mb-3">
                {p.company && (
                  <p className="text-xs text-[#7e7e7e] flex items-center gap-1.5"><Building2 className="w-3 h-3 shrink-0" />{p.company}</p>
                )}
                {p.sector && (
                  <p className="text-xs text-[#7e7e7e] flex items-center gap-1.5"><Briefcase className="w-3 h-3 shrink-0" />{p.sector}</p>
                )}
              </div>

              {/* Subrole badges */}
              {p.subroles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.subroles.map(sr => {
                    const cfg = roleBadgeConfig[sr];
                    return <span key={sr} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
                  })}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-[#7e7e7e] mb-3">
                {isAdmin && p.contribution !== '-' && (
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /><strong className="text-[#222]">{p.contribution}</strong></span>
                )}
                <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className={`text-xs ml-auto ${p.status === 'active' ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : p.status === 'pending' ? 'bg-[#f07969]/10 text-[#E65F5C]' : 'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
                  {p.status}
                </Badge>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={e => { e.stopPropagation(); }}><MessageSquare className="w-3 h-3 mr-1" /> Message</Button>
                <Button variant="outline" size="sm" className="flex-1 text-[#e33b5f] border-[#e33b5f]/30 hover:bg-[#e33b5f]/5" onClick={e => { e.stopPropagation(); openProfile(p); }}>View Profile</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profile Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Member Profile</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Header */}
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-[#e33b5f] to-[#E65F5C] text-white text-xl font-bold">{selected.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-[#222]">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">{selected.role}</Badge>
                    {selected.level !== '-' && <span className="flex items-center gap-1 text-xs text-[#f07969]"><Star className="w-3 h-3" />{selected.level}</span>}
                    <Badge className={`text-xs ${selected.status === 'active' ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : 'bg-[#f07969]/10 text-[#E65F5C]'}`}>{selected.status}</Badge>
                  </div>
                  {/* Subrole badges */}
                  {selected.subroles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {selected.subroles.map(sr => {
                        const cfg = roleBadgeConfig[sr];
                        return <span key={sr} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selected.bio && <p className="text-sm text-[#555353]">{selected.bio}</p>}

              {/* Key Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                  <p className="text-xs text-[#9e9e9e] mb-0.5">Company</p>
                  <p className="text-sm font-medium text-[#222]">{selected.company || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-[#f6f6f6] border border-[#f0f0f0]">
                  <p className="text-xs text-[#9e9e9e] mb-0.5">Sector</p>
                  <p className="text-sm font-medium text-[#222]">{selected.sector || '—'}</p>
                </div>
              </div>

              {/* Expertise */}
              {selected.expertise.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#444] mb-2 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-[#e33b5f]" /> Expertise</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.expertise.map(e => <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>)}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="space-y-2">
                {selected.email && (
                  <div className="flex items-center gap-2 text-sm text-[#555353]">
                    <Mail className="w-4 h-4 text-[#9e9e9e]" /><span>{selected.email}</span>
                  </div>
                )}
                {selected.linkedin && (
                  <div className="flex items-center gap-2 text-sm text-[#555353]">
                    <Linkedin className="w-4 h-4 text-[#9e9e9e]" />
                    <a href={`https://${selected.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-[#e33b5f] hover:underline flex items-center gap-1">
                      {selected.linkedin} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {isAdmin && selected.contribution !== '-' && (
                  <div className="flex items-center gap-2 text-sm text-[#555353]">
                    <DollarSign className="w-4 h-4 text-[#9e9e9e]" />
                    <span>Contribution: <strong className="text-[#222]">{selected.contribution}</strong></span>
                  </div>
                )}
              </div>

              {/* Admin: Badge Management */}
              {isAdmin && (
                <div className="border border-[#f0f0f0] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-[#444] flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-[#e33b5f]" /> Subrole Badges</p>
                    {!editingBadges
                      ? <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setEditingBadges(true)}>Edit</Button>
                      : <div className="flex gap-1">
                          <Button size="sm" className="h-6 text-xs px-2 bg-[#e33b5f] text-white hover:bg-[#c02d4f]" onClick={saveBadges}><Check className="w-3 h-3 mr-1" />Save</Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => { setEditingBadges(false); setBadgeDraft(selected.subroles); }}><X className="w-3 h-3" /></Button>
                        </div>
                    }
                  </div>
                  {!editingBadges ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selected.subroles.length === 0
                        ? <p className="text-xs text-[#9e9e9e]">No subrole badges assigned</p>
                        : selected.subroles.map(sr => {
                            const cfg = roleBadgeConfig[sr];
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
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition ${active ? `${cfg.color} opacity-100` : 'bg-white text-[#9e9e9e] border-[#e8e8e8] hover:border-[#ccc]'}`}>
                            {active && <Check className="w-3 h-3" />}
                            {cfg.icon} {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button className="flex-1 bg-[#e33b5f] hover:bg-[#c02d4f] text-white"><MessageSquare className="w-4 h-4 mr-2" /> Send Message</Button>
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
