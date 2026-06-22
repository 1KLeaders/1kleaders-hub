export type Page =
  | 'landing'
  | 'waitlist'
  | 'login'
  | 'partner-login'
  | 'idea-owner-login'
  | 'onboarding'
  | 'dashboard'
  | 'idea-submission'
  | 'idea-ranking'
  | 'agreements'
  | 'documents'
  | 'partners'
  | 'settings'
  | 'notifications'
  | 'profile'
  | 'calendar'
  | 'discussion-rooms'
  | 'ai-assistant'
  | 'newsletter-tracking'
  | 'vep-dashboard'
  | 'mab-dashboard'
  | 'admin-dashboard'
  | 'startup-page'
  | 'bug-report'
  | 'onboarding-tracker'
  | 'recommendations';

// Main access roles — controls what pages/nav items a user sees
// 'user' = regular member (no shareholding)
// 'shareholder' = full partner with shareholding
// Idea Owner, Founder, VEP Builder, MAB Builder are subrole badges
// that can be applied to either 'user' or 'shareholder'
export type DashboardRole =
  | 'shareholder'
  | 'super-admin'
  | 'admin'
  | 'user'
  | 'developer';

// Subrole badges — layered on top of the main role
export type SubRole =
  | 'idea-owner'
  | 'founder'
  | 'vep-builder'
  | 'mab-builder';

export type DashboardPriority = 'startups' | 'ideas' | 'balanced';

// Badges used for display throughout the UI
export type RoleBadge =
  | 'shareholder'
  | 'idea-owner'
  | 'founder'
  | 'vep-builder'
  | 'mab-builder'
  | 'admin'
  | 'super-admin'
  | 'user';

export const roleBadgeConfig: Record<RoleBadge, { label: string; color: string; icon: string }> = {
  shareholder:   { label: 'Shareholder',   color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20',     icon: '🏛️' },
  'idea-owner':  { label: 'Idea Owner',    color: 'bg-amber-100 text-amber-700 border-amber-200',            icon: '💡' },
  founder:       { label: 'Founder',       color: 'bg-purple-100 text-purple-700 border-purple-200',         icon: '🚀' },
  'vep-builder': { label: 'VEP Builder',   color: 'bg-blue-100 text-blue-700 border-blue-200',               icon: '🔬' },
  'mab-builder': { label: 'MAB Builder',   color: 'bg-emerald-100 text-emerald-700 border-emerald-200',      icon: '🛡️' },
  admin:         { label: 'Admin',         color: 'bg-[#141414]/10 text-[#141414] border-[#141414]/20',      icon: '⚙️' },
  'super-admin': { label: 'Super Admin',   color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20',     icon: '🛡️' },
  user:          { label: 'User',          color: 'bg-[#555353]/10 text-[#555353] border-[#555353]/20',      icon: '👤' },
};

export const subRoleConfig: Record<SubRole, { label: string; color: string; icon: string }> = {
  'idea-owner':  roleBadgeConfig['idea-owner'],
  founder:       roleBadgeConfig['founder'],
  'vep-builder': roleBadgeConfig['vep-builder'],
  'mab-builder': roleBadgeConfig['mab-builder'],
};

// Custom badges created by super-admins at runtime
export type CustomBadge = {
  id: string;
  label: string;
  color: string;
  icon: string;
  created_by: string;
  created_at: string;
};


