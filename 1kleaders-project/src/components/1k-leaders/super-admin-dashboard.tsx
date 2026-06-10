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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SuperAdminDashboardProps {
  onNavigate: (page: string) => void
}

// Placeholder metrics — will be replaced with live DB counts in a future update
const platformMetrics = [
  { title: 'Total Users', value: '—', change: 'Loading...', icon: Users, color: 'emerald' },
  { title: 'Active Shareholders', value: '—', change: 'Loading...', icon: Shield, color: 'amber' },
  { title: 'Platform Revenue', value: '—', change: 'Loading...', icon: DollarSign, color: 'emerald' },
  { title: 'System Health', value: '99.9%', change: 'All systems operational', icon: Activity, color: 'emerald' },
]

const adminActions = [
  { action: 'Schema initialised — Supabase connected', admin: 'System', time: 'Just now' },
]

type WaitlistRow = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string
  org_name: string
  leader_profiles: string[]
  status: 'pending' | 'approved' | 'rejected' | 'parked' | 'more-info-required'
  admin_notes: string | null
}

export function SuperAdminDashboard({ onNavigate }: SuperAdminDashboardProps) {
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchWaitlist = async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('waitlist_submissions')
      .select('id, created_at, first_name, last_name, email, org_name, leader_profiles, status, admin_notes')
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

  const updateStatus = async (id: string, status: WaitlistRow['status']) => {
    setUpdating(id)
    const { error } = await supabase
      .from('waitlist_submissions')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    if (!error) {
      setWaitlist(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    }
    setUpdating(null)
  }

  const pendingCount = waitlist.filter(r => r.status === 'pending').length

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

      {/* Platform Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {platformMetrics.map((metric, idx) => (
          <Card key={idx} className="border-stone-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-stone-500 mb-1">{metric.title}</p>
                  <p className="text-2xl font-bold text-stone-900">{metric.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  metric.color === 'emerald' ? 'bg-emerald-100' : 'bg-amber-100'
                }`}>
                  <metric.icon className={`w-5 h-5 ${metric.color === 'emerald' ? 'text-emerald-600' : 'text-amber-600'}`} />
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> {metric.change}
              </p>
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
              {!loading && <Badge className="bg-amber-100 text-amber-700">{pendingCount} Pending</Badge>}
              <Button size="sm" variant="outline" onClick={fetchWaitlist} disabled={loading} className="h-7 px-2">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-sm text-red-500 text-center py-4">{error}</p>
          )}
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
                <div key={row.id} className={`flex items-center justify-between p-3 rounded-lg border transition ${
                  row.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                  row.status === 'rejected' ? 'bg-red-50 border-red-200' :
                  row.status === 'parked'   ? 'bg-stone-50 border-stone-200' :
                  'bg-amber-50 border-amber-200'
                }`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-stone-900">{row.first_name} {row.last_name}</p>
                      {row.status === 'pending'  && <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Pending</Badge>}
                      {row.status === 'approved' && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Approved</Badge>}
                      {row.status === 'rejected' && <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>}
                      {row.status === 'parked'   && <Badge className="bg-stone-100 text-stone-600 text-xs">Parked</Badge>}
                    </div>
                    <p className="text-xs text-stone-500 truncate">
                      {row.email} · {row.org_name} · {row.leader_profiles?.join(', ')} · {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {row.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0 ml-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
                        disabled={updating === row.id} onClick={() => updateStatus(row.id, 'approved')}>
                        {updating === row.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Approve</>}
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
                  {row.status !== 'pending' && (
                    <CheckCheck className={`w-5 h-5 flex-shrink-0 ml-2 ${row.status === 'approved' ? 'text-emerald-500' : row.status === 'rejected' ? 'text-red-400' : 'text-stone-400'}`} />
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
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {adminActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-stone-50">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-stone-800">{action.action}</p>
                    <p className="text-xs text-stone-400">by {action.admin} • {action.time}</p>
                  </div>
                </div>
              ))}
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
    </div>
  )
}
