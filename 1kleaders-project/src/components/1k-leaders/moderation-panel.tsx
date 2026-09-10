'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, RefreshCw, MessageSquare, Lightbulb, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Tab = 'messages' | 'ideas' | 'events';

export default function ModerationPanel() {
  const [tab,      setTab]      = useState<Tab>('messages');
  const [items,    setItems]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load(t: Tab = tab) {
    setLoading(true);
    setItems([]);
    if (t === 'messages') {
      const { data } = await supabase
        .from('room_messages')
        .select('id, content, created_at, profiles(first_name, last_name, email), discussion_rooms(name)')
        .order('created_at', { ascending: false })
        .limit(50);
      setItems(data ?? []);
    } else if (t === 'ideas') {
      const { data } = await supabase
        .from('ideas')
        .select('id, title, description, status, created_at, profiles(first_name, last_name, email)')
        .order('created_at', { ascending: false })
        .limit(50);
      setItems(data ?? []);
    } else if (t === 'events') {
      const { data } = await supabase
        .from('calendar_events')
        .select('id, title, date, time, type, created_at')
        .order('date', { ascending: false })
        .limit(50);
      setItems(data ?? []);
    }
    setLoading(false);
  }

  async function deleteItem(id: string) {
    setDeleting(id);
    const table = tab === 'messages' ? 'room_messages' : tab === 'ideas' ? 'ideas' : 'calendar_events';
    await supabase.from(table).delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    setDeleting(null);
  }

  useEffect(() => { load(); }, []);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'messages', label: 'Chat Messages', icon: MessageSquare },
    { id: 'ideas',    label: 'Ideas',         icon: Lightbulb },
    { id: 'events',   label: 'Events',        icon: Calendar },
  ];

  return (
    <Card className="border-[#f0f0f0]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-lg text-[#222] flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-[#e33b5f]" />Content Moderation
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex gap-1 mt-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); load(t.id); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${tab === t.id ? 'bg-[#e33b5f] text-white' : 'text-[#7e7e7e] hover:bg-[#f0f0f0]'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-[#9e9e9e]">
            <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading...</span>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-[#9e9e9e] text-center py-8">Nothing to moderate</p>
        ) : items.map((item, i) => (
          <div key={item.id} className={`flex items-start gap-3 px-4 py-3 ${i < items.length - 1 ? 'border-b border-[#f0f0f0]' : ''} hover:bg-[#fafafa] transition`}>
            <div className="flex-1 min-w-0">
              {tab === 'messages' && (
                <>
                  <p className="text-xs text-[#9e9e9e]">
                    <span className="font-medium text-[#222]">{item.profiles?.first_name} {item.profiles?.last_name}</span>
                    {' '}in <span className="font-medium">{item.discussion_rooms?.name ?? 'Unknown Room'}</span>
                  </p>
                  <p className="text-sm text-[#555353] mt-0.5 line-clamp-2">{item.content}</p>
                </>
              )}
              {tab === 'ideas' && (
                <>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#222] truncate">{item.title}</p>
                    <Badge className="text-[10px] bg-stone-100 text-stone-500">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-[#9e9e9e]">by {item.profiles?.first_name} {item.profiles?.last_name}</p>
                </>
              )}
              {tab === 'events' && (
                <>
                  <p className="text-sm font-medium text-[#222]">{item.title}</p>
                  <p className="text-xs text-[#9e9e9e]">{item.date} · {item.time} · {item.type}</p>
                </>
              )}
              <p className="text-[10px] text-[#9e9e9e] mt-0.5">{new Date(item.created_at).toLocaleString()}</p>
            </div>
            <button onClick={() => deleteItem(item.id)} disabled={deleting === item.id}
              className="w-7 h-7 rounded-lg border border-[#f0f0f0] flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition flex-shrink-0 mt-0.5">
              {deleting === item.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9e9e9e]" />
                : <Trash2 className="w-3.5 h-3.5 text-[#9e9e9e] hover:text-red-500" />
              }
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
