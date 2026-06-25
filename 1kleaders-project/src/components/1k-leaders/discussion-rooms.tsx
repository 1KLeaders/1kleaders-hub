'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Plus, Users, Lock, Search, Hash, Loader2, Shield } from 'lucide-react';
import type { Page, DashboardRole, RoleBadge } from './types';
import { roleBadgeConfig } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { role?: DashboardRole; navigate?: (page: Page) => void; }

type Room = {
  id: string;
  name: string;
  description: string;
  type: 'general' | 'committee' | 'board';
  allowed_roles: string[];
  created_at: string;
};

type Message = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_role: string;
  sender_subroles: string[];
  sender_initials: string;
};

const roomTypeColors: Record<string, string> = {
  general:   'bg-[#e33b5f]/10 text-[#e33b5f]',
  committee: 'bg-amber-100 text-amber-700',
  board:     'bg-purple-100 text-purple-700',
};

const DEFAULT_ROOMS: Omit<Room, 'created_at'>[] = [
  { id: 'general',    name: 'General Shareholders', description: 'Open discussion for all shareholders',        type: 'general',   allowed_roles: ['shareholder','admin','super-admin','developer'] },
  { id: 'investment', name: 'Investment Committee', description: 'Investment proposals and portfolio review',   type: 'committee', allowed_roles: ['shareholder','admin','super-admin','developer'] },
  { id: 'board',      name: 'Board Advisory',       description: 'Board-level discussion and governance',      type: 'board',     allowed_roles: ['admin','super-admin','developer'] },
  { id: 'agm',        name: 'Annual General Meeting', description: 'AGM preparation and resolutions',          type: 'general',   allowed_roles: ['shareholder','admin','super-admin','developer'] },
  { id: 'vep',        name: 'Venture Evaluation Panel', description: 'VEP scoring and evaluation discussion',  type: 'committee', allowed_roles: ['admin','super-admin','developer'] },
];

function DigitalBadge({ role }: { role: string }) {
  const cfg = roleBadgeConfig[role as RoleBadge];
  if (!cfg) return null;
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.icon} {cfg.label}</span>;
}

