'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Search, Plus, Eye, Send, Clock, CheckCircle, XCircle, Download } from 'lucide-react';

type Props = Record<string, never>;

const agreements = [
  { id: 1, title: 'Shareholder Agreement - Ahmed Al-Rashid', type: 'Shareholder', status: 'signed', date: '2026-05-15', party: 'Ahmed Al-Rashid' },
  { id: 2, title: 'NDA - TechVentures LLC', type: 'NDA', status: 'sent', date: '2026-05-18', party: 'TechVentures LLC' },
  { id: 3, title: 'Shareholder Agreement - Fatima K.', type: 'Shareholder', status: 'viewed', date: '2026-05-17', party: 'Fatima Khalid' },
  { id: 4, title: 'Idea Submission - GreenTech', type: 'Idea Submission', status: 'expired', date: '2026-04-20', party: 'Omar Hassan' },
  { id: 5, title: 'Shareholder Agreement - Sara M.', type: 'Shareholder', status: 'signed', date: '2026-05-10', party: 'Sara Mohammed' },
  { id: 6, title: 'NDA - InnovateCo', type: 'NDA', status: 'sent', date: '2026-05-19', party: 'InnovateCo' },
];

const statusConfig: Record<string, { color: string; icon: any }> = {
  signed: { color: 'bg-[#e33b5f]/10 text-[#c02d4f]', icon: CheckCircle },
  sent: { color: 'bg-[#f07969]/10 text-[#E65F5C]', icon: Send },
  viewed: { color: 'bg-[#f6f6f6] text-[#444]', icon: Eye },
  expired: { color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function AgreementsPage({}: Props) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = agreements.filter(a => {
    if (filter !== 'all' && a.type.toLowerCase() !== filter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Agreements</h1>
          <p className="text-[#7e7e7e]">Manage and track all platform agreements</p>
        </div>
        <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]"><Plus className="w-4 h-4 mr-2" /> New Agreement</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-[#9e9e9e]" />
          <Input placeholder="Search agreements..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="shareholder">Shareholder</SelectItem>
            <SelectItem value="shareholder">Shareholder</SelectItem>
            <SelectItem value="nda">NDA</SelectItem>
            <SelectItem value="idea submission">Idea Submission</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: agreements.length, color: 'bg-[#fbfbfb]' },
          { label: 'Signed', value: agreements.filter(a => a.status === 'signed').length, color: 'bg-[#e33b5f]/5' },
          { label: 'Pending', value: agreements.filter(a => a.status === 'sent' || a.status === 'viewed').length, color: 'bg-[#f07969]/5' },
          { label: 'Expired', value: agreements.filter(a => a.status === 'expired').length, color: 'bg-red-50' },
        ].map(s => (
          <Card key={s.label} className={s.color}>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-[#222]">{s.value}</div>
              <div className="text-xs text-[#7e7e7e]">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agreement List */}
      <Card>
        <CardHeader><CardTitle className="text-base">Agreement List</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filtered.map(a => {
              const sc = statusConfig[a.status];
              const Icon = sc.icon;
              return (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-[#fbfbfb] transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-[#9e9e9e] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#222] truncate">{a.title}</p>
                      <p className="text-xs text-[#9e9e9e]">{a.party} &bull; {a.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">{a.type}</Badge>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>
                      <Icon className="w-3 h-3" />{a.status}
                    </span>
                    <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm"><Download className="w-4 h-4" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* DocuSign Integration */}
      <Card className="border-amber-200 bg-[#f07969]/5/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#f07969]/10 flex items-center justify-center">
              <Send className="w-6 h-6 text-[#f07969]" />
            </div>
            <div>
              <h3 className="font-semibold text-[#222]">DocuSign Integration</h3>
              <p className="text-sm text-[#7e7e7e]">Send agreements for electronic signature directly from the platform.</p>
            </div>
            <Button variant="outline" className="ml-auto">Configure</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
