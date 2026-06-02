'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  Briefcase,
  DollarSign,
  Award,
  Calendar,
  FileText,
  Users,
  Lightbulb,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'

interface PartnerDashboardProps {
  onNavigate: (page: string) => void
}

const metrics = [
  { title: 'Total Investments', value: '$1.25M', change: '+12.5%', icon: DollarSign, color: 'emerald' },
  { title: 'Active Ventures', value: '8', change: '+2', icon: Briefcase, color: 'amber' },
  { title: 'Average ROI', value: '18.4%', change: '+3.2%', icon: TrendingUp, color: 'emerald' },
  { title: 'Partner Level', value: 'Gold', change: 'Next: Platinum', icon: Award, color: 'amber' },
]

const recentActivities = [
  { action: 'Investment confirmed in TechVenture AI', time: '2 hours ago', type: 'success' },
  { action: 'New agreement sent for review', time: '5 hours ago', type: 'info' },
  { action: 'Quarterly dividend received - $12,500', time: '1 day ago', type: 'success' },
  { action: 'Partner meeting scheduled for March 15', time: '2 days ago', type: 'info' },
  { action: 'Idea evaluation completed for GreenTech', time: '3 days ago', type: 'success' },
  { action: 'Document verification pending', time: '4 days ago', type: 'warning' },
]

const activeVentures = [
  { name: 'TechVenture AI', sector: 'Technology', stage: 'Early Growth', investment: '$250K', roi: '+24%', status: 'Active' },
  { name: 'GreenTech Solutions', sector: 'Clean Energy', stage: 'Seed', investment: '$150K', roi: '+8%', status: 'Active' },
  { name: 'HealthBridge', sector: 'Healthcare', stage: 'Scaling', investment: '$300K', roi: '+32%', status: 'Active' },
  { name: 'EduFuture', sector: 'Education', stage: 'Idea', investment: '$50K', roi: 'N/A', status: 'Evaluating' },
  { name: 'FinPay', sector: 'FinTech', stage: 'Early Growth', investment: '$200K', roi: '+15%', status: 'Active' },
]

const upcomingEvents = [
  { title: 'Quarterly Partner Meeting', date: 'Mar 15, 2026', time: '10:00 AM', type: 'Meeting' },
  { title: 'Demo Day - Spring Cohort', date: 'Mar 22, 2026', time: '2:00 PM', type: 'Event' },
  { title: 'Investment Committee Review', date: 'Mar 28, 2026', time: '9:00 AM', type: 'Review' },
  { title: 'AGM Annual Meeting', date: 'Apr 5, 2026', time: '11:00 AM', type: 'Meeting' },
]

export function PartnerDashboard({ onNavigate }: PartnerDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 border-0 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Welcome back, Ahmed! 👋</h1>
              <p className="text-emerald-100">Your partner dashboard is up to date. Here&apos;s your latest overview.</p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/30 text-sm px-3 py-1">
              <Award className="w-3.5 h-3.5 mr-1" /> Gold Partner
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2 border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-stone-900">Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.type === 'success' ? 'bg-emerald-100' :
                    activity.type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    {activity.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> :
                     activity.type === 'warning' ? <AlertCircle className="w-4 h-4 text-amber-600" /> :
                     <Clock className="w-4 h-4 text-blue-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-800">{activity.action}</p>
                    <p className="text-xs text-stone-400">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card className="border-stone-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-stone-900">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {upcomingEvents.map((event, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-stone-200 hover:border-emerald-200 transition-colors">
                  <p className="font-medium text-sm text-stone-800">{event.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-3 h-3 text-stone-400" />
                    <span className="text-xs text-stone-500">{event.date}</span>
                    <span className="text-xs text-stone-400">•</span>
                    <span className="text-xs text-stone-500">{event.time}</span>
                  </div>
                  <Badge variant="outline" className="mt-2 text-xs">{event.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Ventures Table */}
      <Card className="border-stone-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-stone-900">Active Ventures</CardTitle>
            <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700" onClick={() => onNavigate('partners')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venture</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Investment</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeVentures.map((venture, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{venture.name}</TableCell>
                    <TableCell>{venture.sector}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{venture.stage}</Badge>
                    </TableCell>
                    <TableCell>{venture.investment}</TableCell>
                    <TableCell className={venture.roi.startsWith('+') ? 'text-emerald-600 font-medium' : 'text-stone-500'}>
                      {venture.roi}
                    </TableCell>
                    <TableCell>
                      <Badge className={venture.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                        {venture.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="border-stone-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('idea-submission')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Submit Idea</p>
              <p className="text-xs text-stone-500">Propose a new venture</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('agreements')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">View Agreements</p>
              <p className="text-xs text-stone-500">Manage contracts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-stone-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('partners')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Connect Partners</p>
              <p className="text-xs text-stone-500">Network & collaborate</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
