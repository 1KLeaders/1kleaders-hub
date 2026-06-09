'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Eye,
  Edit,
  Trash2,
  Rocket,
  Clock,
  CheckCheck,
} from 'lucide-react'

interface SuperAdminDashboardProps {
  onNavigate: (page: string) => void
}

const platformMetrics = [
  { title: 'Total Users', value: '2,847', change: '+156 this month', icon: Users, color: 'emerald' },
  { title: 'Active Shareholders', value: '487', change: '+23 this quarter', icon: Shield, color: 'amber' },
  { title: 'Platform Revenue', value: '$2.4M', change: '+18.5% YoY', icon: DollarSign, color: 'emerald' },
  { title: 'System Health', value: '99.9%', change: 'All systems operational', icon: Activity, color: 'emerald' },
]

const users = [
  { name: 'Ahmed Al-Rashid', email: 'ahmed@example.com', role: 'Shareholder', status: 'Active', joined: 'Jan 2024' },
  { name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Investor', status: 'Active', joined: 'Feb 2024' },
  { name: 'Mohammed Hassan', email: 'mohammed@example.com', role: 'Idea Owner', status: 'Pending', joined: 'Mar 2024' },
  { name: 'Fatima Al-Zahra', email: 'fatima@example.com', role: 'Shareholder', status: 'Active', joined: 'Jan 2024' },
  { name: 'James Wilson', email: 'james@example.com', role: 'Shareholder', status: 'Suspended', joined: 'Dec 2023' },
  { name: 'Layla Noor', email: 'layla@example.com', role: 'Admin', status: 'Active', joined: 'Nov 2023' },
]

const initialPendingStartups = [
  { id: 1, name: 'NanoHealth AI', founder: 'Rania Khalil', sector: 'HealthTech', stage: 'Seed', submitted: '2026-06-01', status: 'pending' as 'pending' | 'approved' | 'rejected' },
  { id: 2, name: 'SolarGrid MENA', founder: 'Tariq Al-Farsi', sector: 'CleanTech', stage: 'Pre-Seed', submitted: '2026-06-03', status: 'pending' as 'pending' | 'approved' | 'rejected' },
  { id: 3, name: 'FinCore Platform', founder: 'Sara Nasser', sector: 'FinTech', stage: 'Series A', submitted: '2026-06-05', status: 'pending' as 'pending' | 'approved' | 'rejected' },
]

const adminActions = [
  { action: 'Approved KYC for Sarah Johnson', admin: 'System', time: '10 min ago' },
  { action: 'Updated platform fee structure', admin: 'Ahmed K.', time: '1 hour ago' },
  { action: 'Suspended user James Wilson', admin: 'Layla N.', time: '3 hours ago' },
  { action: 'Deployed system update v3.2.1', admin: 'System', time: '6 hours ago' },
  { action: 'Created new agreement template', admin: 'Fatima A.', time: '1 day ago' },
  { action: 'Exported quarterly financial report', admin: 'Ahmed K.', time: '2 days ago' },
]

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Suspended: 'bg-red-100 text-red-700',
}