export default function DiscussionRooms({ role }: Props) {
  const { profile } = useAuth();
  const isAdmin = role === 'admin' || role === 'super-admin' || role === 'developer';
  const isShareholder = role === 'shareholder' || isAdmin;

  const [rooms,        setRooms]        = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [message,      setMessage]      = useState('');
  const [sending,      setSending]      = useState(false);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [search,       setSearch]       = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load rooms — use defaults until DB table is created
  useEffect(() => {
    async function loadRooms() {
      const { data, error } = await supabase.from('discussion_rooms').select('*').order('created_at');
      if (data && data.length > 0) {
        setRooms(data as Room[]);
      } else {
        // Use defaults with a fake created_at
        setRooms(DEFAULT_ROOMS.map(r => ({ ...r, created_at: new Date().toISOString() })));
      }
    }
    loadRooms();
  }, []);

  // Load messages and subscribe to realtime when room changes
  useEffect(() => {
    if (!selectedRoom) return;

    // Unsubscribe from previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setLoadingMsgs(true);
    setMessages([]);

    // Load existing messages
    supabase
      .from('discussion_messages')
      .select('*')
      .eq('room_id', selectedRoom)
      .order('created_at')
      .then(({ data }) => {
        setMessages((data ?? []) as Message[]);
        setLoadingMsgs(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });

    // Subscribe to new messages via Realtime
    const channel = supabase
      .channel(`room:${selectedRoom}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'discussion_messages',
        filter: `room_id=eq.${selectedRoom}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedRoom]);

  async function sendMessage() {
    if (!message.trim() || !selectedRoom || !profile || sending) return;
    setSending(true);

    const name    = `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email;
    const initials = `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?';

    const newMsg: Omit<Message, 'id'> = {
      room_id:         selectedRoom,
      user_id:         profile.id,
      content:         message.trim(),
      created_at:      new Date().toISOString(),
      sender_name:     name,
      sender_role:     profile.role,
      sender_subroles: profile.subroles ?? [],
      sender_initials: initials,
    };

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { ...newMsg, id: tempId }]);
    setMessage('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    const { error } = await supabase.from('discussion_messages').insert(newMsg);
    if (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessage(newMsg.content);
    }
    setSending(false);
  }

  const filteredRooms = rooms.filter(r => {
    if (!r.allowed_roles.includes(role ?? '')) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);

  if (!isShareholder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-sm w-full">
          <CardContent className="p-8 text-center space-y-3">
            <Lock className="w-10 h-10 text-[#9e9e9e] mx-auto" />
            <h3 className="font-semibold text-[#222]">Shareholders Only</h3>
            <p className="text-sm text-[#7e7e7e]">Discussion Rooms are available to shareholders and above.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-[#e33b5f]" /> Discussion Rooms
        </h1>
        <p className="text-[#7e7e7e]">Shareholder-only discussion channels</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Room list */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
              <Input placeholder="Search rooms..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredRooms.map(room => (
              <button key={room.id} onClick={() => setSelectedRoom(room.id)}
                className={`w-full text-left p-3 rounded-xl transition ${selectedRoom === room.id ? 'bg-[#e33b5f]/10' : 'hover:bg-[#f6f6f6]'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="w-3.5 h-3.5 text-[#e33b5f] flex-shrink-0" />
                  <p className={`text-sm font-medium truncate ${selectedRoom === room.id ? 'text-[#e33b5f]' : 'text-[#222]'}`}>{room.name}</p>
                </div>
                <p className="text-xs text-[#7e7e7e] truncate pl-5">{room.description}</p>
                <div className="flex items-center gap-1.5 mt-1 pl-5">
                  <Badge className={`text-[10px] px-1.5 ${roomTypeColors[room.type]}`}>{room.type}</Badge>
                  {room.type === 'board' && <Shield className="w-3 h-3 text-purple-500" />}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Chat area */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {selectedRoom && selectedRoomData ? (
            <>
              {/* Room header */}
              <CardHeader className="pb-3 shrink-0 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-2">
                  <Hash className="w-5 h-5 text-[#e33b5f]" />
                  <CardTitle className="text-base">{selectedRoomData.name}</CardTitle>
                  <Badge className={`text-xs ml-auto ${roomTypeColors[selectedRoomData.type]}`}>{selectedRoomData.type}</Badge>
                </div>
                <p className="text-xs text-[#7e7e7e] mt-1">{selectedRoomData.description}</p>
              </CardHeader>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-[#9e9e9e]">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-[#9e9e9e]">
                    <MessageSquare className="w-8 h-8" />
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.user_id === profile?.id;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-xs font-semibold">
                            {msg.sender_initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          <div className={`flex items-center gap-2 flex-wrap ${isMe ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs font-medium text-[#444]">{isMe ? 'You' : msg.sender_name}</span>
                            {msg.sender_subroles?.slice(0, 2).map(sr => <DigitalBadge key={sr} role={sr} />)}
                          </div>
                          <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-[#e33b5f] text-white rounded-tr-sm' : 'bg-[#f6f6f6] text-[#222] rounded-tl-sm'}`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-[#9e9e9e]">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-[#f0f0f0] shrink-0">
                <div className="flex gap-2">
                  <Input
                    placeholder={`Message #${selectedRoomData.name}...`}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="flex-1 border-[#f0f0f0]"
                  />
                  <Button className="bg-[#e33b5f] text-white shrink-0" onClick={sendMessage} disabled={!message.trim() || sending}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex flex-col items-center justify-center gap-3 text-[#9e9e9e]">
              <MessageSquare className="w-12 h-12" />
              <p className="text-sm">Select a room to start chatting</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
