'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Search, FileText, Download, Eye, CheckCircle, Clock, Shield, FolderOpen } from 'lucide-react';

import type { DashboardRole } from './types';
interface Props { role?: DashboardRole; }

const categories = ['All', 'KYC', 'Agreements', 'Company', 'Idea', 'Financial', 'Partner'];

const docs = [
  { id: 1, name: 'National ID - Ahmed Al-Rashid', category: 'KYC', status: 'verified', date: '2026-05-15', size: '2.4 MB' },
  { id: 2, name: 'Partner Agreement v2', category: 'Agreements', status: 'pending', date: '2026-05-18', size: '1.1 MB' },
  { id: 3, name: 'Business Plan - GreenTech', category: 'Idea', status: 'verified', date: '2026-05-17', size: '5.2 MB' },
  { id: 4, name: 'Financial Report Q1 2026', category: 'Financial', status: 'verified', date: '2026-05-10', size: '3.7 MB' },
  { id: 5, name: 'Certificate of Incorporation', category: 'Company', status: 'verified', date: '2026-04-20', size: '890 KB' },
  { id: 6, name: 'Partner KYC - Sara M.', category: 'Partner', status: 'pending', date: '2026-05-19', size: '1.8 MB' },
  { id: 7, name: 'NDA - TechVentures', category: 'Agreements', status: 'expired', date: '2026-03-01', size: '450 KB' },
  { id: 8, name: 'Tax Registration', category: 'Company', status: 'verified', date: '2026-04-15', size: '320 KB' },
];

const statusColors: Record<string, string> = {
  verified: 'bg-[#e33b5f]/10 text-[#c02d4f]',
  pending: 'bg-[#f07969]/10 text-[#E65F5C]',
  expired: 'bg-red-100 text-red-700',
};

export default function DocumentsPage({}: Props) {
  const [activeCat, setActiveCat] = useState('All');
  const [search, setSearch] = useState('');

  const filtered = docs.filter(d => {
    if (activeCat !== 'All' && d.category !== activeCat) return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Documents</h1>
          <p className="text-[#7e7e7e]">Manage and organize all platform documents</p>
        </div>
        <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]"><Upload className="w-4 h-4 mr-2" /> Upload Document</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-[#9e9e9e]" />
        <Input placeholder="Search documents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(c => (
          <button key={c} onClick={() => setActiveCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${activeCat === c ? 'bg-[#e33b5f] text-white' : 'bg-[#f6f6f6] text-[#555353] hover:bg-[#e8e8e8]'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Docs', value: docs.length, icon: FolderOpen },
          { label: 'Verified', value: docs.filter(d => d.status === 'verified').length, icon: CheckCircle },
          { label: 'Pending Review', value: docs.filter(d => d.status === 'pending').length, icon: Clock },
          { label: 'Secure', value: docs.filter(d => d.status === 'verified').length, icon: Shield },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className="w-5 h-5 text-[#e33b5f]" />
              <div>
                <div className="text-lg font-bold text-[#222]">{s.value}</div>
                <div className="text-xs text-[#7e7e7e]">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document List */}
      <Card>
        <CardHeader><CardTitle className="text-base">Documents</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-[#fbfbfb] transition">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-[#9e9e9e] flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#222] truncate">{d.name}</p>
                    <p className="text-xs text-[#9e9e9e]">{d.size} &bull; {d.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">{d.category}</Badge>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status]}`}>{d.status}</span>
                  <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
