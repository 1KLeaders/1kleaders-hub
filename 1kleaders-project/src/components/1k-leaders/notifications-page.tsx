'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Info, AlertTriangle, CheckCircle, Trash2, Zap, X } from 'lucide-react';
import type { Page, DashboardRole } from './types';

interface Props { navigate: (page: Page) => void; role?: DashboardRole; }

interface Notification {
  id: number;
  title: string;
  desc: string;
  type: string;
  time: string;
  read: boolean;
  actionRequired?: boolean;
}

const initialNotifications: Notification[] = [
  { id: 1, title: 'New partnership opportunity', desc: 'A new venture matching your interests has been posted.', type: 'info', time: '5 min ago', read: false },
  { id: 2, title: 'Agreement ready for signature', desc: 'Your partner agreement has been sent via DocuSign.', type: 'action', time: '1 hour ago', read: false, actionRequired: true },
  { id: 3, title: 'Investment milestone reached', desc: 'Your portfolio has exceeded the $2M mark.', type: 'success', time: '3 hours ago', read: false },
  { id: 4, title: 'KYC verification expiring', desc: 'Your identity documents expire in 30 days. Please update.', type: 'warning', time: '6 hours ago', read: true },
  { id: 5, title: 'New idea submitted for review', desc: 'A new idea in the FinTech sector has been submitted.', type: 'info', time: '1 day ago', read: true },
  { id: 6, title: 'Startup approval pending', desc: 'Approve pending startup submission before tomorrow at 10 AM.', type: 'action', time: '1 day ago', read: false, actionRequired: true },
  { id: 7, title: 'Dividend payment received', desc: 'Q4 dividend of $12,500 has been credited.', type: 'success', time: '2 days ago', read: true },
  { id: 8, title: 'System maintenance notice', desc: 'Platform maintenance scheduled for Saturday 2 AM.', type: 'warning', time: '3 days ago', read: true },
];

const typeConfig: Record<string, { icon: any; color: string }> = {
  info: { icon: Info, color: 'bg-[#f6f6f6] text-[#555353]' },
  action: { icon: Bell, color: 'bg-[#f07969]/10 text-[#f07969]' },
  success: { icon: CheckCircle, color: 'bg-[#e33b5f]/10 text-[#e33b5f]' },
  warning: { icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
};

export default function NotificationsPage({ navigate, role }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const isAdmin = role === 'admin' || role === 'super-admin';

  const toggleActionRequired = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, actionRequired: !n.actionRequired } : n));
  };

  const deleteNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Notifications</h1>
          <p className="text-[#7e7e7e]">Stay updated with the latest platform activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead}>Mark All Read</Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={clearAll}><Trash2 className="w-4 h-4 mr-1" /> Clear All</Button>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-start gap-3 p-3 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg">
          <Zap className="w-4 h-4 text-[#e33b5f] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#555353]">
            <span className="font-semibold text-[#e33b5f]">Admin tip:</span> Click <span className="font-semibold">⚡ Mark Action Required</span> on any notification to flag it with a red ACTION REQUIRED sticker visible to all users.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Badge className="bg-[#e33b5f]/10 text-[#c02d4f]">{notifications.filter(n => !n.read).length} Unread</Badge>
        {notifications.filter(n => n.actionRequired).length > 0 && (
          <Badge className="bg-red-600 text-white animate-pulse">{notifications.filter(n => n.actionRequired).length} Action Required</Badge>
        )}
        <span className="text-sm text-[#7e7e7e]">notifications</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-[#f0f0f0] max-h-[600px] overflow-y-auto">
            {notifications.length === 0 && (
              <div className="p-8 text-center text-[#9e9e9e] text-sm">No notifications</div>
            )}
            {notifications.map(n => {
              const tc = typeConfig[n.type];
              const Icon = tc.icon;
              return (
                <div key={n.id} className={`flex items-start gap-3 p-4 hover:bg-[#fbfbfb] transition relative ${n.actionRequired ? 'bg-red-50 border-l-4 border-l-red-500' : !n.read ? 'bg-[#fafafa]' : ''}`}>
                  {/* ACTION REQUIRED sticker */}
                  {n.actionRequired && (
                    <div className="absolute top-3 right-12 flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse">
                      <Zap className="w-2.5 h-2.5" /> Action Required
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${!n.read ? 'text-[#222]' : 'text-[#555353]'}`}>{n.title}</p>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[#e33b5f]/50" />}
                    </div>
                    <p className="text-xs text-[#7e7e7e] mt-0.5">{n.desc}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <p className="text-xs text-[#9e9e9e]">{n.time}</p>
                      {isAdmin && (
                        <button
                          onClick={() => toggleActionRequired(n.id)}
                          className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border transition ${n.actionRequired ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' : 'bg-[#f0f0f0] text-[#7e7e7e] border-[#e8e8e8] hover:border-red-300 hover:text-red-600'}`}
                        >
                          <Zap className="w-2.5 h-2.5" />
                          {n.actionRequired ? 'Remove Action Flag' : '⚡ Mark Action Required'}
                        </button>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="flex-shrink-0 mt-5" onClick={() => deleteNotification(n.id)}><Trash2 className="w-4 h-4 text-[#9e9e9e]" /></Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
