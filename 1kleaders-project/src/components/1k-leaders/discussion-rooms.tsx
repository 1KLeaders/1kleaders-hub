'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Plus, Users, Lock, Search, Hash, Loader2, Shield, Pencil, Trash2, X, ChevronDown } from 'lucide-react';
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

  // Room management state
  const [showRoomForm,  setShowRoomForm]  = useState(false);
  const [editingRoom,   setEditingRoom]   = useState<Room | null>(null);
  const [roomName,      setRoomName]      = useState('');
  const [roomDesc,      setRoomDesc]      = useState('');
  const [roomType,      setRoomType]      = useState<'general' | 'committee' | 'board'>('general');
  const [roomRoles,     setRoomRoles]     = useState<string[]>(['shareholder','admin','super-admin','developer']);
  const [savingRoom,    setSavingRoom]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const ROLE_OPTIONS = ['shareholder','user','admin','super-admin','developer'];

  function openNewRoom() {
    setEditingRoom(null);
    setRoomName(''); setRoomDesc(''); setRoomType('general');
    setRoomRoles(['shareholder','admin','super-admin','developer']);
    setShowRoomForm(true);
  }

  function openEditRoom(room: Room, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomDesc(room.description ?? '');
    setRoomType(room.type as 'general' | 'committee' | 'board');
    setRoomRoles(room.allowed_roles ?? ['shareholder','admin','super-admin','developer']);
    setShowRoomForm(true);
  }

  async function saveRoom() {
    if (!roomName.trim()) return;
    setSavingRoom(true);
    if (editingRoom) {
      const { data } = await supabase.from('discussion_rooms')
        .update({ name: roomName.trim(), description: roomDesc.trim(), type: roomType, allowed_roles: roomRoles })
        .eq('id', editingRoom.id).select().single();
      if (data) setRooms(prev => prev.map(r => r.id === editingRoom.id ? data as Room : r));
    } else {
      const { data } = await supabase.from('discussion_rooms')
        .insert({ name: roomName.trim(), description: roomDesc.trim(), type: roomType, allowed_roles: roomRoles })
        .select().single();
      if (data) setRooms(prev => [...prev, data as Room]);
    }
    setSavingRoom(false);
    setShowRoomForm(false);
    setEditingRoom(null);
  }

  async function deleteRoom(roomId: string) {
    await supabase.from('discussion_rooms').delete().eq('id', roomId);
    setRooms(prev => prev.filter(r => r.id !== roomId));
    if (selectedRoom === roomId) setSelectedRoom(null);
    setConfirmDelete(null);
  }

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
        const incoming = payload.new as Message;
        setMessages(prev => {
          // If this is our own message, replace the temp entry rather than adding a duplicate
          const tempIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.user_id === incoming.user_id && m.content === incoming.content);
          if (tempIndex !== -1) {
            const next = [...prev];
            next[tempIndex] = incoming;
            return next;
          }
          return [...prev, incoming];
        });
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
          <CardHeader className="pb-2 shrink-0">
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
              <Input placeholder="Search rooms..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {isAdmin && !showRoomForm && (
              <Button size="sm" className="w-full bg-[#e33b5f] text-white h-8" onClick={openNewRoom}>
                <Plus className="w-3.5 h-3.5 mr-1" /> New Room
              </Button>
            )}
          </CardHeader>

          {/* Room form */}
          {isAdmin && showRoomForm && (
            <div className="mx-2 mb-2 p-3 bg-[#e33b5f]/5 border border-[#e33b5f]/20 rounded-xl space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#e33b5f]">{editingRoom ? 'Edit Room' : 'New Room'}</p>
                <button onClick={() => setShowRoomForm(false)}><X className="w-4 h-4 text-[#9e9e9e]" /></button>
              </div>
              <Input placeholder="Room name" className="h-8 text-sm border-[#f0f0f0]" value={roomName} onChange={e => setRoomName(e.target.value)} />
              <Input placeholder="Description (optional)" className="h-8 text-sm border-[#f0f0f0]" value={roomDesc} onChange={e => setRoomDesc(e.target.value)} />
              <div>
                <p className="text-[10px] text-[#9e9e9e] mb-1">Type</p>
                <div className="flex gap-1.5">
                  {(['general','committee','board'] as const).map(t => (
                    <button key={t} onClick={() => setRoomType(t)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${roomType === t ? `${roomTypeColors[t]}` : 'bg-white text-[#9e9e9e] border-[#f0f0f0]'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-[#9e9e9e] mb-1">Access</p>
                <div className="flex flex-wrap gap-1">
                  {ROLE_OPTIONS.map(r => (
                    <button key={r} onClick={() => setRoomRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                      className={`px-2 py-0.5 rounded-full text-[10px] border transition ${roomRoles.includes(r) ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#9e9e9e] border-[#f0f0f0]'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <Button size="sm" className="w-full h-7 bg-[#e33b5f] text-white text-xs" onClick={saveRoom} disabled={savingRoom || !roomName.trim()}>
                {savingRoom ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                {editingRoom ? 'Save Changes' : 'Create Room'}
              </Button>
            </div>
          )}

          <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredRooms.map(room => (
              <div key={room.id} className="group relative">
                <button onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left p-3 rounded-xl transition ${selectedRoom === room.id ? 'bg-[#e33b5f]/10' : 'hover:bg-[#f6f6f6]'}`}>
                  <div className="flex items-center gap-2 mb-1 pr-12">
                    <Hash className="w-3.5 h-3.5 text-[#e33b5f] flex-shrink-0" />
                    <p className={`text-sm font-medium truncate ${selectedRoom === room.id ? 'text-[#e33b5f]' : 'text-[#222]'}`}>{room.name}</p>
                  </div>
                  <p className="text-xs text-[#7e7e7e] truncate pl-5">{room.description}</p>
                  <div className="flex items-center gap-1.5 mt-1 pl-5">
                    <Badge className={`text-[10px] px-1.5 ${roomTypeColors[room.type]}`}>{room.type}</Badge>
                    {room.type === 'board' && <Shield className="w-3 h-3 text-purple-500" />}
                  </div>
                </button>
                {isAdmin && (
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                    <button onClick={e => openEditRoom(room, e)}
                      className="w-6 h-6 rounded bg-white border border-[#f0f0f0] flex items-center justify-center hover:border-[#e33b5f]/30 transition">
                      <Pencil className="w-3 h-3 text-[#7e7e7e]" />
                    </button>
                    {confirmDelete === room.id ? (
                      <div className="flex gap-1">
                        <button onClick={e => { e.stopPropagation(); deleteRoom(room.id); }}
                          className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(null); }}
                          className="w-6 h-6 rounded bg-white border border-[#f0f0f0] flex items-center justify-center">
                          <X className="w-3 h-3 text-[#7e7e7e]" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); setConfirmDelete(room.id); }}
                        className="w-6 h-6 rounded bg-white border border-[#f0f0f0] flex items-center justify-center hover:border-red-300 transition">
                        <Trash2 className="w-3 h-3 text-[#9e9e9e]" />
                      </button>
                    )}
                  </div>
                )}
              </div>
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
