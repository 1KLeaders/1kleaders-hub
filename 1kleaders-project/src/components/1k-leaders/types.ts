export type Page =
  | 'landing'
  | 'waitlist'
  | 'login'
  | 'partner-login'
  | 'idea-owner-login'
  | 'onboarding'
  | 'kyc-onboarding'
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
  | 'vvp-assignments'
  | 'newsletter-tracking'
  | 'vep-dashboard'
  | 'mab-dashboard'
  | 'recommendations';

export type DashboardRole =
  | 'partner'
  | 'super-admin'
  | 'admin'
  | 'shareholder'
  | 'investor'
  | 'idea-owner'
  | 'user'
  | 'waiting-list'
  | 'temporary';

export type DashboardPriority = 'startups' | 'ideas' | 'balanced';

export type RoleBadge = 'partner' | 'shareholder' | 'investor' | 'idea-owner' | 'admin' | 'super-admin' | 'user' | 'vvp';

export const roleBadgeConfig: Record<RoleBadge, { label: string; color: string; icon: string }> = {
  partner: { label: 'Partner', color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20', icon: '🤝' },
  shareholder: { label: 'Shareholder', color: 'bg-[#E65F5C]/10 text-[#E65F5C] border-[#E65F5C]/20', icon: '🏛️' },
  investor: { label: 'Investor', color: 'bg-[#f07969]/10 text-[#f07969] border-[#f07969]/20', icon: '💰' },
  'idea-owner': { label: 'Idea Owner', color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20', icon: '💡' },
  admin: { label: 'Admin', color: 'bg-[#141414]/10 text-[#141414] border-[#141414]/20', icon: '⚙️' },
  'super-admin': { label: 'Super Admin', color: 'bg-[#e33b5f]/10 text-[#e33b5f] border-[#e33b5f]/20', icon: '🛡️' },
  user: { label: 'User', color: 'bg-[#555353]/10 text-[#555353] border-[#555353]/20', icon: '👤' },
  vvp: { label: 'VVP', color: 'bg-[#E65F5C]/10 text-[#E65F5C] border-[#E65F5C]/20', icon: '🎯' },
};

/** Pages accessible to idea-owners / co-founders only (restricted access) */
export const IDEA_OWNER_PAGES: Page[] = [
  'dashboard', 'idea-submission', 'notifications', 'profile', 'ai-assistant', 'settings',
];

/** Pages accessible to waiting-list / temporary users */
export const WAITING_LIST_PAGES: Page[] = [
  'dashboard', 'kyc-onboarding', 'notifications', 'profile', 'settings',
];
