'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, DollarSign, Users, Briefcase, ArrowUpRight, ArrowDownRight, Calendar, CheckCircle, Lightbulb, Rocket, Star, Bot, BarChart3, MessageSquare, Linkedin, FileText, ExternalLink, Building2, Loader2 } from 'lucide-react';
import type { DashboardRole, DashboardPriority, RoleBadge } from './types';
import { roleBadgeConfig } from './types';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface Props { role: DashboardRole; navigate: (page: string) => void; }

function DigitalBadge({ role }: { role: RoleBadge }) {
  const config = roleBadgeConfig[role];
  if (!config) return null;
  return <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.color}`}>{config.icon} {config.label}</span>;
}

// Static metric configs — values filled in dynamically
const dashboardConfigs: Record<string, { title: string; subtitle: string }> = {
  shareholder:   { title: 'Shareholder Dashboard',   subtitle: 'Your shareholding, investments & portfolio overview' },
  'super-admin': { title: 'Super Admin Panel',        subtitle: 'Full platform control and monitoring' },
  admin:         { title: 'Admin Operations',         subtitle: 'Manage daily operations and approvals' },
  user:          { title: 'Welcome to 1K Leaders',    subtitle: 'Explore the platform and get started' },
  developer:     { title: '🛠 Developer View',        subtitle: 'Full platform access — use the role switcher to preview any view' },
};

const activities: Record<DashboardRole, { text: string; time: string; type: string }[]> = {
  shareholder: [
    { text: 'Q4 dividend distribution announced', time: '1 hour ago', type: 'success' },
    { text: 'New voting proposal: Board expansion', time: '3 hours ago', type: 'warning' },
    { text: 'Discussion room: Investment Committee is active', time: '6 hours ago', type: 'info' },
    { text: 'Share value increased by 2.3%', time: '2 days ago', type: 'success' },
    { text: 'New startup opportunity matching your interests', time: '3 days ago', type: 'info' },
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
  user: [
    { text: 'Complete your profile to unlock more features', time: 'Just now', type: 'warning' },
    { text: 'New opportunity posted in FinTech sector', time: '3 hours ago', type: 'info' },
    { text: 'Try the AI Idea Assistant to refine your ideas', time: '1 day ago', type: 'info' },
  ],
  developer: [
    { text: 'Auth context loaded — session active', time: 'Just now', type: 'success' },
    { text: 'JWT app_role claim: developer ✓', time: 'Just now', type: 'success' },
    { text: 'Use the role switcher in the sidebar to preview any view', time: 'Just now', type: 'info' },
  ],
};

const startupHighlights = [
  {
    name: 'GreenTech Solutions', sector: 'CleanTech', stage: 'Series A', roi: '+23%', status: 'Active',
    logo: null, companyLinkedIn: '', pitchDeck: '', description: '', founded: '', team: '', website: '', moreInfo: '',
  },
  {
    name: 'HealthConnect', sector: 'HealthTech', stage: 'Seed', roi: '+15%', status: 'Active',
    logo: null, companyLinkedIn: '', pitchDeck: '', description: '', founded: '', team: '', website: '', moreInfo: '',
  },
  {
    name: 'EduPay', sector: 'FinTech', stage: 'Pre-Seed', roi: '+8%', status: 'Evaluating',
    logo: null, companyLinkedIn: '', pitchDeck: '', description: '', founded: '', team: '', website: '', moreInfo: '',
  },
  {
    name: 'PropEase', sector: 'PropTech', stage: 'Series A', roi: '+31%', status: 'Active',
    logo: null, companyLinkedIn: '', pitchDeck: '', description: '', founded: '', team: '', website: '', moreInfo: '',
  },
];

const ideaHighlights = [
  { name: 'AI Energy Optimizer', votes: 87, interest: 92, feasibility: 78, category: 'CleanTech' },
  { name: 'Telemedicine MENA', votes: 72, interest: 85, feasibility: 82, category: 'HealthTech' },
  { name: 'Student Micro-Finance', votes: 65, interest: 78, feasibility: 70, category: 'FinTech' },
  { name: 'IoT SmartFarm', votes: 58, interest: 71, feasibility: 68, category: 'AgriTech' },
];

export default function DashboardHome({ role, navigate }: Props) {
  const { profile } = useAuth();
  const [priority, setPriority] = useState<DashboardPriority>('balanced');
  const [selectedStartup, setSelectedStartup] = useState<typeof startupHighlights[0] | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<{ label: string; value: string; change: string; up: boolean; icon: any }[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const cfg = dashboardConfigs[role] ?? dashboardConfigs['user'];
  const acts = activities[role] || [];

  useEffect(() => {
    setLiveMetrics([]);
    setMetricsLoading(true);
    async function fetchMetrics() {
      try {
        if (role === 'super-admin' || role === 'developer') {
          const [{ count: total }, { count: shareholders }, { count: pending }] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'shareholder'),
            supabase.from('waitlist_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          ]);
          const { count: ideas } = await supabase.from('ideas').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 }));
          setLiveMetrics([
            { label: 'Total Users',      value: String(total ?? 0),        change: 'Registered',       up: true,  icon: Users },
            { label: 'Shareholders',     value: String(shareholders ?? 0), change: 'Active partners',  up: true,  icon: Briefcase },
            { label: 'Pending Waitlist', value: String(pending ?? 0),      change: 'Awaiting review',  up: false, icon: Calendar },
            { label: 'Ideas Submitted',  value: String(ideas ?? 0),        change: 'All time',         up: true,  icon: Lightbulb },
          ]);
        } else if (role === 'admin') {
          const [{ count: pendingWaitlist }, { count: pendingDocs }, { count: users }] = await Promise.all([
            supabase.from('waitlist_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('kyc_documents').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
          ]);
          setLiveMetrics([
            { label: 'Pending Approvals',  value: String(pendingWaitlist ?? 0), change: 'Waitlist queue',   up: false, icon: Users },
            { label: 'Total Members',      value: String(users ?? 0),           change: 'Platform users',  up: true,  icon: Briefcase },
            { label: 'KYC Docs to Review', value: String(pendingDocs ?? 0),     change: 'Awaiting review', up: false, icon: CheckCircle },
            { label: 'System Health',      value: '99.9%',                      change: 'Operational',     up: true,  icon: TrendingUp },
          ]);
        } else if (role === 'shareholder') {
          const [{ count: ideas }, { count: members }] = await Promise.all([
            supabase.from('ideas').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'shareholder'),
          ]);
          setLiveMetrics([
            { label: 'Shareholder Since', value: profile?.created_at ? new Date(profile.created_at).getFullYear().toString() : '—', change: 'Partner',        up: true, icon: Star },
            { label: 'Onboarding Status', value: profile?.onboarding_status ?? '—',                                                  change: 'Current step',  up: true, icon: CheckCircle },
            { label: 'Total Members',     value: String(members ?? 0),                                                               change: 'Shareholders',  up: true, icon: Users },
            { label: 'Ideas in Pipeline', value: String(ideas ?? 0),                                                                 change: 'Submitted',     up: true, icon: Lightbulb },
          ]);
        } else {
          const pct = [
            profile?.first_name, profile?.last_name, profile?.bio,
            profile?.org_name, profile?.linkedin_url, profile?.expertise_domains?.length,
          ].filter(Boolean).length;
          const completion = Math.round((pct / 6) * 100);
          setLiveMetrics([
            { label: 'Profile Completion', value: `${completion}%`,                         change: `${6 - pct} fields left`,                                                                          up: completion === 100, icon: Users },
            { label: 'Onboarding Status',  value: profile?.onboarding_status ?? '—',        change: 'Current step',                                                                                    up: true,               icon: CheckCircle },
            { label: 'Member Since',       value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '—', change: 'Platform member', up: true, icon: Calendar },
            { label: 'Role',               value: profile?.role ?? '—',                     change: profile?.subroles?.join(', ') || 'No subroles',                                                    up: true,               icon: Briefcase },
          ]);
        }
      } catch (e) {
        console.warn('Dashboard metrics fetch failed', e);
      }
      setMetricsLoading(false);
    }
    fetchMetrics();
  }, [role]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
            {cfg.title}
            <DigitalBadge role={role as RoleBadge} />
          </h1>
          <p className="text-[#7e7e7e]">{cfg.subtitle}</p>
        </div>
        {/* Priority Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#7e7e7e]">Focus:</span>
          {[
            { key: 'startups' as const, label: 'Startups', icon: Rocket },
            
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
        {metricsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-3 w-20 bg-[#f0f0f0] rounded animate-pulse" />
                    <div className="w-8 h-8 rounded-lg bg-[#f0f0f0] animate-pulse" />
                  </div>
                  <div className="h-7 w-16 bg-[#f0f0f0] rounded animate-pulse mt-1" />
                  <div className="h-3 w-24 bg-[#f0f0f0] rounded animate-pulse mt-2" />
                </CardContent>
              </Card>
            ))
          : liveMetrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#7e7e7e] font-medium">{m.label}</span>
                  <div className="w-8 h-8 rounded-lg bg-[#e33b5f]/10 flex items-center justify-center">
                    <m.icon className="w-4 h-4 text-[#e33b5f]" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-[#222] truncate">{m.value}</div>
                <div className={`flex items-center gap-1 text-xs mt-1 ${m.up ? 'text-[#e33b5f]' : 'text-[#f07969]'}`}>
                  {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {m.change}
                </div>
              </CardContent>
            </Card>
          ))
        }
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
                <div key={s.name} className="p-3 border rounded-lg hover:shadow-md transition cursor-pointer hover:border-[#e33b5f]/30" onClick={() => setSelectedStartup(s)}>
                  <div className="w-8 h-8 rounded-lg bg-[#f6f6f6] flex items-center justify-center mb-2 border border-[#e8e8e8]">
                    {/* [COMPANY LOGO PLACEHOLDER] */}
                    <Building2 className="w-4 h-4 text-[#9e9e9e]" />
                  </div>
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


      {/* Startup Detail Modal */}
      <Dialog open={!!selectedStartup} onOpenChange={() => setSelectedStartup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Startup Profile</DialogTitle>
          </DialogHeader>
          {selectedStartup && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#f6f6f6] border border-[#e8e8e8] flex items-center justify-center flex-shrink-0">
                  {/* [COMPANY LOGO PLACEHOLDER] */}
                  <Building2 className="w-8 h-8 text-[#d0d0d0]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#222]">{selectedStartup.name}</h2>
                  {/* [COMPANY NAME] */}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary">{selectedStartup.sector}</Badge>
                    <Badge variant="outline">{selectedStartup.stage}</Badge>
                    <Badge className={`text-xs ${selectedStartup.status === 'Active' ? 'bg-[#e33b5f]/10 text-[#e33b5f]' : 'bg-[#f07969]/10 text-[#f07969]'}`}>{selectedStartup.status}</Badge>
                  </div>
                </div>
              </div>

              {/* Description placeholder */}
              <div className="p-3 bg-[#f6f6f6] rounded-lg border border-dashed border-[#d0d0d0]">
                <p className="text-xs text-[#9e9e9e] italic">
                  {selectedStartup.description || '[Company description will appear here]'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 bg-[#fbfbfb] rounded-lg">
                  <p className="text-xs text-[#9e9e9e]">Founded</p>
                  <p className="font-medium text-[#222]">{selectedStartup.founded || '[Year]'}</p>
                </div>
                <div className="p-2 bg-[#fbfbfb] rounded-lg">
                  <p className="text-xs text-[#9e9e9e]">Team Size</p>
                  <p className="font-medium text-[#222]">{selectedStartup.team || '[Team size]'}</p>
                </div>
                <div className="p-2 bg-[#fbfbfb] rounded-lg">
                  <p className="text-xs text-[#9e9e9e]">ROI</p>
                  <p className={`font-bold ${selectedStartup.roi.startsWith('+') ? 'text-[#e33b5f]' : 'text-red-600'}`}>{selectedStartup.roi}</p>
                </div>
                <div className="p-2 bg-[#fbfbfb] rounded-lg">
                  <p className="text-xs text-[#9e9e9e]">Website</p>
                  <p className="font-medium text-[#222] truncate">{selectedStartup.website || '[Website]'}</p>
                </div>
              </div>

              {/* Links */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#555353]">
                  <Linkedin className="w-4 h-4 text-[#9e9e9e]" />
                  <span className="text-[#9e9e9e] italic">{selectedStartup.companyLinkedIn || '[Company LinkedIn URL]'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#555353]">
                  <FileText className="w-4 h-4 text-[#9e9e9e]" />
                  <span className="text-[#9e9e9e] italic">{selectedStartup.pitchDeck || '[Pitch Deck URL]'}</span>
                </div>
              </div>

              {/* More info placeholder */}
              {selectedStartup.moreInfo && (
                <div className="p-3 bg-[#f6f6f6] rounded-lg">
                  <p className="text-xs text-[#7e7e7e]">{selectedStartup.moreInfo}</p>
                </div>
              )}
              {!selectedStartup.moreInfo && (
                <div className="p-3 bg-[#f6f6f6] rounded-lg border border-dashed border-[#d0d0d0]">
                  <p className="text-xs text-[#9e9e9e] italic">[Additional information, metrics, milestones etc. will appear here]</p>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => setSelectedStartup(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
