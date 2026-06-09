'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, MessageSquare, TrendingUp, Star, Mail, Linkedin, ExternalLink, DollarSign, X } from 'lucide-react';
import type { Page, DashboardRole } from './types';

interface Props { navigate?: (page: Page) => void; role?: DashboardRole; }

const partners = [
  { id: 1, name: 'Ahmed Al-Rashid', role: 'Shareholder', level: 'Gold', status: 'active', contribution: '$800K', initials: 'AR', email: 'ahmed@example.com', linkedin: 'linkedin.com/in/ahmed', bio: 'Serial entrepreneur and investor focused on MENA tech ecosystem.' },
  { id: 2, name: 'Fatima Khalid', role: 'Shareholder', level: 'Silver', status: 'active', contribution: '$500K', initials: 'FK', email: 'fatima@example.com', linkedin: 'linkedin.com/in/fatima', bio: 'HealthTech founder and strategic advisor.' },
  { id: 3, name: 'Omar Hassan', role: 'Investor', level: 'Platinum', status: 'active', contribution: '$1.2M', initials: 'OH', email: 'omar@example.com', linkedin: 'linkedin.com/in/omar', bio: 'Seasoned investor with 20+ portfolio companies across MENA.' },
  { id: 4, name: 'Sara Mohammed', role: 'Prospective', level: '-', status: 'pending', contribution: '-', initials: 'SM', email: 'sara@example.com', linkedin: '', bio: 'Fintech professional exploring investment opportunities.' },
  { id: 5, name: 'Khalid Nasser', role: 'Shareholder', level: 'Gold', status: 'active', contribution: '$400K', initials: 'KN', email: 'khalid@example.com', linkedin: 'linkedin.com/in/khalid', bio: 'PropTech and real estate innovation specialist.' },
  { id: 6, name: 'Noura Ali', role: 'Investor', level: 'Silver', status: 'active', contribution: '$180K', initials: 'NA', email: 'noura@example.com', linkedin: 'linkedin.com/in/noura', bio: 'EdTech investor and former academic.' },
  { id: 7, name: 'Tariq Ibrahim', role: 'Shareholder', level: 'Gold', status: 'inactive', contribution: '$400K', initials: 'TI', email: 'tariq@example.com', linkedin: '', bio: 'Manufacturing and logistics entrepreneur.' },
  { id: 8, name: 'Layla Abdullah', role: 'Prospective', level: '-', status: 'pending', contribution: '-', initials: 'LA', email: 'layla@example.com', linkedin: '', bio: 'Startup founder evaluating membership.' },
];

const filterOptions = ['All', 'Shareholder', 'Investor', 'Prospective'];

export default function ShareholdersPage({ navigate, role }: Props) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof partners[0] | null>(null);

  const isAdmin = role === 'admin' || role === 'super-admin';

  const filtered = partners.filter(p => {
    if (filter !== 'All' && p.role !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">Shareholders</h1>
        <p className="text-[#7e7e7e]">Connect with platform shareholders and investors</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search shareholders..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
          { label: 'Total Members', value: partners.length },
          { label: 'Active', value: partners.filter(p => p.status === 'active').length },
          { label: 'Pending', value: partners.filter(p => p.status === 'pending').length },
          ...(isAdmin ? [{ label: 'Total Contribution', value: '$2.88M' }] : [{ label: 'Investors', value: partners.filter(p => p.role === 'Investor').length }]),
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
          <Card key={p.id} className="hover:shadow-md transition cursor-pointer group" onClick={() => setSelected(p)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm font-semibold">{p.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-[#222] truncate group-hover:text-[#e33b5f] transition">{p.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{p.role}</Badge>
                    {p.level !== '-' && (
                      <span className="flex items-center gap-1 text-xs text-[#f07969]"><Star className="w-3 h-3" />{p.level}</span>
                    )}
                  </div>
                </div>
              </div>
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
                <Button variant="outline" size="sm" className="flex-1 text-[#e33b5f] border-[#e33b5f]/30 hover:bg-[#e33b5f]/5" onClick={e => { e.stopPropagation(); setSelected(p); }}>View Profile</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Profile Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Shareholder Profile</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-br from-[#e33b5f] to-[#E65F5C] text-white text-xl font-bold">{selected.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold text-[#222]">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{selected.role}</Badge>
                    {selected.level !== '-' && <span className="flex items-center gap-1 text-xs text-[#f07969]"><Star className="w-3 h-3" />{selected.level}</span>}
                  </div>
                  <Badge className={`text-xs mt-1 ${selected.status === 'active' ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : 'bg-[#f07969]/10 text-[#E65F5C]'}`}>{selected.status}</Badge>
                </div>
              </div>

              {selected.bio && <p className="text-sm text-[#555353]">{selected.bio}</p>}

              <div className="space-y-2">
                {selected.email && (
                  <div className="flex items-center gap-2 text-sm text-[#555353]">
                    <Mail className="w-4 h-4 text-[#9e9e9e]" />
                    <span>{selected.email}</span>
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

              <div className="flex gap-2 pt-2">
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
