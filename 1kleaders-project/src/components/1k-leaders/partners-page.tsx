'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MessageSquare, Calendar, Mail, TrendingUp, Star } from 'lucide-react';

import type { Page } from './types';
interface Props { navigate?: (page: Page) => void; }

const partners = [
  { id: 1, name: 'Ahmed Al-Rashid', role: 'Shareholder', level: 'Gold', status: 'active', initials: 'AR' },
  { id: 2, name: 'Fatima Khalid', role: 'Shareholder', level: 'Silver', status: 'active', initials: 'FK' },
  { id: 3, name: 'Omar Hassan', role: 'Investor', level: 'Platinum', status: 'active', contribution: '$1.2M', initials: 'OH' },
  { id: 4, name: 'Sara Mohammed', role: 'Prospective', level: '-', status: 'pending', contribution: '-', initials: 'SM' },
  { id: 5, name: 'Khalid Nasser', role: 'Shareholder', level: 'Gold', status: 'active', initials: 'KN' },
  { id: 6, name: 'Noura Ali', role: 'Investor', level: 'Silver', status: 'active', contribution: '$180K', initials: 'NA' },
  { id: 7, name: 'Tariq Ibrahim', role: 'Shareholder', level: 'Gold', status: 'inactive', contribution: '$400K', initials: 'TI' },
  { id: 8, name: 'Layla Abdullah', role: 'Prospective', level: '-', status: 'pending', contribution: '-', initials: 'LA' },
];

const filterOptions = ['All', 'Shareholder', 'Shareholder', 'Investor', 'Prospective'];

export default function ShareholdersPage({}: Props) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = partners.filter(p => {
    if (filter !== 'All' && p.role !== filter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222]">Shareholders</h1>
        <p className="text-[#7e7e7e]">Manage and connect with platform partners</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search partners..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterOptions.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${filter === f ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#555353] hover:bg-[#e8e8e8]'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Shareholders', value: partners.length },
          { label: 'Active', value: partners.filter(p => p.status === 'active').length },
          { label: 'Pending', value: partners.filter(p => p.status === 'pending').length },
          { label: 'Total Contribution', value: '$2.88M' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-[#222]">{s.value}</div>
              <div className="text-xs text-[#7e7e7e]">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Shareholder Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Card key={p.id} className="hover:shadow-md transition">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-sm font-semibold">{p.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-[#222] truncate">{p.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{p.role}</Badge>
                    {p.level !== '-' && (
                      <span className="flex items-center gap-1 text-xs text-[#f07969]"><Star className="w-3 h-3" />{p.level}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[#7e7e7e] mb-3">
                <span>Contribution: <strong className="text-[#222]">{p.contribution}</strong></span>
                <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className={`text-xs ${p.status === 'active' ? 'bg-[#e33b5f]/10 text-[#c02d4f]' : p.status === 'pending' ? 'bg-[#f07969]/10 text-[#E65F5C]' : 'bg-[#f6f6f6] text-[#7e7e7e]'}`}>
                  {p.status}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"><MessageSquare className="w-3 h-3 mr-1" /> Message</Button>
                <Button variant="outline" size="sm" className="flex-1"><Calendar className="w-3 h-3 mr-1" /> Meeting</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