export function SuperAdminDashboard({ onNavigate }: SuperAdminDashboardProps) {
  const [pendingStartups, setPendingStartups] = useState(initialPendingStartups)

  const approveStartup = (id: number) => {
    setPendingStartups(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' as const } : s))
  }
  const rejectStartup = (id: number) => {
    setPendingStartups(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' as const } : s))
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

      {/* Startup Approvals */}
      <Card className="border-amber-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-stone-900 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[#e33b5f]" /> Startup Approvals
            </CardTitle>
            <Badge className="bg-amber-100 text-amber-700">{pendingStartups.filter(s => s.status === 'pending').length} Pending</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingStartups.map(startup => (
              <div key={startup.id} className={`flex items-center justify-between p-3 rounded-lg border transition ${
                startup.status === 'approved' ? 'bg-emerald-50 border-emerald-200' :
                startup.status === 'rejected' ? 'bg-red-50 border-red-200' :
                'bg-amber-50 border-amber-200'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-stone-900">{startup.name}</p>
                    {startup.status === 'approved' && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Approved</Badge>}
                    {startup.status === 'rejected' && <Badge className="bg-red-100 text-red-700 text-xs">Rejected</Badge>}
                    {startup.status === 'pending' && <Badge className="bg-amber-100 text-amber-700 text-xs flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Pending</Badge>}
                  </div>
                  <p className="text-xs text-stone-500">Founder: {startup.founder} · {startup.sector} · {startup.stage} · Submitted {startup.submitted}</p>
                </div>
                {startup.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8" onClick={() => approveStartup(startup.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 h-8" onClick={() => rejectStartup(startup.id)}>
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
                {startup.status !== 'pending' && (
                  <CheckCheck className={`w-5 h-5 ${startup.status === 'approved' ? 'text-emerald-500' : 'text-red-400'}`} />
                )}
              </div>
            ))}
          </div>
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
        {/* User Management Table */}
        <Card className="lg:col-span-2 border-stone-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-stone-900">User Management</CardTitle>
              <Button variant="outline" size="sm">Add User</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-stone-900 text-sm">{user.name}</p>
                          <p className="text-xs text-stone-400">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{user.role}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[user.status] || 'bg-stone-100 text-stone-700'}>{user.status}</Badge></TableCell>
                      <TableCell className="text-sm text-stone-500">{user.joined}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Eye,
  Edit,
  Trash2
} from 'lucide-react'

interface SuperAdminDashboardProps {
  onNavigate: (page: string) => void
}

const platformMetrics = [
  { title: 'Total Users', value: '2,847', change: '+156 this month', icon: Users, color: 'emerald' },
  { title: 'Active Shareholders', value: '487', change: '+23 this quarter', icon: Shield, color: 'amber' },
  { title: 'Platform Revenue', value: '$2.4M', change: '+18.5% YoY', icon: DollarSign, color: 'emerald' },
  { title: 'System Health', value: '99.9%', change: 'All systems operational', icon: Activity, color: 'emerald' },
]

const users = [
  { name: 'Ahmed Al-Rashid', email: 'ahmed@example.com', role: 'Shareholder', status: 'Active', joined: 'Jan 2024' },
  { name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Investor', status: 'Active', joined: 'Feb 2024' },
  { name: 'Mohammed Hassan', email: 'mohammed@example.com', role: 'Idea Owner', status: 'Pending', joined: 'Mar 2024' },
  { name: 'Fatima Al-Zahra', email: 'fatima@example.com', role: 'Shareholder', status: 'Active', joined: 'Jan 2024' },
  { name: 'James Wilson', email: 'james@example.com', role: 'Shareholder', status: 'Suspended', joined: 'Dec 2023' },
  { name: 'Layla Noor', email: 'layla@example.com', role: 'Admin', status: 'Active', joined: 'Nov 2023' },
]

const adminActions = [
  { action: 'Approved KYC for Sarah Johnson', admin: 'System', time: '10 min ago' },
  { action: 'Updated platform fee structure', admin: 'Ahmed K.', time: '1 hour ago' },
  { action: 'Suspended user James Wilson', admin: 'Layla N.', time: '3 hours ago' },
  { action: 'Deployed system update v3.2.1', admin: 'System', time: '6 hours ago' },
  { action: 'Created new agreement template', admin: 'Fatima A.', time: '1 day ago' },
  { action: 'Exported quarterly financial report', admin: 'Ahmed K.', time: '2 days ago' },
]

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Suspended: 'bg-red-100 text-red-700',
}

export function SuperAdminDashboard({ onNavigate }: SuperAdminDashboardProps) {
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

      {/* Quick Access Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'User Management', icon: Users, desc: 'Manage roles & access', color: 'emerald', page: 'shareholders' },
          { title: 'System Settings', icon: Settings, desc: 'Configure platform', color: 'stone', page: 'settings' },
          { title: 'Financial Overview', icon: DollarSign, desc: 'Revenue & reports', color: 'amber', page: 'agreements' },
          { title: 'Idea Pipeline', icon: Lightbulb, desc: 'Review submissions', color: 'emerald', page: 'idea-submission' },
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
        {/* User Management Table */}
        <Card className="lg:col-span-2 border-stone-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-stone-900">User Management</CardTitle>
              <Button variant="outline" size="sm">Add User</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-stone-900 text-sm">{user.name}</p>
                          <p className="text-xs text-stone-400">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{user.role}</Badge></TableCell>
                      <TableCell><Badge className={statusColors[user.status] || 'bg-stone-100 text-stone-700'}>{user.status}</Badge></TableCell>
                      <TableCell className="text-sm text-stone-500">{user.joined}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Eye className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
