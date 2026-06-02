'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Plus, Users, Lock, Video, Search, Hash, ArrowRight, Shield } from 'lucide-react';
import type { DashboardRole } from './types';
import { roleBadgeConfig } from './types';

interface Props { role: DashboardRole; }

const rooms = [
  { id: 1, name: 'General Shareholders', members: 42, lastMessage: 'Q4 dividend discussion ongoing...', time: '5 min ago', type: 'general', unread: 3 },
  { id: 2, name: 'Investment Committee', members: 12, lastMessage: 'New proposal: AI Health Series A', time: '1 hour ago', type: 'committee', unread: 1 },
  { id: 3, name: 'Board Advisory', members: 8, lastMessage: 'Next meeting agenda confirmed', time: '3 hours ago', type: 'board', unread: 0 },
  { id: 4, name: 'Annual General Meeting', members: 65, lastMessage: 'AGM date finalized for June 15', time: '1 day ago', type: 'general', unread: 0 },
  { id: 5, name: 'Venture Evaluation Panel', members: 15, lastMessage: 'GreenTech scoring complete', time: '2 days ago', type: 'committee', unread: 0 },
];

const messages = [
  { id: 1, sender: 'Ahmed Al-Rashid', role: 'shareholder' as const, text: 'I think the Q4 dividend distribution looks promising. The 12% increase is better than expected.', time: '10:15 AM', initials: 'AR' },
  { id: 2, sender: 'Fatima Khalid', role: 'shareholder' as const, text: 'Agreed. The CleanEnergy venture is showing strong returns. Should we discuss reinvestment options?', time: '10:22 AM', initials: 'FK' },
  { id: 3, sender: 'Omar Hassan', role: 'investor' as const, text: 'I\'d like to see the detailed financial projections before we make any decisions on reinvestment.', time: '10:30 AM', initials: 'OH' },
  { id: 4, sender: 'Sara Mohammed', role: 'shareholder' as const, text: 'The projections are available in the Documents section. I\'ll share the link.', time: '10:35 AM', initials: 'SM' },
  { id: 5, sender: 'Khalid Nasser', role: 'shareholder' as const, text: 'Thanks Sara. Also, the voting proposal for board expansion - when is the deadline?', time: '10:42 AM', initials: 'KN' },
  { id: 6, sender: 'Fatima Khalid', role: 'shareholder' as const, text: 'The deadline is May 30th. Please make sure to cast your vote before then.', time: '10:48 AM', initials: 'FK' },
];

function DigitalBadge({ role }: { role: 'shareholder' | 'investor' | 'partner' | 'idea-owner' | 'admin' | 'super-admin' | 'user' | 'vvp' }) {
  const config = roleBadgeConfig[role];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}

export default function DiscussionRooms({ role }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<number | null>(1);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const isShareholder = role === 'shareholder' || role === 'super-admin' || role === 'admin';

  if (!isShareholder) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <Lock className="w-12 h-12 text-[#d0d0d0] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#222] mb-2">Access Restricted</h2>
            <p className="text-[#7e7e7e] mb-4">Discussion Rooms are exclusively available for Shareholders. Upgrade your account to gain access.</p>
            <Badge className="bg-[#f07969]/10 text-[#E65F5C]">Shareholder Only</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#e33b5f]" /> Discussion Rooms
          </h1>
          <p className="text-[#7e7e7e]">Connect and discuss with fellow shareholders</p>
        </div>
        <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" size="sm"><Plus className="w-4 h-4 mr-1" /> New Room</Button>
      </div>

      {/* Privacy notice */}
      <Card className="border-amber-200 bg-[#f07969]/5/50">
        <CardContent className="p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-[#f07969]" />
          <div>
            <p className="text-sm font-medium text-[#222]">Shareholder-Only Space</p>
            <p className="text-xs text-[#7e7e7e]">Only verified shareholders can see and interact in these discussion rooms. Your conversations are private.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4 h-[600px]">
        {/* Room List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#9e9e9e]" />
              <Input placeholder="Search rooms..." className="pl-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="h-[500px]">
              <div className="space-y-1">
                {rooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase())).map(room => (
                  <button key={room.id} onClick={() => setSelectedRoom(room.id)}
                    className={`w-full text-left p-3 rounded-lg transition ${selectedRoom === room.id ? 'bg-[#e33b5f]/5 border border-emerald-200' : 'hover:bg-[#fbfbfb]'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-[#e33b5f]" />
                        <span className="font-medium text-sm text-[#222]">{room.name}</span>
                      </div>
                      {room.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-[#e33b5f] text-white text-[10px] flex items-center justify-center">{room.unread}</span>
                      )}
                    </div>
                    <p className="text-xs text-[#7e7e7e] mt-1 truncate">{room.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#9e9e9e]">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.members}</span>
                      <span>{room.time}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedRoom ? (
            <>
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-[#e33b5f]" />
                    <CardTitle className="text-base">{rooms.find(r => r.id === selectedRoom)?.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />{rooms.find(r => r.id === selectedRoom)?.members} members
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm"><Video className="w-4 h-4 mr-1" /> Video Call</Button>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-[#e33b5f]/10 text-[#c02d4f] text-xs font-semibold">{msg.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[#222]">{msg.sender}</span>
                          <DigitalBadge role={msg.role} />
                          <span className="text-xs text-[#9e9e9e]">{msg.time}</span>
                        </div>
                        <p className="text-sm text-[#444] mt-0.5">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input placeholder="Type a message..." value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && setMessage('')} />
                  <Button className="bg-[#e33b5f] hover:bg-[#c02d4f]" size="icon"><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#9e9e9e]">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-2" />
                <p>Select a room to start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
