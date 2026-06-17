'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bell, Info, AlertTriangle, CheckCircle, Trash2, Zap, Send, Plus, ChevronDown, ChevronUp, Check, Loader2, RefreshCw } from 'lucide-react';
import type { Page, DashboardRole } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { navigate: (page: Page) => void; role?: DashboardRole; }

type DbNotification = {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  audience_roles: string[] | null;
  sent_by: string | null;
};

const typeConfig: Record<string, { icon: any; color: string }> = {
  info:    { icon: Info,          color: 'bg-[#f6f6f6] text-[#555353]' },
  action:  { icon: Bell,          color: 'bg-[#f07969]/10 text-[#f07969]' },
  success: { icon: CheckCircle,   color: 'bg-[#e33b5f]/10 text-[#e33b5f]' },
  warning: { icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
};

const AUDIENCE_OPTIONS = [
  { value: 'all',          label: 'All Users',     group: 'Roles' },
  { value: 'shareholder',  label: 'Shareholders',  group: 'Roles' },
  { value: 'user',         label: 'Users',         group: 'Roles' },
  { value: 'admin',        label: 'Admins',        group: 'Roles' },
  { value: 'idea-owner',   label: 'Idea Owners',   group: 'Subroles' },
  { value: 'founder',      label: 'Founders',      group: 'Subroles' },
  { value: 'vep-builder',  label: 'VEP Builders',  group: 'Subroles' },
  { value: 'mab-builder',  label: 'MAB Builders',  group: 'Subroles' },
];

export default function NotificationsPage({ navigate, role }: Props) {
  const { profile } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';

  const [notifications,    setNotifications]    = useState<DbNotification[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [showCompose,      setShowCompose]       = useState(false);
  const [sending,          setSending]          = useState(false);

  // Compose state
  const [composeTitle,     setComposeTitle]     = useState('');
  const [composeMsg,       setComposeMsg]       = useState('');
  const [composeType,      setComposeType]      = useState('info');
  const [selectedTargets,  setSelectedTargets]  = useState<string[]>(['all']);
  const [specificEmails,   setSpecificEmails]   = useState('');
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  async function fetchNotifications() {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setNotifications((data ?? []) as DbNotification[]);
    setLoading(false);
  }

  useEffect(() => { fetchNotifications(); }, [profile]);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', profile.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function deleteNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }

  async function sendNotification() {
    if (!composeTitle.trim() || !composeMsg.trim() || !profile) return;
    setSending(true);

    // For 'all', fetch every user's id; otherwise filter by role
    let userIds: string[] = [];
    if (selectedTargets.includes('all')) {
      const { data } = await supabase.from('profiles').select('id');
      userIds = (data ?? []).map((p: any) => p.id);
    } else {
      const { data } = await supabase.from('profiles')
        .select('id, role, subroles')
        .or(
          selectedTargets.map(t =>
            ['shareholder','user','admin','super-admin','developer'].includes(t)
              ? `role.eq.${t}`
              : `subroles.cs.{${t}}`
          ).join(',')
        );
      userIds = (data ?? []).map((p: any) => p.id);
    }

    // Insert one notification row per user
    if (userIds.length > 0) {
      await supabase.from('notifications').insert(
        userIds.map(uid => ({
          user_id:           uid,
          title:             composeTitle.trim(),
          message:           composeMsg.trim(),
          notification_type: composeType,
          audience_roles:    selectedTargets,
          sent_by:           profile.id,
          is_read:           false,
        }))
      );
    }

    setSending(false);
    setComposeTitle(''); setComposeMsg(''); setComposeType('info');
    setSelectedTargets(['all']); setSpecificEmails('');
    setShowCompose(false);
    fetchNotifications(); // refresh own feed
  }

  const toggleTarget = (v: string) => {
    if (v === 'all') { setSelectedTargets(['all']); return; }
    setSelectedTargets(prev => {
      const without = prev.filter(x => x !== 'all');
      return without.includes(v) ? without.filter(x => x !== v) : [...without, v];
    });
  };

  const audienceLabel = selectedTargets.includes('all') ? 'All Users' : selectedTargets.join(', ');
  const unread = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222]">Notifications</h1>
          <p className="text-[#7e7e7e]">Stay updated with the latest platform activity</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <Button size="sm" className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={() => setShowCompose(v => !v)}>
              {showCompose ? <><ChevronUp className="w-4 h-4 mr-1" />Hide</> : <><Plus className="w-4 h-4 mr-1" />New Notification</>}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={markAllRead}>Mark All Read</Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={() => setNotifications([])}>Clear</Button>
        </div>
      </div>

      {/* Admin compose panel */}
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
                <Label className="text-sm">Title</Label>
                <Input placeholder="Notification title" className="border-[#f0f0f0] mt-1" value={composeTitle} onChange={e => setComposeTitle(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Type</Label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {[['info','ℹ️'],['success','✅'],['warning','⚠️'],['action','🔔']].map(([v, icon]) => (
                    <button key={v} onClick={() => setComposeType(v)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${composeType === v ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                      {icon} {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm">Message</Label>
              <textarea className="w-full mt-1 px-3 py-2 border border-[#f0f0f0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#e33b5f]/30 resize-none" rows={3} value={composeMsg} onChange={e => setComposeMsg(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Send to</Label>
              <div className="mt-1 border border-[#f0f0f0] rounded-lg overflow-hidden">
                <button type="button" className="w-full flex items-center justify-between px-3 py-2 text-sm text-[#444] hover:bg-[#fafafa]" onClick={() => setShowTargetPicker(v => !v)}>
                  <span className="truncate">{audienceLabel}</span>
                  {showTargetPicker ? <ChevronUp className="w-4 h-4 text-[#9e9e9e]" /> : <ChevronDown className="w-4 h-4 text-[#9e9e9e]" />}
                </button>
                {showTargetPicker && (
                  <div className="border-t border-[#f0f0f0] p-3 space-y-3">
                    {['Roles', 'Subroles'].map(group => (
                      <div key={group}>
                        <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-2">{group}</p>
                        <div className="flex flex-wrap gap-2">
                          {AUDIENCE_OPTIONS.filter(o => o.group === group).map(o => (
                            <button key={o.value} onClick={() => toggleTarget(o.value)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition ${selectedTargets.includes(o.value) ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#555353] border-[#f0f0f0] hover:border-[#e33b5f]'}`}>
                              {selectedTargets.includes(o.value) && <Check className="w-3 h-3" />}{o.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div>
                      <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1">Specific Emails</p>
                      <Input placeholder="email@example.com, another@example.com" className="border-[#f0f0f0] text-xs h-8" value={specificEmails} onChange={e => setSpecificEmails(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white" onClick={sendNotification} disabled={sending || !composeTitle.trim() || !composeMsg.trim()}>
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><Send className="w-4 h-4 mr-2" />Send Notification</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {unread > 0 && (
        <div className="flex items-center gap-2">
          <Badge className="bg-[#e33b5f]/10 text-[#c02d4f]">{unread} Unread</Badge>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[#7e7e7e]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-[#9e9e9e] text-sm">No notifications yet.</div>
          ) : (
            <div className="divide-y divide-[#f0f0f0] max-h-[600px] overflow-y-auto">
              {notifications.map(n => {
                const tc = typeConfig[n.notification_type] ?? typeConfig.info;
                const Icon = tc.icon;
                const relTime = new Date(n.created_at).toLocaleString();
                return (
                  <div key={n.id}
                    className={`flex items-start gap-3 p-4 hover:bg-[#fbfbfb] transition cursor-pointer ${!n.is_read ? 'bg-[#fafafa]' : ''}`}
                    onClick={() => !n.is_read && markRead(n.id)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tc.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${!n.is_read ? 'text-[#222]' : 'text-[#555353]'}`}>{n.title}</p>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#e33b5f]/50" />}
                      </div>
                      <p className="text-xs text-[#7e7e7e] mt-0.5">{n.message}</p>
                      <p className="text-xs text-[#9e9e9e] mt-1">{relTime}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteNotification(n.id); }} className="text-[#9e9e9e] hover:text-red-500 mt-1 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
