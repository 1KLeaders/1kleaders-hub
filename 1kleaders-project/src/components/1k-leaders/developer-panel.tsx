'use client';
// Developer tools — only rendered for accounts whose real role is 'developer'.
// Jump to any page (regardless of role), preview every screen outside the dashboard
// (login, registration, password reset, first-login…), and view the Hub as any role.
import { useState, useEffect } from 'react';
import { Wrench, X, ExternalLink, Search, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type { Page, DashboardRole } from './types';

export type DevScreen =
  | 'landing' | 'login' | 'login-expired' | 'waitlist' | 'reset-password'
  | 'first-login' | 'first-login-details' | 'registration-details' | 'loading';

export const DEV_SCREENS: { id: DevScreen; label: string; note: string }[] = [
  { id: 'landing',              label: 'Landing page',                        note: 'Legacy public landing screen' },
  { id: 'login',                label: 'Login',                               note: 'Sign-in + forgot password (sends a real reset email)' },
  { id: 'login-expired',        label: 'Login — expired reset link',          note: 'What people see after opening an old reset/magic link' },
  { id: 'waitlist',             label: 'Registration (waitlist) form',        note: 'Preview — submission is not saved' },
  { id: 'reset-password',       label: 'Set new password (after reset link)', note: 'Preview — your password is not changed' },
  { id: 'first-login',          label: 'First-login flow',                    note: 'Preview — password/profile are not changed' },
  { id: 'first-login-details',  label: 'First-login flow (admin-started)',    note: 'Includes the "Your Details" registration step' },
  { id: 'registration-details', label: 'Registration details step',           note: 'Preview — not saved' },
  { id: 'loading',              label: 'Loading splash',                      note: '' },
];

const PAGE_GROUPS: { title: string; pages: [Page | string, string][] }[] = [
  { title: 'Member', pages: [
    ['dashboard', 'Dashboard'], ['announcements', 'Announcements'], ['startups', 'Startups'],
    ['idea-submission', 'Idea Submission'], ['idea-status', 'My Idea Status'], ['calendar', 'Calendar'],
    ['attendance-leaderboard', 'Leaderboard'], ['discussion-rooms', 'Discussion Rooms'], ['documents', 'Documents'],
    ['agreements', 'Documents → Agreements'], ['forms', 'Forms'], ['partners', 'Shareholders directory'],
    ['onboarding', 'KYC & Onboarding'], ['notifications', 'Notifications'], ['profile', 'My Profile'],
    ['settings', 'Settings'], ['bug-report', 'Report a Bug'], ['ai-assistant', 'AI Assistant'],
    ['recommendations', 'Recommendations'], ['startup-page', 'My Startup (founder)'], ['demo-day', 'Demo Day'],
  ] },
  { title: 'Admin', pages: [
    ['admin-dashboard', 'Admin Dashboard'], ['onboarding-tracker', 'Onboarding Tracker'], ['cohort-management', 'Cohort Management'],
    ['quality-review', 'Quality Review'], ['fellowship-applications', 'Fellowship Apps'], ['contributions', 'Contributions'],
    ['shareholder-activity', 'Shareholder Activity'], ['user-import', 'User Import'], ['newsletter-tracking', 'Newsletter Tracking'],
    ['idea-ranking', 'Idea Ranking'], ['vep-dashboard', 'VEP Dashboard'], ['mab-dashboard', 'MAB Dashboard'],
  ] },
];

const ROLES: DashboardRole[] = ['developer', 'super-admin', 'admin', 'shareholder', 'user'];

type Item = { id: string; label: string; extra?: string };

export default function DeveloperPanel({ currentPage, navigate, onScreen }: {
  currentPage: string; navigate: (p: Page) => void; onScreen: (s: DevScreen) => void;
}) {
  const { isDeveloper, role, setDevViewRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'pages' | 'screens' | 'role'>('pages');
  const [q, setQ] = useState('');
  const [dyn, setDyn] = useState<{ announcements: Item[]; startups: Item[]; forms: Item[]; people: Item[] } | null>(null);

  useEffect(() => {
    if (!open || dyn) return;
    Promise.all([
      supabase.from('announcements').select('id, title, visibility, is_published').order('created_at', { ascending: false }).limit(30),
      supabase.from('startups').select('id, name').order('name'),
      supabase.from('forms').select('id, title, purpose').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, first_name, last_name, email, role').order('first_name').limit(300),
    ]).then(([a, s, f, p]) => setDyn({
      announcements: (a.data ?? []).map(x => ({ id: x.id, label: x.title, extra: `${x.visibility === 'external_use' ? 'external' : 'members'}${x.is_published ? '' : ' · draft'}` })),
      startups: (s.data ?? []).map(x => ({ id: x.id, label: x.name })),
      forms: (f.data ?? []).map(x => ({ id: x.id, label: x.title, extra: x.purpose === 'kyc' ? 'KYC' : undefined })),
      people: (p.data ?? []).map(x => ({ id: x.id, label: `${x.first_name ?? ''} ${x.last_name ?? ''}`.trim() || x.email, extra: x.role })),
    }));
  }, [open]);

  if (!isDeveloper) return null;

  const go = (p: string) => { navigate(p as Page); setOpen(false); };
  const match = (s: string) => !q || s.toLowerCase().includes(q.toLowerCase());
  const pill = (active: boolean) => `px-2.5 py-1.5 rounded-lg text-xs text-left transition border ${active ? 'bg-[#e33b5f] text-white border-[#e33b5f]' : 'bg-white text-[#333] border-[#eee] hover:border-[#e33b5f]/50'}`;

  function dynamicGroup(title: string, prefix: string, items: Item[] | undefined, extraLink?: (i: Item) => string | null) {
    const shown = (items ?? []).filter(i => match(`${i.label} ${i.extra ?? ''}`));
    if (!shown.length) return null;
    return (
      <div>
        <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1.5">{title}</p>
        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
          {shown.map(i => (
            <div key={i.id} className="flex items-center gap-1">
              <button onClick={() => go(`${prefix}${i.id}`)} className={`${pill(currentPage === `${prefix}${i.id}`)} flex-1 min-w-0 truncate`}>
                {i.label}{i.extra && <span className="opacity-60"> · {i.extra}</span>}
              </button>
              {extraLink?.(i) && (
                <a href={extraLink(i)!} target="_blank" rel="noopener noreferrer" title="Open public page" className="p-1.5 text-[#9e9e9e] hover:text-[#e33b5f]"><ExternalLink className="w-3.5 h-3.5" /></a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)} title="Developer tools"
        className="fixed bottom-6 left-6 lg:left-[272px] z-[60] h-11 px-3 rounded-full bg-[#141414] text-white shadow-lg hover:scale-105 transition flex items-center gap-1.5 text-xs font-semibold">
        <Wrench className="w-4 h-4" />Dev{role !== 'developer' && <span className="px-1.5 py-0.5 rounded-full bg-[#e33b5f] text-[10px]">as {role}</span>}
      </button>

      {open && (
        <div className="fixed bottom-20 left-4 lg:left-[268px] z-[60] w-[min(420px,calc(100vw-2rem))] max-h-[75vh] flex flex-col bg-white border border-[#e8e8e8] rounded-2xl shadow-2xl overflow-hidden text-[#222]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#f0f0f0] bg-[#141414] text-white">
            <Wrench className="w-4 h-4" /><span className="text-sm font-bold flex-1">Developer tools</span>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="flex border-b border-[#f0f0f0]">
            {(['pages', 'screens', 'role'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-semibold capitalize border-b-2 ${tab === t ? 'border-[#e33b5f] text-[#e33b5f]' : 'border-transparent text-[#7e7e7e]'}`}>
                {t === 'role' ? 'View as role' : t}
              </button>
            ))}
          </div>

          <div className="p-3 overflow-y-auto space-y-4">
            {tab === 'pages' && (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#9e9e9e]" />
                  <input className="w-full border border-[#eee] rounded-lg pl-8 pr-2 py-1.5 text-xs" placeholder="Search pages, announcements, startups, forms, people…"
                    value={q} onChange={e => setQ(e.target.value)} />
                </div>
                {PAGE_GROUPS.map(g => {
                  const shown = g.pages.filter(([id, label]) => match(`${id} ${label}`));
                  if (!shown.length) return null;
                  return (
                    <div key={g.title}>
                      <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider mb-1.5">{g.title}</p>
                      <div className="grid grid-cols-2 gap-1">
                        {shown.map(([id, label]) => <button key={id} onClick={() => go(id)} className={pill(currentPage === id)}>{label}</button>)}
                      </div>
                    </div>
                  );
                })}
                {!dyn ? <p className="text-xs text-[#9e9e9e]">Loading announcements, startups, forms…</p> : (
                  <>
                    {dynamicGroup('Announcements', 'announcement-', dyn.announcements,
                      i => i.extra?.startsWith('external') ? `/announcements/${i.id}` : null)}
                    {dynamicGroup('Startup pages', 'startup-', dyn.startups)}
                    {dynamicGroup('Forms (fill-in view)', 'form-', dyn.forms)}
                    {dynamicGroup('Shareholder profiles', 'partner-', dyn.people)}
                  </>
                )}
              </>
            )}

            {tab === 'screens' && (
              <>
                <p className="text-xs text-[#7e7e7e]">Screens people see outside the dashboard. Previews don&apos;t save anything; press “Exit preview” at the top to come back.</p>
                <div className="space-y-1">
                  {DEV_SCREENS.map(s => (
                    <button key={s.id} onClick={() => { onScreen(s.id); setOpen(false); }} className={`${pill(false)} w-full flex items-center gap-2`}>
                      <Eye className="w-3.5 h-3.5 text-[#e33b5f] shrink-0" />
                      <span className="flex-1">{s.label}{s.note && <span className="block text-[10px] text-[#9e9e9e]">{s.note}</span>}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-semibold text-[#9e9e9e] uppercase tracking-wider">Public pages (new tab)</p>
                <div className="space-y-1">
                  <a href="/fellowship" target="_blank" rel="noopener noreferrer" className={`${pill(false)} w-full flex items-center gap-2`}><ExternalLink className="w-3.5 h-3.5" />Fellowship application page</a>
                  <a href="/announcements/00000000-0000-0000-0000-000000000000" target="_blank" rel="noopener noreferrer" className={`${pill(false)} w-full flex items-center gap-2`}><ExternalLink className="w-3.5 h-3.5" />Public announcement — “not available” state</a>
                  <p className="text-[11px] text-[#9e9e9e]">External Use announcements have an ↗ link in the Pages tab.</p>
                </div>
              </>
            )}

            {tab === 'role' && (
              <>
                <p className="text-xs text-[#7e7e7e]">Changes the sidebar, menus and page permissions to match that role. Data access still follows your real developer role in the database.</p>
                <div className="space-y-1">
                  {ROLES.map(r => (
                    <button key={r} onClick={() => setDevViewRole(r)} className={`${pill(role === r)} w-full capitalize`}>
                      {r === 'developer' ? 'Developer (everything)' : r}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
