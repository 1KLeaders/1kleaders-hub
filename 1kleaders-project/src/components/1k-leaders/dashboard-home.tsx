'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TrendingUp, DollarSign, Users, Briefcase, ArrowUpRight, ArrowDownRight, Calendar, CheckCircle, Lightbulb, Rocket, Star, Bot, BarChart3, MessageSquare } from 'lucide-react';
import type { DashboardRole, DashboardPriority, RoleBadge } from './types';
import { roleBadgeConfig } from './types';

interface Props { role: DashboardRole; navigate: (page: string) => void; }

function DigitalBadge({ role }: { role: RoleBadge }) {
  const config = roleBadgeConfig[role];
  if (!config) return null;
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>{config.icon} {config.label}</span>;
}

const dashboards: Record<DashboardRole, { metrics: { label: string; value: string; change: string; up: boolean; icon: any }[]; title: string; subtitle: string }> = {
  partner: {
    title: 'Welcome back, Partner',
    subtitle: 'Here\'s your venture portfolio overview',
    metrics: [
      { label: 'Total Investments', value: '$2.4M', change: '+12.5%', up: true, icon: DollarSign },
      { label: 'Active Ventures', value: '8', change: '+2', up: true, icon: Briefcase },
      { label: 'Portfolio ROI', value: '23.4%', change: '+3.2%', up: true, icon: TrendingUp },
      { label: 'Partner Level', value: 'Gold', change: 'Next: Platinum', up: true, icon: Users },
    ],
  },
  'super-admin': {
    title: 'Super Admin Panel',
    subtitle: 'Full platform control and monitoring',
    metrics: [
      { label: 'Total Users', value: '1,247', change: '+89 this month', up: true, icon: Users },
      { label: 'Active Partners', value: '342', change: '+15', up: true, icon: Briefcase },
      { label: 'Platform Revenue', value: '$890K', change: '+18.2%', up: true, icon: DollarSign },
      { label: 'System Health', value: '99.9%', change: 'Operational', up: true, icon: CheckCircle },
    ],
  },
  admin: {
    title: 'Admin Operations',
    subtitle: 'Manage daily operations and approvals',
    metrics: [
      { label: 'Pending Approvals', value: '23', change: '5 urgent', up: false, icon: Users },
      { label: 'Active Users', value: '845', change: '+34 today', up: true, icon: Briefcase },
      { label: 'Docs to Review', value: '17', change: '3 overdue', up: false, icon: CheckCircle },
      { label: 'Upcoming Meetings', value: '5', change: 'Today: 2', up: true, icon: Calendar },
    ],
  },
  shareholder: {
    title: 'Shareholder Dashboard',
    subtitle: 'Your shareholding and voting overview',
    metrics: [
      { label: 'Total Shares', value: '15,000', change: '+500 allocated', up: true, icon: Briefcase },
      { label: 'Current Value', value: '$3.2M', change: '+8.4%', up: true, icon: DollarSign },
      { label: 'Dividends YTD', value: '$45K', change: '+12%', up: true, icon: TrendingUp },
      { label: 'Voting Power', value: '4.2%', change: 'Active', up: true, icon: Users },
    ],
  },
  investor: {
    title: 'Investor Dashboard',
    subtitle: 'Track your investments and discover opportunities',
    metrics: [
      { label: 'Total Invested', value: '$1.8M', change: '+$200K', up: true, icon: DollarSign },
      { label: 'Portfolio Value', value: '$2.3M', change: '+27.8%', up: true, icon: TrendingUp },
      { label: 'Returns', value: '$500K', change: '+15.2%', up: true, icon: ArrowUpRight },
      { label: 'Active Investments', value: '6', change: '+1 new', up: true, icon: Briefcase },
    ],
  },
  'idea-owner': {
    title: 'Idea Owner Dashboard',
    subtitle: 'Track your idea progress and feedback',
    metrics: [
      { label: 'Submitted Ideas', value: '3', change: '1 under review', up: true, icon: Briefcase },
      { label: 'Evaluation Progress', value: '72%', change: 'Stage 4/6', up: true, icon: TrendingUp },
      { label: 'VEP Score', value: '8.5/10', change: '+0.5', up: true, icon: CheckCircle },
      { label: 'Demo Day', value: '15 days', change: 'Upcoming', up: true, icon: Calendar },
    ],
  },
  user: {
    title: 'Welcome to 1K Leaders',
    subtitle: 'Explore the platform and get started',
    metrics: [
      { label: 'Profile Completion', value: '60%', change: '3 steps left', up: false, icon: Users },
      { label: 'Available Opportunities', value: '24', change: '+5 this week', up: true, icon: Briefcase },
      { label: 'Connections', value: '12', change: '+3 new', up: true, icon: Users },
      { label: 'Announcements', value: '3', change: 'New', up: true, icon: Calendar },
    ],
  },
  'waiting-list': {
    title: 'Waiting List Account',
    subtitle: 'Your account is pending verification',
    metrics: [
      { label: 'Account Status', value: 'Unverified', change: 'Action required', up: false, icon: Users },
      { label: 'Queue Position', value: '#127', change: 'Moving up', up: true, icon: Briefcase },
      { label: 'Verification Steps', value: '2/4', change: '50% complete', up: false, icon: CheckCircle },
      { label: 'Est. Wait Time', value: '~2 weeks', change: 'Processing', up: true, icon: Calendar },
    ],
  },
  temporary: {
    title: 'Temporary Access',
    subtitle: 'Limited account with basic features',
    metrics: [
      { label: 'Account Type', value: 'Temporary', change: 'Limited', up: false, icon: Users },
      { label: 'Time Remaining', value: '14 days', change: 'Expiring soon', up: false, icon: Calendar },
      { label: 'Features Available', value: 'Basic', change: '3 of 12', up: false, icon: Briefcase },
      { label: 'Upgrade Status', value: 'Pending', change: 'Apply now', up: false, icon: TrendingUp },
    ],
  },
};

