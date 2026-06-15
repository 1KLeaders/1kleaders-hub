'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Info, AlertTriangle, CheckCircle, Trash2, Zap, Send, Plus, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
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
  audience?: string;
}

const initialNotifications: Notification[] = [
  { id: 1, title: 'New partnership opportunity', desc: 'A new venture matching your interests has been posted.', type: 'info', time: '5 min ago', read: false },
  { id: 2, title: 'Agreement ready for signature', desc: 'Your partner agreement has been sent via DocuSign.', type: 'action', time: '1 hour ago', read: false, actionRequired: true },
  { id: 3, title: 'Q4 dividend distribution', desc: 'Your portfolio dividend for Q4 has been processed.', type: 'success', time: '3 hours ago', read: false },
  { id: 4, title: 'KYC verification expiring', desc: 'Your identity documents expire in 30 days. Please update.', type: 'warning', time: '6 hours ago', read: true },
  { id: 5, title: 'System maintenance notice', desc: 'Platform maintenance scheduled for Saturday 2 AM.', type: 'warning', time: '3 days ago', read: true },
];

const typeConfig: Record<string, { icon: any; color: string }> = {
  info:    { icon: Info,          color: 'bg-[#f6f6f6] text-[#555353]' },
  action:  { icon: Bell,          color: 'bg-[#f07969]/10 text-[#f07969]' },
  success: { icon: CheckCircle,   color: 'bg-[#e33b5f]/10 text-[#e33b5f]' },
  warning: { icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
};

// All selectable audience targets
const AUDIENCE_OPTIONS = [
  { value: 'all',          label: 'All Users',         group: 'Roles' },
  { value: 'shareholder',  label: 'Shareholders',      group: 'Roles' },
  { value: 'user',         label: 'Users',             group: 'Roles' },
  { value: 'admin',        label: 'Admins',            group: 'Roles' },
  { value: 'idea-owner',   label: 'Idea Owners',       group: 'Subroles' },
  { value: 'founder',      label: 'Founders',          group: 'Subroles' },
  { value: 'vep-builder',  label: 'VEP Builders',      group: 'Subroles' },
  { value: 'mab-builder',  label: 'MAB Builders',      group: 'Subroles' },
];

export default function NotificationsPage({ navigate, role }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [showCompose, setShowCompose]     = useState(false);
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  // Compose state
  const [composeTitle,    setComposeTitle]    = useState('');
  const [composeDesc,     setComposeDesc]     = useState('');
  const [composeType,     setComposeType]     = useState('info');
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['all']);
  const [specificEmails,  setSpecificEmails]  = useState('');
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const toggleTarget = (v: string) => {
    if (v === 'all') { setSelectedTargets(['all']); return; }
    setSelectedTargets(prev => {
      const without = prev.filter(x => x !== 'all');
      return without.includes(v) ? without.filter(x => x !== v) : [...without, v];
    });
  };

  const audienceLabel = selectedTargets.includes('all') ? 'All Users' : selectedTargets.join(', ');

  const toggleActionRequired = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, actionRequired: !n.actionRequired } : n));
  };
  const deleteNotification = (id: number) => setNotifications(prev => prev.filter(n => n.id !== id));
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAll = () => setNotifications([]);

  const sendNotification = () => {
    if (!composeTitle.trim() || !composeDesc.trim()) return;
    setNotifications(prev => [{
      id: Date.now(),
      title: composeTitle,
      desc: composeDesc,
      type: composeType,
      time: 'Just now',
      read: false,
      audience: audienceLabel + (specificEmails.trim() ? ` + ${specificEmails.trim()}` : ''),
    }, ...prev]);
    setComposeTitle(''); setComposeDesc(''); setComposeType('info');
    setSelectedTargets(['all']); setSpecificEmails('');
    setShowCompose(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Notifications</h1>
          <p className="text-[#7e7e7e]">Stay updated with the latest platform activity</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Button
              size="sm"
              className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white"
              onClick={() => setShowCompose(v => !v)}
            >
              {showCompose ? <><ChevronUp className="w-4 h-4 mr-1" /> Hide Composer</> : <><Plus className="w-4 h-4 mr-1" /> New Notification</>}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={markAllRead}>Mark All Read</Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={clearAll}><Trash2 className="w-4 h-4 mr-1" /> Clear All</Button>
        </div>
      </div>

      {/* Admin Compose Panel */}
      {isAdmin && showCompose && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-[#e33b5f]">
              <Send className="w-4 h-4" /> Broadcast Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-[#222] text-sm">Title</Label>
                <Input placeholder="Notification title" className="border-[#f0f0f0] mt-1" value={composeTitle} onChange={e => setComposeTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-[#222] text-sm">Type</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {[['info','ℹ️'],['success','✅'],['warning','⚠️'],['action','🔔']].map(([v,icon]) => (
                    <button key={v} onClick={() => setComposeType(v)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${composeType === v ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                      {icon} {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-[#222] text-sm">Message</Label>
              <textarea className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none" rows={3} placeholder="Write your notification message..." value={composeDesc} onChange={e => setComposeDesc(e.target.value)} />
            </div>

            {/* Multi-select audience picker */}
            <div>
              <Label className="text-[#222] text-sm">Send to</Label>
              <div className="mt-1 border border-[#f0f0f0] rounded-lg overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#444] hover:bg-[#fafafa]"
                  onClick={() => setShowTargetPicker(v => !v)}
                >
                  <span className="truncate">{audienceLabel}</span>
                  {showTargetPicker ? <ChevronUp className="w-4 h-4 text-[#9e9e9e] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[#9e9e9e] shrink-0" />}
                </button>
                {showTargetPicker && (
                  <div className="border-t border-[#f0f0f0] p-3 space-y-3">
                    {['Roles', 'Subroles'].map(group => (
                      <div key={group}>
                        <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">{group}</p>
                        <div className="flex flex-wrap gap-2">
                          {AUDIENCE_OPTIONS.filter(o => o.group === group).map(o => {
                            const active = selectedTargets.includes(o.value) || selectedTargets.includes('all') && o.value === 'all';
                            const isSelected = selectedTargets.includes(o.value);
                            return (
                              <button key={o.value} onClick={() => toggleTarget(o.value)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition ${isSelected ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                                {isSelected && <Check className="w-3 h-3" />}{o.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div>
                      <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">Specific Users (emails)</p>
                      <Input placeholder="email@example.com, another@example.com" className="border-[#f0f0f0] text-xs h-8" value={specificEmails} onChange={e => setSpecificEmails(e.target.value)} />
                      <p className="text-[10px] text-[#9e9e9e] mt-1">Comma-separated. Will be combined with role selections above.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={sendNotification} disabled={!composeTitle.trim() || !composeDesc.trim()}>
              <Send className="w-4 h-4 mr-2" /> Send Notification
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <div className="flex items-start gap-3 p-3 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-lg">
          <Zap className="w-4 h-4 text-[#e33b5f] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#555353]">
            <span className="font-semibold text-[#e33b5f]">Admin tip:</span> Use <span className="font-semibold">New Notification</span> to broadcast to specific user groups. Click <span className="font-semibold">⚡ Mark Action Required</span> on any notification to flag it with a red ACTION REQUIRED badge.
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
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
              const tc = typeConfig[n.type] || typeConfig.info;
              const Icon = tc.icon;
              return (
                <div key={n.id} className={`flex items-start gap-3 p-4 hover:bg-[#fbfbfb] transition relative ${n.actionRequired ? 'bg-red-50 border-l-4 border-l-red-500' : !n.read ? 'bg-[#fafafa]' : ''}`}>
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
                      {n.audience && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-[#e33b5f]/30 text-[#e33b5f]">→ {n.audience}</Badge>
                      )}
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
                  <Button variant="ghost" size="sm" className="flex-shrink-0 mt-5" onClick={() => deleteNotification(n.id)}>
                    <Trash2 className="w-4 h-4 text-[#9e9e9e]" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
