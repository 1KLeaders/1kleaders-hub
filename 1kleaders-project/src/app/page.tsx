'use client';
import { useState } from 'react';
import type { Page, DashboardRole } from '@/components/1k-leaders/types';
import { useAuth } from '@/context/auth-context';
import LandingPage from '@/components/1k-leaders/landing-page';
import WaitlistForm from '@/components/1k-leaders/waitlist-form';
import LoginPage from '@/components/1k-leaders/login-page';
import OnboardingKYC from '@/components/1k-leaders/onboarding-kyc';
import FirstLoginFlow from '@/components/1k-leaders/first-login-flow';
import DashboardLayout from '@/components/1k-leaders/dashboard-layout';
import DashboardHome from '@/components/1k-leaders/dashboard-home';
import IdeaSubmission from '@/components/1k-leaders/idea-submission';
import IdeaRanking from '@/components/1k-leaders/idea-ranking';
import AgreementsPage from '@/components/1k-leaders/agreements-page';
import DocumentsPage from '@/components/1k-leaders/documents-page';
import PartnersPage from '@/components/1k-leaders/partners-page';
import SettingsPage from '@/components/1k-leaders/settings-page';
import NotificationsPage from '@/components/1k-leaders/notifications-page';
import ProfilePage from '@/components/1k-leaders/profile-page';
import CalendarPage from '@/components/1k-leaders/calendar-page';
import DiscussionRooms from '@/components/1k-leaders/discussion-rooms';
import RecommendationsPage from '@/components/1k-leaders/recommendations-page';
import NewsletterTracking from '@/components/1k-leaders/newsletter-tracking';
import VEPDashboard from '@/components/1k-leaders/vep-dashboard';
import { SuperAdminDashboard } from '@/components/1k-leaders/super-admin-dashboard';
import StartupPage from '@/components/1k-leaders/startup-page';
import BugReportPage from '@/components/1k-leaders/bug-report-page';
import CohortManagement from '@/components/1k-leaders/cohort-management';
import QualityReview from '@/components/1k-leaders/quality-review';
import MABEvaluation from '@/components/1k-leaders/mab-evaluation';
import OnboardingTracker from '@/components/1k-leaders/onboarding-tracker';

function MABDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">🛡️ MAB Dashboard</h1>
        <p className="text-[#7e7e7e]">Management Advisory Board — evaluate startups using MAB criteria</p>
      </div>
      <div className="p-8 text-center bg-white rounded-xl border border-[#f0f0f0]">
        <p className="text-[#9e9e9e] text-sm">MAB Dashboard coming soon — criteria: Product & Tech, Product Market Fit, Risk Assessment, Business Model, Team</p>
      </div>
    </div>
  );
}

const dashboardPages: Page[] = [
  'dashboard', 'idea-submission', 'idea-ranking', 'agreements', 'documents',
  'partners', 'settings', 'notifications', 'profile', 'calendar',
  'discussion-rooms', 'ai-assistant', 'newsletter-tracking',
  'vep-dashboard', 'mab-dashboard', 'recommendations', 'admin-dashboard',
  'startup-page', 'bug-report', 'onboarding-tracker', 'cohort-management', 'onboarding',
];

export default function Home() {
  const { session, profile, role, devViewRole, setDevViewRole, isDeveloper, loading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  const navigate = (page: Page) => setCurrentPage(page);

  // ── Loading splash ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f6f6]">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-red-mid.png" alt="1KLeaders" className="h-10 object-contain animate-pulse" />
          <p className="text-sm text-[#9e9e9e]">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Authenticated user: first-login flow ──────────────────────────────────
  if (session && profile?.is_first_login) {
    return <FirstLoginFlow onComplete={() => setCurrentPage('dashboard')} />;
  }

  // ── Authenticated user: hub ───────────────────────────────────────────────
  if (session && profile) {
    // If they landed on a public page after auth, redirect to dashboard
    if (!dashboardPages.includes(currentPage)) {
      setCurrentPage('dashboard');
    }

    const renderContent = () => {
      switch (currentPage) {
        case 'dashboard':         return <DashboardHome role={role} navigate={navigate} />;
        case 'idea-submission':   return <IdeaSubmission role={role} navigate={navigate} />;
        case 'idea-ranking':      return <IdeaRanking />;
        case 'agreements':        return <AgreementsPage role={role} />;
        case 'documents':         return <DocumentsPage role={role} />;
        case 'partners':          return <PartnersPage role={role} navigate={navigate} />;
        case 'settings':          return <SettingsPage />;
        case 'notifications':     return <NotificationsPage navigate={navigate} role={role} />;
        case 'profile':           return <ProfilePage navigate={navigate} />;
        case 'calendar':          return <CalendarPage role={role} />;
        case 'discussion-rooms':  return <DiscussionRooms role={role} />;
        case 'ai-assistant':      return <RecommendationsPage />;
        case 'newsletter-tracking': return <NewsletterTracking />;
        case 'vep-dashboard':     return <VEPDashboard />;
        case 'mab-dashboard':     return <MABDashboard />;
        case 'admin-dashboard':   return <SuperAdminDashboard onNavigate={navigate} />;
        case 'onboarding-tracker': return <OnboardingTracker />;
        case 'cohort-management':   return <CohortManagement />;
        case 'quality-review':     return <QualityReview />;
        case 'mab-evaluation':     return <MABEvaluation />;
        case 'startup-page':      return <StartupPage />;
        case 'bug-report':        return <BugReportPage />;
        case 'onboarding':        return <OnboardingKYC navigate={navigate} />;
        case 'recommendations':   return <RecommendationsPage />;
        default:                  return <DashboardHome role={role} navigate={navigate} />;
      }
    };

    return (
      <DashboardLayout
        navigate={navigate}
        role={role}
        // Developer role switcher — only passed when isDeveloper
        devViewRole={isDeveloper ? devViewRole : undefined}
        setDevViewRole={isDeveloper ? setDevViewRole : undefined}
        isDeveloper={isDeveloper}
        currentPage={currentPage}
        onSignOut={signOut}
      >
        {renderContent()}
      </DashboardLayout>
    );
  }

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (currentPage === 'waitlist')      return <WaitlistForm navigate={navigate} />;
  if (currentPage === 'login' || currentPage === 'partner-login' || currentPage === 'idea-owner-login') {
    return <LoginPage navigate={navigate} />;
  }
  if (currentPage === 'onboarding')    return <OnboardingKYC navigate={navigate} />;

  return <LandingPage navigate={navigate} />;
}
