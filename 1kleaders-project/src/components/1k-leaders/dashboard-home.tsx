'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TrendingUp, DollarSign, Users, Briefcase, ArrowUpRight, ArrowDownRight, Calendar, CheckCircle, Lightbulb, Rocket, Star, Bot, BarChart3, MessageSquare, Loader2 } from 'lucide-react';
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

type LiveIdea = {
  id: string;
  title: string;
  sector: string | null;
  stage: string | null;
  status: string;
  vep_score: number | null;
  tagline: string | null;
  submitter_name?: string;
};

export default function DashboardHome({ role, navigate }: Props) {
  const { profile } = useAuth();
  const [priority, setPriority] = useState<DashboardPriority>('balanced');
  const [liveMetrics, setLiveMetrics] = useState<{ label: string; value: string; change: string; up: boolean; icon: any }[]>([]);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Live content
  const [approvedIdeas,  setApprovedIdeas]  = useState<LiveIdea[]>([]);
  const [topIdeas,       setTopIdeas]       = useState<LiveIdea[]>([]);
  const [recentActivity, setRecentActivity] = useState<{ text: string; time: string; type: string }[]>([]);
  const [expiringDocs,   setExpiringDocs]   = useState(0);
  const [selectedIdea,   setSelectedIdea]   = useState<LiveIdea | null>(null);
  const [contentLoading, setContentLoading] = useState(true);

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

  // Fetch live content (ideas, notifications, expiring docs)
  useEffect(() => {
    async function fetchContent() {
      setContentLoading(true);
      try {
        // Approved ideas (for startup highlights)
        const { data: approved } = await supabase
          .from('ideas')
          .select('id, title, sector, stage, status, vep_score, tagline, submitted_by')
          .eq('status', 'Approved')
          .order('vep_score', { ascending: false, nullsFirst: false })
          .limit(4);
        setApprovedIdeas((approved ?? []) as LiveIdea[]);

        // Top ranked ideas by VEP score
        const { data: top } = await supabase
          .from('ideas')
          .select('id, title, sector, stage, status, vep_score, tagline')
          .not('vep_score', 'is', null)
          .not('status', 'in', '("Draft","Rejected","Parked")')
          .order('vep_score', { ascending: false })
          .limit(5);
        setTopIdeas((top ?? []) as LiveIdea[]);

        // Recent notifications for current user
        if (profile) {
          const { data: notifs } = await supabase
            .from('notifications')
            .select('title, message, notification_type, created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false })
            .limit(4);
          setRecentActivity(
            (notifs ?? []).map(n => ({
              text: n.title,
              time: new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
              type: n.notification_type ?? 'info',
            }))
          );

          // Expiring KYC docs (uploaded but status not approved)
          const { count } = await supabase
            .from('kyc_documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('status', 'submitted');
          setExpiringDocs(count ?? 0);
        }
      } catch (e) {
        console.warn('Dashboard content fetch failed', e);
      }
      setContentLoading(false);
    }
    fetchContent();
  }, [profile?.id]);

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
            {contentLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#fbfbfb] animate-pulse">
                    <div className="w-2 h-2 rounded-full mt-2 bg-[#f0f0f0] flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-[#f0f0f0] rounded w-3/4" />
                      <div className="h-3 bg-[#f0f0f0] rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#fbfbfb]">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${a.type === 'success' ? 'bg-emerald-500' : a.type === 'warning' ? 'bg-[#f07969]' : a.type === 'action' ? 'bg-[#e33b5f]' : 'bg-[#555353]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#444]">{a.text}</p>
                      <p className="text-xs text-[#9e9e9e] mt-1">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Fall back to role-based static activity if no DB notifications yet
              <div className="space-y-3">
                {acts.length > 0 ? acts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#fbfbfb]">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${a.type === 'success' ? 'bg-[#e33b5f]' : a.type === 'warning' ? 'bg-[#f07969]' : 'bg-[#555353]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#444]">{a.text}</p>
                      <p className="text-xs text-[#9e9e9e] mt-1">{a.time}</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-[#9e9e9e] text-center py-4">No recent activity yet.</p>
                )}
              </div>
            )}
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
              <CardTitle className="text-base flex items-center gap-2"><Rocket className="w-5 h-5 text-[#e33b5f]" /> Approved Startups</CardTitle>
              <Button variant="ghost" size="sm" className="text-[#e33b5f]" onClick={() => navigate('idea-ranking')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            {contentLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3 border rounded-lg space-y-2 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-[#f0f0f0]" />
                    <div className="h-3 bg-[#f0f0f0] rounded w-3/4" />
                    <div className="h-3 bg-[#f0f0f0] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : approvedIdeas.length === 0 ? (
              <div className="text-center py-8 text-[#9e9e9e] text-sm">
                <Rocket className="w-8 h-8 mx-auto mb-2 text-[#d0d0d0]" />
                No approved startups yet. They will appear here once ideas complete the evaluation pipeline.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {approvedIdeas.map(idea => (
                  <div key={idea.id} className="p-3 border rounded-lg hover:shadow-md transition cursor-pointer hover:border-[#e33b5f]/30"
                    onClick={() => setSelectedIdea(idea)}>
                    <div className="w-8 h-8 rounded-lg bg-[#e33b5f]/10 flex items-center justify-center mb-2">
                      <Lightbulb className="w-4 h-4 text-[#e33b5f]" />
                    </div>
                    <h4 className="font-semibold text-sm text-[#222] truncate">{idea.title}</h4>
                    {idea.tagline && <p className="text-xs text-[#7e7e7e] truncate mt-0.5 italic">"{idea.tagline}"</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {idea.sector && <Badge variant="secondary" className="text-xs">{idea.sector}</Badge>}
                      {idea.stage  && <Badge variant="outline"   className="text-xs">{idea.stage}</Badge>}
                    </div>
                    {idea.vep_score != null && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                          <div className="h-full bg-[#e33b5f] rounded-full" style={{ width: `${idea.vep_score}%` }} />
                        </div>
                        <span className="text-xs text-[#e33b5f] font-medium">{idea.vep_score}</span>
                      </div>
                    )}
                    <Badge className="mt-2 text-xs bg-emerald-100 text-emerald-700">✓ Approved</Badge>
                  </div>
                ))}
              </div>
            )}
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
            {contentLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-[#f0f0f0]" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-[#f0f0f0] rounded w-1/2" />
                      <div className="h-3 bg-[#f0f0f0] rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : topIdeas.length === 0 ? (
              <div className="text-center py-8 text-[#9e9e9e] text-sm">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 text-[#d0d0d0]" />
                No scored ideas yet. Ideas will appear here once VEP evaluations are submitted.
              </div>
            ) : (
              <div className="space-y-2">
                {topIdeas.map((idea, i) => (
                  <div key={idea.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-[#f6f6f6] transition cursor-pointer"
                    onClick={() => navigate('idea-ranking')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${i === 0 ? 'bg-[#f07969]/10 text-[#f07969]' : 'bg-[#f0f0f0] text-[#555353]'}`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#222] truncate">{idea.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {idea.sector && <Badge variant="secondary" className="text-xs">{idea.sector}</Badge>}
                          <Badge className={`text-xs ${idea.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>{idea.status}</Badge>
                        </div>
                      </div>
                    </div>
                    {idea.vep_score != null && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-16 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden hidden sm:block">
                          <div className="h-full bg-[#e33b5f] rounded-full" style={{ width: `${idea.vep_score}%` }} />
                        </div>
                        <span className="text-sm font-bold text-[#e33b5f]">{idea.vep_score}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Automated Admission Letter Banner — admin only, real count */}
      {(role === 'admin' || role === 'super-admin' || role === 'developer') && (
        <Card className="border-[#e33b5f]/20 bg-[#e33b5f]/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#e33b5f]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#e33b5f]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#222]">Automated Admission Letters</p>
                <p className="text-xs text-[#7e7e7e]">Invite emails are sent automatically when you approve applicants from the Admin Dashboard.</p>
              </div>
              <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] text-xs">Active</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KYC document alert — real count */}
      {expiringDocs > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#222]">KYC Documents Pending Review</p>
                <p className="text-xs text-[#7e7e7e]">{expiringDocs} document{expiringDocs !== 1 ? 's' : ''} submitted and awaiting admin review.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('onboarding')}>View Status</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Idea detail modal */}
      <Dialog open={!!selectedIdea} onOpenChange={() => setSelectedIdea(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Idea Profile</DialogTitle>
          </DialogHeader>
          {selectedIdea && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#e33b5f]/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-7 h-7 text-[#e33b5f]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#222]">{selectedIdea.title}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selectedIdea.sector && <Badge variant="secondary">{selectedIdea.sector}</Badge>}
                    {selectedIdea.stage  && <Badge variant="outline">{selectedIdea.stage}</Badge>}
                    <Badge className="text-xs bg-emerald-100 text-emerald-700">✓ Approved</Badge>
                  </div>
                </div>
              </div>
              {selectedIdea.tagline && (
                <p className="text-sm text-[#555353] italic">"{selectedIdea.tagline}"</p>
              )}
              {selectedIdea.vep_score != null && (
                <div>
                  <p className="text-xs text-[#9e9e9e] mb-1">VEP Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                      <div className="h-full bg-[#e33b5f] rounded-full" style={{ width: `${selectedIdea.vep_score}%` }} />
                    </div>
                    <span className="text-sm font-bold text-[#e33b5f]">{selectedIdea.vep_score}/100</span>
                  </div>
                </div>
              )}
              <Button className="w-full bg-[#e33b5f] text-white" onClick={() => { setSelectedIdea(null); navigate('idea-ranking'); }}>
                View in Idea Ranking
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setSelectedIdea(null)}>Close</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
