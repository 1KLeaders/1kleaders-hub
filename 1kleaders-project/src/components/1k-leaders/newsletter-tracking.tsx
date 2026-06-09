'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Eye, Mail, MousePointer, Clock, CheckCircle, XCircle, TrendingUp, Users, BarChart3, Send } from 'lucide-react';
import type { RoleBadge } from './types';
import { roleBadgeConfig } from './types';

type Props = Record<string, never>;

function DigitalBadge({ role }: { role: RoleBadge }) {
  const config = roleBadgeConfig[role];
  if (!config) return null;
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>{config.icon} {config.label}</span>;
}

const newsletters = [
  { id: 1, title: 'Monthly Partner Update - May 2026', sentDate: '2026-05-15', recipients: 342, opened: 287, clicked: 156, interacted: 98, status: 'sent' },
  { id: 2, title: 'Q2 Venture Pipeline Report', sentDate: '2026-05-10', recipients: 342, opened: 312, clicked: 189, interacted: 134, status: 'sent' },
  { id: 3, title: 'New Feature Launch: AI Assistant', sentDate: '2026-05-05', recipients: 340, opened: 298, clicked: 201, interacted: 167, status: 'sent' },
  { id: 4, title: 'Weekly Digest #22', sentDate: '2026-05-01', recipients: 338, opened: 245, clicked: 123, interacted: 78, status: 'sent' },
];

const readerDetails = [
  { name: 'Ahmed Al-Rashid', role: 'shareholder' as RoleBadge, opened: true, clicked: true, interacted: true, lastActivity: '2 hours ago' },
  { name: 'Fatima Khalid', role: 'shareholder' as RoleBadge, opened: true, clicked: true, interacted: false, lastActivity: '5 hours ago' },
  { name: 'Omar Hassan', role: 'shareholder' as RoleBadge, opened: true, clicked: false, interacted: false, lastActivity: '1 day ago' },
  { name: 'Sara Mohammed', role: 'user' as RoleBadge, opened: true, clicked: true, interacted: true, lastActivity: '3 hours ago' },
  { name: 'Khalid Nasser', role: 'shareholder' as RoleBadge, opened: false, clicked: false, interacted: false, lastActivity: '-' },
  { name: 'Noura Ali', role: 'shareholder' as RoleBadge, opened: true, clicked: false, interacted: false, lastActivity: '6 hours ago' },
  { name: 'Tariq Ibrahim', role: 'shareholder' as RoleBadge, opened: false, clicked: false, interacted: false, lastActivity: '-' },
  { name: 'Layla Abdullah', role: 'idea-owner' as RoleBadge, opened: true, clicked: true, interacted: true, lastActivity: '1 hour ago' },
];

export default function NewsletterTracking({}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          <Mail className="w-6 h-6 text-[#e33b5f]" /> Newsletter Tracking
        </h1>
        <p className="text-[#7e7e7e]">Track who read, clicked, and interacted with your newsletters</p>
      </div>

      {/* Newsletter List */}
      <div className="space-y-4">
        {newsletters.map(nl => (
          <Card key={nl.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#e33b5f]/5 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[#e33b5f]" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{nl.title}</CardTitle>
                    <p className="text-xs text-[#9e9e9e]">Sent: {nl.sentDate}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm"><Send className="w-4 h-4 mr-1" /> Resend</Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="text-center p-2 bg-[#fbfbfb] rounded-lg">
                  <div className="text-lg font-bold text-[#222]">{nl.recipients}</div>
                  <div className="text-xs text-[#7e7e7e] flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Recipients</div>
                </div>
                <div className="text-center p-2 bg-[#e33b5f]/5 rounded-lg">
                  <div className="text-lg font-bold text-[#c02d4f]">{nl.opened}</div>
                  <div className="text-xs text-[#7e7e7e] flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> Opened</div>
                  <Progress value={(nl.opened / nl.recipients) * 100} className="h-1 mt-1" />
                </div>
                <div className="text-center p-2 bg-[#f07969]/5 rounded-lg">
                  <div className="text-lg font-bold text-[#E65F5C]">{nl.clicked}</div>
                  <div className="text-xs text-[#7e7e7e] flex items-center justify-center gap-1"><MousePointer className="w-3 h-3" /> Clicked</div>
                  <Progress value={(nl.clicked / nl.recipients) * 100} className="h-1 mt-1" />
                </div>
                <div className="text-center p-2 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-700">{nl.interacted}</div>
                  <div className="text-xs text-[#7e7e7e] flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" /> Interacted</div>
                  <Progress value={(nl.interacted / nl.recipients) * 100} className="h-1 mt-1" />
                </div>
              </div>

              {/* Reader Details */}
              <div className="border rounded-lg overflow-hidden">
                <div className="p-2 bg-[#fbfbfb] text-xs font-medium text-[#7e7e7e]">Reader Activity Details</div>
                <div className="divide-y divide-[#f0f0f0] max-h-48 overflow-y-auto">
                  {readerDetails.map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5"><AvatarFallback className="text-[8px]">{r.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                        <span className="font-medium text-[#222]">{r.name}</span>
                        <DigitalBadge role={r.role} />
                      </div>
                      <div className="flex items-center gap-2">
                        {r.opened ? <CheckCircle className="w-3.5 h-3.5 text-[#e33b5f]" /> : <XCircle className="w-3.5 h-3.5 text-[#d0d0d0]" />}
                        {r.clicked ? <CheckCircle className="w-3.5 h-3.5 text-[#f07969]" /> : <XCircle className="w-3.5 h-3.5 text-[#d0d0d0]" />}
                        {r.interacted ? <CheckCircle className="w-3.5 h-3.5 text-purple-500" /> : <XCircle className="w-3.5 h-3.5 text-[#d0d0d0]" />}
                        <span className="text-[#9e9e9e] w-20 text-right">{r.lastActivity}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 bg-[#fbfbfb] flex items-center gap-4 text-[10px] text-[#9e9e9e]">
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-[#e33b5f]" /> Opened</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-[#f07969]" /> Clicked</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-purple-500" /> Interacted</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
