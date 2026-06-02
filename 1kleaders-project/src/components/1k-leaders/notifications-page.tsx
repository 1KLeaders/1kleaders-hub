'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Info, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import type { Page } from './types';

interface Props { navigate: (page: Page) => void; }

const notifications = [
  { id: 1, title: 'New partnership opportunity', desc: 'A new venture matching your interests has been posted.', type: 'info', time: '5 min ago', read: false },
  { id: 2, title: 'Agreement ready for signature', desc: 'Your partner agreement has been sent via DocuSign.', type: 'action', time: '1 hour ago', read: false },
  { id: 3, title: 'Investment milestone reached', desc: 'Your portfolio has exceeded the $2M mark.', type: 'success', time: '3 hours ago', read: false },
  { id: 4, title: 'KYC verification expiring', desc: 'Your identity documents expire in 30 days. Please update.', type: 'warning', time: '6 hours ago', read: true },
  { id: 5, title: 'New idea submitted for review', desc: 'A new idea in the FinTech sector has been submitted.', type: 'info', time: '1 day ago', read: true },
  { id: 6, title: 'Meeting reminder', desc: 'Partner meeting scheduled for tomorrow at 10 AM.', type: 'action', time: '1 day ago', read: true },
  { id: 7, title: 'Dividend payment received', desc: 'Q4 dividend of $12,500 has been credited.', type: 'success', time: '2 days ago', read: true },
  { id: 8, title: 'System maintenance notice', desc: 'Platform maintenance scheduled for Saturday 2 AM.', type: 'warning', time: '3 days ago', read: true },
];

const typeConfig: Record<string, { icon: any; color: string }> = {
  info: { icon: Info, color: 'bg-[#f6f6f6] text-[#555353]' },
  action: { icon: Bell, color: 'bg-[#f07969]/10 text-[#f07969]' },
  success: { icon: CheckCircle, color: 'bg-[#e33b5f]/10 text-[#e33b5f]' },
  warning: { icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
};

export default function NotificationsPage({ navigate }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Notifications</h1>
          <p className="text-[#7e7e7e]">Stay updated with the latest platform activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Mark All Read</Button>
          <Button variant="outline" size="sm" className="text-red-600"><Trash2 className="w-4 h-4 mr-1" /> Clear All</Button>
        </div>
      </div>

      {/* Unread count */}
      <div className="flex items-center gap-2">
        <Badge className="bg-[#e33b5f]/10 text-[#c02d4f]">{notifications.filter(n => !n.read).length} Unread</Badge>
        <span className="text-sm text-[#7e7e7e]">notifications</span>
      </div>

      {/* Notification List */}
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-[#f0f0f0] max-h-[600px] overflow-y-auto">
            {notifications.map(n => {
              const tc = typeConfig[n.type];
              const Icon = tc.icon;
              return (
                <div key={n.id} className={`flex items-start gap-3 p-4 hover:bg-[#fbfbfb] transition ${!n.read ? 'bg-[#e33b5f]/5/30' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${!n.read ? 'text-[#222]' : 'text-[#555353]'}`}>{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[#e33b5f]/50" />}
                    </div>
                    <p className="text-xs text-[#7e7e7e] mt-0.5">{n.desc}</p>
                    <p className="text-xs text-[#9e9e9e] mt-1">{n.time}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="flex-shrink-0"><Trash2 className="w-4 h-4 text-[#9e9e9e]" /></Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
