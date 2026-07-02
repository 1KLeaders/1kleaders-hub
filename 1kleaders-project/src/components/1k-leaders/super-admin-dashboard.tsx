'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Shield,
  DollarSign,
  Activity,
  Settings,
  TrendingUp,
  FileText,
  Lightbulb,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BarChart3,
  Cpu,
  Rocket,
  Clock,
  CheckCheck,
  Loader2,
  RefreshCw,
  Tag,
  Plus,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

interface SuperAdminDashboardProps {
  onNavigate: (page: string) => void
}




type WaitlistRow = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  org_name: string
  leader_profiles: string[]
  status: 'pending' | 'meeting-scheduled' | 'approved' | 'rejected' | 'parked' | 'more-info-required'
  admin_notes: string | null
  meeting_date?: string | null
}

function SendAgreementButton({ row, onSent }: { row: WaitlistRow; onSent: () => void }) {
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [checking, setChecking] = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // Check if an envelope already exists for this waitlist row on mount
  useEffect(() => {
    supabase
      .from('docusign_envelopes')
      .select('id')
      .eq('waitlist_id', row.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSent(true);
        setChecking(false);
      });
  }, [row.id]);

    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/docusign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_name:  `${row.first_name} ${row.last_name}`,
          recipient_email: row.email,
          waitlist_id:     row.id,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSent(true);
      onSent();
    } catch (e: any) {
      setError(e.message);
    }
    setSending(false);
  }

  if (checking) return <span className="text-xs text-[#9e9e9e]">Checking...</span>;
  if (sent) return <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCheck className="w-3.5 h-3.5" /> Agreement Sent</span>;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
        disabled={sending} onClick={send}>
        {sending ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Sending...</> : '📄 Send Agreement'}
      </Button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}


