'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard, FileText, Users, Settings, Bell, Handshake, Lightbulb, LogOut,
  Menu, X, ChevronRight, FolderOpen, Calendar, MessageSquare, Bot, BarChart3,
  Mail, Star, Shield, FileCheck, MessageCircle,
} from 'lucide-react';
import type { Page, DashboardRole } from './types';
import { roleBadgeConfig } from './types';

interface Props {
  navigate: (page: Page) => void;
  role: DashboardRole;
  setRole: (role: DashboardRole) => void;
  currentPage: Page;
  children: React.ReactNode;
}

const roleLabels: Record<DashboardRole, string> = {
  'super-admin': 'Super Admin',
  admin: 'Admin',
  shareholder: 'Shareholder',
  'idea-owner': 'Idea Owner',
  founder: 'Founder',
  user: 'User / Prospect',
  'waiting-list': 'Waiting List',
};

interface NavItem {
  icon: React.ElementType;
  label: string;
  page: Page;
  roles?: DashboardRole[];
  hideFor?: DashboardRole[];
}

// Standard access roles — get the same base pages
const standardRoles: DashboardRole[] = ['shareholder', 'founder', 'idea-owner', 'user'];

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard',       page: 'dashboard' },
  { icon: Lightbulb,       label: 'Idea Submission', page: 'idea-submission' },
  { icon: Calendar,        label: 'Calendar',        page: 'calendar',          hideFor: ['waiting-list'] },
  { icon: MessageSquare,   label: 'Discussion Rooms',page: 'discussion-rooms',  hideFor: ['waiting-list'] },
  { icon: Bot,             label: 'AI Assistant',    page: 'ai-assistant' },
  { icon: FolderOpen,      label: 'Documents',       page: 'documents',         hideFor: ['waiting-list'] },
  { icon: Handshake,       label: 'Shareholders',    page: 'partners',          hideFor: ['waiting-list'] },
  // Idea Ranking — admin/super-admin only
  { icon: BarChart3,       label: 'Idea Ranking',    page: 'idea-ranking',      roles: ['admin', 'super-admin', 'idea-owner'] },
  // Agreements — admin/super-admin only (it's an assignment/management page)
  { icon: FileText,        label: 'Agreements',      page: 'agreements',        roles: ['admin', 'super-admin'] },
  { icon: Bell,            label: 'Notifications',   page: 'notifications' },
  { icon: Settings,        label: 'Settings',        page: 'settings' },
];

const waitlistNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', page: 'dashboard' },
  { icon: FileCheck, label: 'KYC & Onboarding', page: 'kyc-onboarding' },
  { icon: Bell, label: 'Notifications', page: 'notifications' },
  { icon: Settings, label: 'Settings', page: 'settings' },
];

function getNavItems(role: DashboardRole): NavItem[] {
  if (role === 'waiting-list') return waitlistNavItems;
  return navItems.filter(item => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.hideFor && item.hideFor.includes(role)) return false;
    return true;
  });
}

export default function DashboardLayout({ navigate, role, setRole, currentPage, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNav = (page: Page) => {
    navigate(page);
    setSidebarOpen(false);
  };

  const roleBadgeKey = role as keyof typeof roleBadgeConfig;
  const badgeInfo = roleBadgeConfig[roleBadgeKey];
  const visibleNav = getNavItems(role);
  const isAdmin = role === 'admin' || role === 'super-admin';
  const isVEP = isAdmin;
  const isMAB = isAdmin;

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#141414] flex flex-col transform transition-transform lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 flex items-center gap-3 border-b border-white/10">
          <button onClick={() => handleNav('dashboard')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo-light-mid.png" alt="1KLeaders" className="h-8 object-contain" />
          </button>
          <button className="ml-auto lg:hidden text-white" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>

        <ScrollArea className="flex-1 p-3">
          <div className="mb-4">
            <p className="text-xs text-[#7e7e7e] uppercase tracking-wider mb-2 px-2">Role</p>
            <Select value={role} onValueChange={(v) => setRole(v as DashboardRole)}>
              <SelectTrigger className="w-full text-sm bg-white/10 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Separator className="mb-3 bg-white/10" />
          <nav className="space-y-1">
            {visibleNav.map(item => (
              <button key={item.page} onClick={() => handleNav(item.page)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === item.page ? 'bg-gradient-to-r from-[#e33b5f]/20 to-[#E65F5C]/20 text-[#f07969]' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <item.icon className="w-4 h-4" />{item.label}
              </button>
            ))}
          </nav>

          {/* VEP/MAB tools */}
          {isVEP && (
            <>
              <Separator className="my-3 bg-white/10" />
              <p className="text-xs text-[#7e7e7e] uppercase tracking-wider mb-2 px-2">Evaluation</p>
              <button onClick={() => handleNav('vep-dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === 'vep-dashboard' ? 'bg-[#e33b5f]/20 text-[#f07969]' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <Star className="w-4 h-4" />VEP Dashboard
              </button>
              {isMAB && (
                <button onClick={() => handleNav('mab-dashboard')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === 'mab-dashboard' ? 'bg-[#e33b5f]/20 text-[#f07969]' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                  <Shield className="w-4 h-4" />MAB Dashboard
                </button>
              )}
            </>
          )}

          {/* Admin-only tools */}
          {isAdmin && (
            <>
              <Separator className="my-3 bg-white/10" />
              <p className="text-xs text-[#7e7e7e] uppercase tracking-wider mb-2 px-2">Admin Tools</p>
              <button onClick={() => handleNav('admin-dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === 'admin-dashboard' ? 'bg-[#e33b5f]/20 text-[#f07969]' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <Shield className="w-4 h-4" />Admin Dashboard
              </button>
              <button onClick={() => handleNav('newsletter-tracking')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${currentPage === 'newsletter-tracking' ? 'bg-[#e33b5f]/20 text-[#f07969]' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                <Mail className="w-4 h-4" />Newsletter Tracking
              </button>
            </>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-white/10">
          <button onClick={() => navigate('landing')} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-white/5 hover:text-white transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#f0f0f0] px-4 lg:px-6 h-14 flex items-center gap-4">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 text-sm text-[#7e7e7e]">
            <span>Dashboard</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#222] font-medium">{roleLabels[role]}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {badgeInfo && (
              <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${badgeInfo.color}`}>
                {badgeInfo.icon} {badgeInfo.label}
              </span>
            )}
            <button onClick={() => handleNav('notifications')} className="relative p-2 hover:bg-[#f6f6f6] rounded-lg transition">
              <Bell className="w-5 h-5 text-[#555353]" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#e33b5f] rounded-full" />
            </button>
            <button onClick={() => handleNav('ai-assistant')} className="p-2 hover:bg-[#e33b5f]/5 rounded-lg transition" title="AI Assistant">
              <Bot className="w-5 h-5 text-[#e33b5f]" />
            </button>
            <button onClick={() => handleNav('profile')}>
              <Avatar className="w-8 h-8"><AvatarFallback className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white text-xs font-semibold">1K</AvatarFallback></Avatar>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