const activities: Record<DashboardRole, { text: string; time: string; type: string }[]> = {
  partner: [
    { text: 'New venture "GreenTech Solutions" added to portfolio', time: '2 hours ago', type: 'info' },
    { text: 'Monthly ROI report is now available', time: '5 hours ago', type: 'success' },
    { text: 'Partner meeting scheduled for tomorrow', time: '1 day ago', type: 'warning' },
    { text: 'Investment milestone reached: $2M+', time: '2 days ago', type: 'success' },
  ],
  'super-admin': [
    { text: '15 new user registrations today', time: '1 hour ago', type: 'info' },
    { text: 'System maintenance completed successfully', time: '3 hours ago', type: 'success' },
    { text: 'New partnership agreement pending approval', time: '6 hours ago', type: 'warning' },
    { text: 'Automated admission letter sent to 3 new members', time: '1 day ago', type: 'success' },
  ],
  admin: [
    { text: '5 new applications awaiting review', time: '30 min ago', type: 'warning' },
    { text: 'Newsletter "May Update" - 84% open rate', time: '2 hours ago', type: 'success' },
    { text: 'Document submission deadline approaching', time: '4 hours ago', type: 'warning' },
    { text: 'Welcome email sent to 2 new verified partners', time: '5 hours ago', type: 'success' },
  ],
  shareholder: [
    { text: 'Q4 dividend distribution announced', time: '1 hour ago', type: 'success' },
    { text: 'New voting proposal: Board expansion', time: '3 hours ago', type: 'warning' },
    { text: 'Discussion room: Investment Committee is active', time: '6 hours ago', type: 'info' },
    { text: 'Share value increased by 2.3%', time: '2 days ago', type: 'success' },
  ],
  investor: [
    { text: 'Startup "AI Health" seeking Series A funding', time: '1 hour ago', type: 'info' },
    { text: 'Your investment in "CleanEnergy" grew 15%', time: '4 hours ago', type: 'success' },
    { text: 'New opportunity matching your interests', time: '6 hours ago', type: 'info' },
    { text: 'Idea Ranking updated - check top ideas', time: '1 day ago', type: 'info' },
  ],
  'idea-owner': [
    { text: 'Your idea "GreenTech" ranked #1 in CleanTech', time: '1 hour ago', type: 'success' },
    { text: 'VEP feedback is ready for review', time: '5 hours ago', type: 'info' },
    { text: 'New VVP assignment: Evaluate SmartFarm idea', time: '1 day ago', type: 'warning' },
    { text: 'Demo Day registration is open', time: '2 days ago', type: 'warning' },
  ],
  user: [
    { text: 'Complete your profile to unlock more features', time: 'Just now', type: 'warning' },
    { text: 'New opportunity posted in FinTech sector', time: '3 hours ago', type: 'info' },
    { text: 'Try the AI Idea Assistant to refine your ideas', time: '1 day ago', type: 'info' },
  ],
  'waiting-list': [
    { text: 'Please verify your email to proceed', time: 'Just now', type: 'warning' },
    { text: 'Your queue position moved up by 5 spots', time: '1 day ago', type: 'success' },
    { text: 'Verification documents required', time: '2 days ago', type: 'warning' },
  ],
  temporary: [
    { text: 'Upgrade to a full account for complete access', time: 'Just now', type: 'warning' },
    { text: 'Your temporary access expires in 14 days', time: '1 day ago', type: 'warning' },
    { text: 'Explore basic features available to you', time: '3 days ago', type: 'info' },
  ],
};

