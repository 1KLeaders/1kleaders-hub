'use client';
import { useState } from 'react';
import type { Page, DashboardRole } from '@/components/1k-leaders/types';
import LandingPage from '@/components/1k-leaders/landing-page';
import WaitlistForm from '@/components/1k-leaders/waitlist-form';
import LoginPage from '@/components/1k-leaders/login-page';
import OnboardingKYC from '@/components/1k-leaders/onboarding-kyc';
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

// MAB Dashboard (inline placeholder since no separate file yet)
function MABDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#222] flex items-center gap-2">
          🛡️ MAB Dashboard
        </h1>
        <p className="text-[#7e7e7e]">Management Advisory Board — evaluate startups using MAB criteria</p>
      </div>
      <div className="p-8 text-center bg-white rounded-xl border border-[#f0f0f0]">
        <p className="text-[#9e9e9e] text-sm">MAB Dashboard coming soon — criteria: Product & Tech, Product Market Fit, Risk Assessment, Business Model, Team</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [dashboardRole, setDashboardRole] = useState<DashboardRole>('shareholder');

  const navigate = (page: Page) => setCurrentPage(page);

  if (currentPage === 'landing') return <LandingPage navigate={navigate} />;
  if (currentPage === 'waitlist') return <WaitlistForm navigate={navigate} />;
  if (currentPage === 'login') return <LoginPage navigate={navigate} onRoleSelect={setDashboardRole} />;
  if (currentPage === 'partner-login') return <LoginPage navigate={navigate} type="partner" onRoleSelect={setDashboardRole} />;
  if (currentPage === 'idea-owner-login') return <LoginPage navigate={navigate} type="idea-owner" onRoleSelect={setDashboardRole} />;
  if (currentPage === 'onboarding') return <OnboardingKYC navigate={navigate} />;

  const renderDashboardContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardHome role={dashboardRole} navigate={navigate} />;
      case 'idea-submission':
        return <IdeaSubmission role={dashboardRole} navigate={navigate} />;
      case 'idea-ranking':
        return <IdeaRanking />;
      case 'agreements':
        return <AgreementsPage />;
      case 'documents':
        return <DocumentsPage />;
      case 'partners':
        return <PartnersPage role={dashboardRole} navigate={navigate} />;
      case 'settings':
        return <SettingsPage />;
      case 'notifications':
        return <NotificationsPage navigate={navigate} role={dashboardRole} />;
      case 'profile':
        return <ProfilePage navigate={navigate} />;
      case 'calendar':
        return <CalendarPage role={dashboardRole} />;
      case 'discussion-rooms':
        return <DiscussionRooms role={dashboardRole} />;
      case 'ai-assistant':
        return <RecommendationsPage />;
      case 'newsletter-tracking':
        return <NewsletterTracking />;
      case 'vep-dashboard':
        return <VEPDashboard />;
      case 'mab-dashboard':
        return <MABDashboard />;
      case 'admin-dashboard':
        return <SuperAdminDashboard onNavigate={navigate} />;
      case 'recommendations':
        return <RecommendationsPage />;
      default:
        return <DashboardHome role={dashboardRole} navigate={navigate} />;
    }
  };

  const dashboardPages: Page[] = [
    'dashboard', 'idea-submission', 'idea-ranking', 'agreements', 'documents',
    'partners', 'settings', 'notifications', 'profile', 'calendar',
    'discussion-rooms', 'ai-assistant', 'newsletter-tracking',
    'vep-dashboard', 'mab-dashboard', 'recommendations', 'admin-dashboard',
  ];

  if (dashboardPages.includes(currentPage)) {
    return (
      <DashboardLayout navigate={navigate} role={dashboardRole} setRole={setDashboardRole} currentPage={currentPage}>
        {renderDashboardContent()}
      </DashboardLayout>
    );
  }

  return <LandingPage navigate={navigate} />;
}