const BADGE_COLORS = [
  { label: 'Red',    value: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Blue',   value: 'bg-blue-100 text-blue-700 border-blue-200' },
  { label: 'Green',  value: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Purple', value: 'bg-purple-100 text-purple-700 border-purple-200' },
  { label: 'Amber',  value: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Pink',   value: 'bg-pink-100 text-pink-700 border-pink-200' },
  { label: 'Teal',   value: 'bg-teal-100 text-teal-700 border-teal-200' },
  { label: 'Stone',  value: 'bg-stone-100 text-stone-700 border-stone-200' },
];

const BADGE_ICONS = ['⭐','🏆','🔑','💎','🎯','🌟','🛠','🔬','📊','🤝','🚀','💡','🛡️','⚡','🌍'];

function NewBadgeCreator({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [open,    setOpen]    = useState(false);
  const [label,   setLabel]   = useState('');
  const [icon,    setIcon]    = useState('⭐');
  const [color,   setColor]   = useState(BADGE_COLORS[0].value);
  const [saved,   setSaved]   = useState(false);
  const [badges,  setBadges]  = useState<{ id: string; label: string; icon: string; color: string }[]>([]);

  if (!isSuperAdmin) return null;

  const createBadge = () => {
    if (!label.trim()) return;
    const newBadge = { id: Date.now().toString(), label: label.trim(), icon, color };
    setBadges(prev => [...prev, newBadge]);
    setLabel(''); setIcon('⭐'); setColor(BADGE_COLORS[0].value);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
    // TODO: persist to Supabase custom_badges table
  };

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-stone-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-purple-600" /> Badge Manager
            <span className="text-xs font-normal text-purple-500 ml-1">Super Admin only</span>
          </CardTitle>
          <Button size="sm" variant="outline" className="border-purple-200 text-purple-700 h-7" onClick={() => setOpen(v => !v)}>
            {open ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            {open ? 'Close' : 'New Badge'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing custom badges */}
        {badges.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[#9e9e9e] uppercase tracking-wider mb-2">Custom Badges</p>
            <div className="flex flex-wrap gap-2">
              {badges.map(b => (
                <div key={b.id} className="flex items-center gap-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${b.color}`}>
                    {b.icon} {b.label}
                  </span>
                  <button onClick={() => setBadges(prev => prev.filter(x => x.id !== b.id))} className="text-[#9e9e9e] hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Creator form */}
        {open && (
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg space-y-4">
            <p className="text-sm font-medium text-purple-800">Create New Badge</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#444]">Badge Label</Label>
                <Input className="mt-1 border-[#f0f0f0] bg-white" placeholder="e.g. Mentor, Advisor" value={label} onChange={e => setLabel(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-[#444]">Icon</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {BADGE_ICONS.map(ic => (
                    <button key={ic} onClick={() => setIcon(ic)}
                      className={`w-8 h-8 rounded-lg text-sm transition ${icon === ic ? 'bg-purple-200 ring-2 ring-purple-400' : 'bg-white border border-[#f0f0f0] hover:border-purple-300'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#444]">Color</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {BADGE_COLORS.map(c => (
                  <button key={c.value} onClick={() => setColor(c.value)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition ${c.value} ${color === c.value ? 'ring-2 ring-offset-1 ring-purple-400' : ''}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            {label && (
              <div>
                <p className="text-xs text-[#9e9e9e] mb-1">Preview</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${color}`}>{icon} {label}</span>
              </div>
            )}
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={createBadge} disabled={!label.trim()}>
              {saved ? <><CheckCheck className="w-4 h-4 mr-2" />Badge Created!</> : <><Plus className="w-4 h-4 mr-2" />Create Badge</>}
            </Button>
          </div>
        )}

        {!open && badges.length === 0 && (
          <p className="text-sm text-[#9e9e9e] text-center py-2">No custom badges yet. Click "New Badge" to create one.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SuperAdminDashboard({ onNavigate }: SuperAdminDashboardProps) {

  // Live platform metrics
  const [metrics, setMetrics] = useState({ total: 0, shareholders: 0, ideas: 0 });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [{ count: total }, { count: shareholders }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'shareholder'),
        ]);
        // ideas table may not exist yet — fetch separately and swallow error
        const { count: ideas } = await supabase.from('ideas').select('*', { count: 'exact', head: true }).then(r => r).catch(() => ({ count: 0 }));
        setMetrics({ total: total ?? 0, shareholders: shareholders ?? 0, ideas: ideas ?? 0 });
      } catch (e) {
        console.warn('Metrics fetch failed:', e);
      }
    }
    fetchMetrics();
  }, []);

  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [meetingDateInputs, setMeetingDateInputs] = useState<Record<string, string>>({})

  const fetchWaitlist = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('waitlist_submissions')
      .select('id, created_at, first_name, last_name, email, org_name, leader_profiles, status, admin_notes, meeting_date')
      .order('created_at', { ascending: false })

    if (error) {
      setError('Failed to load waitlist. Check Supabase connection.')
      console.error(error)
    } else {
      setWaitlist(data as WaitlistRow[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchWaitlist() }, [])

  const updateStatus = async (id: string, status: WaitlistRow['status'], extra: Record<string, unknown> = {}) => {
    setUpdating(id)
    const { error } = await supabase
      .from('waitlist_submissions')
      .update({ status, reviewed_at: new Date().toISOString(), ...extra })
      .eq('id', id)
    if (!error) {
      setWaitlist(prev => prev.map(r => r.id === id ? { ...r, status, ...extra } : r))
    }
    setUpdating(null)
  }

  const scheduleMeeting = async (id: string) => {
    const date = meetingDateInputs[id]
    await updateStatus(id, 'meeting-scheduled', { meeting_date: date || null })
  }

  const [inviting, setInviting] = useState<string | null>(null)

  const approveAndInvite = async (row: WaitlistRow) => {
    setInviting(row.id)
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:       row.email,
          first_name:  row.first_name,
          last_name:   row.last_name,
          role:        'user',
          waitlist_id: row.id,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        alert(`Invite failed: ${json.error}`)
      } else {
        setWaitlist(prev => prev.map(r => r.id === row.id ? { ...r, status: 'approved' as const } : r))
      }
    } catch (e) {
      alert('Network error — could not send invite.')
    }
    setInviting(null)
  }

  const undoDecision = (id: string) => updateStatus(id, 'meeting-scheduled')

  const pendingCount = waitlist.filter(r => r.status === 'pending').length
  const meetingCount = waitlist.filter(r => r.status === 'meeting-scheduled').length

  const statusStyle = (status: WaitlistRow['status']) => {
    if (status === 'approved')          return 'bg-emerald-50 border-emerald-200'
    if (status === 'rejected')          return 'bg-red-50 border-red-200'
    if (status === 'parked')            return 'bg-stone-50 border-stone-200'
    if (status === 'meeting-scheduled') return 'bg-blue-50 border-blue-200'
    return 'bg-amber-50 border-amber-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Super Admin Dashboard</h1>
          <p className="text-stone-500 text-sm">Platform-wide management and monitoring</p>
        </div>
        <Badge className="bg-red-100 text-red-700 text-sm px-3 py-1">
          <Shield className="w-3.5 h-3.5 mr-1" /> Super Admin Access
        </Badge>
      </div>

      {/* Live Platform Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Users',     value: metrics.total,        icon: Users,     bg: 'bg-emerald-100', fg: 'text-emerald-600' },
          { title: 'Shareholders',    value: metrics.shareholders, icon: Shield,    bg: 'bg-amber-100',   fg: 'text-amber-600' },
          { title: 'Ideas Submitted', value: metrics.ideas,        icon: Lightbulb, bg: 'bg-blue-100',    fg: 'text-blue-600' },
          { title: 'System Health',   value: '99.9%',              icon: Activity,  bg: 'bg-emerald-100', fg: 'text-emerald-600' },
        ].map(m => (
          <Card key={m.title} className="border-stone-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-stone-500 mb-1">{m.title}</p>
                  <p className="text-2xl font-bold text-stone-900">{m.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.bg}`}>
                  <m.icon className={`w-5 h-5 ${m.fg}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Waitlist Review Queue — live from Supabase */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-stone-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#e33b5f]" /> Waitlist Review Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              {!loading && pendingCount > 0 && <Badge className="bg-amber-100 text-amber-700">{pendingCount} Pending</Badge>}
              {!loading && meetingCount > 0 && <Badge className="bg-blue-100 text-blue-700">{meetingCount} Meeting Scheduled</Badge>}
              <Button size="sm" variant="outline" onClick={fetchWaitlist} disabled={loading} className="h-7 px-2">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}
          {loading && !error && (
            <div className="flex items-center justify-center py-8 gap-2 text-[#7e7e7e]">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading submissions...
            </div>
          )}
          {!loading && !error && waitlist.length === 0 && (
            <p className="text-sm text-[#7e7e7e] text-center py-8">No waitlist submissions yet.</p>
          )}
          {!loading && !error && waitlist.length > 0 && (
            <div className="space-y-3">
              {waitlist.map(row => (
                <div key={row.id} className={`p-3 rounded-lg border transition ${statusStyle(row.status)}`}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-stone-900">{row.first_name} {row.last_name}</p>
                        {row.status === 'pending'            && <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Pending</Badge>}
                        {row.status === 'meeting-scheduled'  && <Badge className="bg-blue-100 text-blue-700 text-xs flex items-center gap-1"><Rocket className="w-2.5 h-2.5" /> Meeting Scheduled{row.meeting_date ? ` — ${new Date(row.meeting_date).toLocaleDateString()}` : ''}</Badge>}
                        {row.status === 'approved'           && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Approved</Badge>}
                        {row.status === 'rejected'           && <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>}
                        {row.status === 'parked'             && <Badge className="bg-stone-100 text-stone-600 text-xs">Parked — awaiting more info</Badge>}
                      </div>
                      <p className="text-xs text-stone-500 truncate mt-0.5">
                        {row.email} · {row.org_name} · {row.leader_profiles?.join(', ')} · {new Date(row.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* STEP 1: Pending → Schedule Meeting */}
                    {row.status === 'pending' && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          type="datetime-local"
                          className="text-xs border border-stone-200 rounded px-2 py-1 h-8"
                          value={meetingDateInputs[row.id] || ''}
                          onChange={e => setMeetingDateInputs(prev => ({ ...prev, [row.id]: e.target.value }))}
                        />
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                          disabled={updating === row.id} onClick={() => scheduleMeeting(row.id)}>
                          {updating === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Rocket className="w-3.5 h-3.5 mr-1" />Schedule Meeting</>}
                        </Button>
                      </div>
                    )}

                    {/* STEP 2: Meeting Scheduled → Approve / Reject / Park */}
                    {row.status === 'meeting-scheduled' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                          disabled={updating === row.id || inviting === row.id}
                          onClick={() => approveAndInvite(row)}>
                          {inviting === row.id ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Inviting...</> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve & Invite</>}
                        </Button>
                        <Button size="sm" variant="outline" className="border-stone-300 text-stone-600 h-8"
                          disabled={updating === row.id} onClick={() => updateStatus(row.id, 'parked')}>
                          Park
                        </Button>
                        <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 h-8"
                          disabled={updating === row.id} onClick={() => updateStatus(row.id, 'rejected')}>
                          <XCircle className="w-3.5 h-3.5 mr-1" />Reject
                        </Button>
                      </div>
                    )}

                    {/* Post-decision: Send Agreement (approved only) + Undo */}
                    {(row.status === 'approved' || row.status === 'rejected' || row.status === 'parked') && (
                      <div className="flex gap-2 flex-shrink-0">
                        {row.status === 'approved' && (
                          <SendAgreementButton
                            row={row}
                            onSent={() => setWaitlist(prev => prev.map(r => r.id === row.id ? { ...r, status: 'approved' as const } : r))}
                          />
                        )}
                        <Button size="sm" variant="outline" className="h-8 text-xs border-stone-300 text-stone-500 flex-shrink-0"
                          disabled={updating === row.id} onClick={() => undoDecision(row.id)}>
                          {updating === row.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '↩ Undo'}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Parked note */}
                  {row.status === 'parked' && (
                    <p className="text-xs text-stone-500 mt-2 pl-1">
                      📋 Parked applicants are held pending additional information or a future cohort. They will not receive platform access until approved.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Access Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'User Management', icon: Users, desc: 'Manage roles & access', color: 'emerald', page: 'partners' },
          { title: 'System Settings', icon: Settings, desc: 'Configure platform', color: 'stone', page: 'settings' },
          { title: 'Financial Overview', icon: DollarSign, desc: 'Revenue & reports', color: 'amber', page: 'agreements' },
          { title: 'Idea Pipeline', icon: Lightbulb, desc: 'Review submissions', color: 'emerald', page: 'idea-ranking' },
        ].map((item, idx) => (
          <Card key={idx} className="border-stone-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate(item.page)}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                item.color === 'emerald' ? 'bg-emerald-100' : item.color === 'amber' ? 'bg-amber-100' : 'bg-stone-100'
              }`}>
                <item.icon className={`w-5 h-5 ${
                  item.color === 'emerald' ? 'text-emerald-600' : item.color === 'amber' ? 'text-amber-600' : 'text-stone-600'
                }`} />
              </div>
              <p className="font-semibold text-stone-900 text-sm">{item.title}</p>
              <p className="text-xs text-stone-500">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* User Management Table — will be wired to Supabase profiles table */}
        <Card className="lg:col-span-2 border-stone-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-stone-900">User Management</CardTitle>
              <Button variant="outline" size="sm" onClick={() => onNavigate('partners')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-10 text-[#7e7e7e] text-sm">
              User management will display live data from Supabase once auth is connected.
            </div>
          </CardContent>
        </Card>

        {/* Recent Admin Actions */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-stone-900">Admin Action Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8 text-stone-400 text-sm">
              Action log coming soon — will show real admin activity from Supabase.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Analytics Placeholder */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-900">Platform Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg flex flex-col items-center justify-center">
              <BarChart3 className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-sm text-emerald-600 font-medium">User Growth</p>
              <p className="text-2xl font-bold text-emerald-800">+156</p>
              <p className="text-xs text-emerald-500">This month</p>
            </div>
            <div className="h-48 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex flex-col items-center justify-center">
              <DollarSign className="w-10 h-10 text-amber-400 mb-2" />
              <p className="text-sm text-amber-600 font-medium">Revenue</p>
              <p className="text-2xl font-bold text-amber-800">$412K</p>
              <p className="text-xs text-amber-500">This quarter</p>
            </div>
            <div className="h-48 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex flex-col items-center justify-center">
              <Cpu className="w-10 h-10 text-blue-400 mb-2" />
              <p className="text-sm text-blue-600 font-medium">System Status</p>
              <p className="text-2xl font-bold text-blue-800">Healthy</p>
              <p className="text-xs text-blue-500">Uptime: 99.9%</p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* New Badge Creator — Super Admin only */}
      <NewBadgeCreator isSuperAdmin={true} />

    </div>
  )
}