const startupHighlights = [
  { name: 'GreenTech Solutions', sector: 'CleanTech', stage: 'Series A', roi: '+23%', status: 'Active' },
  { name: 'HealthConnect', sector: 'HealthTech', stage: 'Seed', roi: '+15%', status: 'Active' },
  { name: 'EduPay', sector: 'FinTech', stage: 'Pre-Seed', roi: '+8%', status: 'Evaluating' },
  { name: 'PropEase', sector: 'PropTech', stage: 'Series A', roi: '+31%', status: 'Active' },
];

const ideaHighlights = [
  { name: 'AI Energy Optimizer', votes: 87, interest: 92, feasibility: 78, category: 'CleanTech' },
  { name: 'Telemedicine MENA', votes: 72, interest: 85, feasibility: 82, category: 'HealthTech' },
  { name: 'Student Micro-Finance', votes: 65, interest: 78, feasibility: 70, category: 'FinTech' },
  { name: 'IoT SmartFarm', votes: 58, interest: 71, feasibility: 68, category: 'AgriTech' },
];

export default function DashboardHome({ role, navigate }: Props) {
  const [priority, setPriority] = useState<DashboardPriority>('balanced');
  const d = dashboards[role];
  const acts = activities[role] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            {d.title}
            <DigitalBadge role={role as RoleBadge} />
          </h1>
          <p className="text-[#7e7e7e]">{d.subtitle}</p>
        </div>
        {/* Priority Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#7e7e7e]">Focus:</span>
          {[
            { key: 'startups' as const, label: 'Startups', icon: Rocket },
            { key: 'balanced' as const, label: 'Balanced', icon: Star },
            { key: 'ideas' as const, label: 'Ideas', icon: Lightbulb },
          ].map(p => (
            <button key={p.key} onClick={() => setPriority(p.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${priority === p.key ? 'bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white' : 'bg-[#f0f0f0] text-[#555353] hover:bg-[#e8e8e8]'}`}>
              <p.icon className="w-3 h-3" />{p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {d.metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#7e7e7e] font-medium">{m.label}</span>
                <div className="w-8 h-8 rounded-lg bg-[#e33b5f]/10 flex items-center justify-center">
                  <m.icon className="w-4 h-4 text-[#e33b5f]" />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#222]">{m.value}</div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${m.up ? 'text-[#e33b5f]' : 'text-[#f07969]'}`}>
                {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {m.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {acts.map((a, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#fbfbfb]">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${a.type === 'success' ? 'bg-[#e33b5f]' : a.type === 'warning' ? 'bg-[#f07969]' : 'bg-[#555353]'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#444]">{a.text}</p>
                    <p className="text-xs text-[#9e9e9e] mt-1">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('idea-submission')}>
              <Lightbulb className="w-4 h-4 mr-2" /> Submit New Idea
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('ai-assistant')}>
              <Bot className="w-4 h-4 mr-2" /> AI Idea Assistant
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('idea-ranking')}>
              <BarChart3 className="w-4 h-4 mr-2" /> View Idea Rankings
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('calendar')}>
              <Calendar className="w-4 h-4 mr-2" /> Calendar & Meetings
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('discussion-rooms')}>
              <MessageSquare className="w-4 h-4 mr-2" /> Discussion Rooms
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('agreements')}>
              <CheckCircle className="w-4 h-4 mr-2" /> View Agreements
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Priority-based Content */}
      {(priority === 'startups' || priority === 'balanced') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Rocket className="w-5 h-5 text-[#e33b5f]" /> Active Startups</CardTitle>
              <Button variant="ghost" size="sm" className="text-[#e33b5f]">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {startupHighlights.map(s => (
                <div key={s.name} className="p-3 border rounded-lg hover:shadow-md transition cursor-pointer">
                  <h4 className="font-semibold text-sm text-[#222]">{s.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{s.sector}</Badge>
                    <Badge variant="outline" className="text-xs">{s.stage}</Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-sm font-bold ${s.roi.startsWith('+') ? 'text-[#e33b5f]' : 'text-red-600'}`}>{s.roi}</span>
                    <Badge className={`text-xs ${s.status === 'Active' ? 'bg-[#e33b5f]/10 text-[#e33b5f]' : 'bg-[#f07969]/10 text-[#f07969]'}`}>{s.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(priority === 'ideas' || priority === 'balanced') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-5 h-5 text-[#f07969]" /> Top Ranked Ideas</CardTitle>
              <Button variant="ghost" size="sm" className="text-[#e33b5f]" onClick={() => navigate('idea-ranking')}>View Rankings</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ideaHighlights.map((idea, i) => (
                <div key={idea.name} className="flex items-center justify-between p-3 border rounded-lg hover:bg-[#f6f6f6] transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-[#f07969]/10 text-[#f07969]' : 'bg-[#f0f0f0] text-[#555353]'}`}>{i + 1}</div>
                    <div>
                      <p className="font-medium text-sm text-[#222]">{idea.name}</p>
                      <Badge variant="secondary" className="text-xs">{idea.category}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[#7e7e7e]">
                    <span>👍 {idea.votes}</span>
                    <span>❤️ {idea.interest}%</span>
                    <span>📊 {idea.feasibility}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Automated Admission Letter Banner */}
      {(role === 'admin' || role === 'super-admin') && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#e33b5f]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#e33b5f]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#222]">Automated Admission Letters</p>
                <p className="text-xs text-[#7e7e7e]">Welcome emails are automatically sent when new members are approved. 3 members approved this week.</p>
              </div>
              <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] text-xs">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Expiry Alert */}
      <Card className="border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#222]">Document Expiry Alerts</p>
              <p className="text-xs text-[#7e7e7e]">2 documents expiring within 30 days. Auto-added to calendar with email & WhatsApp reminders.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('calendar')}>View Calendar</Button>
          </div>
        </CardContent>
      </Card>

      {role === 'waiting-list' && (
        <Card className="border-[#f07969]/20 bg-[#f07969]/5">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-[#f07969] mb-2">Verify Your Account</h3>
            <p className="text-[#f07969] text-sm mb-4">Complete the verification steps to gain full platform access and move up the waitlist.</p>
            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90" onClick={() => navigate('onboarding')}>Start Verification</Button>
          </CardContent>
        </Card>
      )}

      {role === 'temporary' && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-[#e33b5f] mb-2">Upgrade to Full Account</h3>
            <p className="text-[#e33b5f] text-sm mb-4">Get complete access to all platform features by applying for a full account.</p>
            <Button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] hover:opacity-90" onClick={() => navigate('waitlist')}>Apply Now</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
