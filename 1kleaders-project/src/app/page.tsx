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
import AIAssistant from '@/components/1k-leaders/ai-assistant';
import VVPAssignments from '@/components/1k-leaders/vvp-assignments';
import NewsletterTracking from '@/components/1k-leaders/newsletter-tracking';
import VEPDashboard from '@/components/1k-leaders/vep-dashboard';
import MABDashboard from '@/components/1k-leaders/mab-dashboard';
import RecommendationsPage from '@/components/1k-leaders/recommendations-page';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const [dashboardRole, setDashboardRole] = useState<DashboardRole>('partner');

  const navigate = (page: Page) => setCurrentPage(page);

  // Landing & Auth pages
  if (currentPage === 'landing') return <LandingPage navigate={navigate} />;
  if (currentPage === 'waitlist') return <WaitlistForm navigate={navigate} />;
  if (currentPage === 'login') return <LoginPage navigate={navigate} onRoleSelect={setDashboardRole} />;
  if (currentPage === 'partner-login') return <LoginPage navigate={navigate} type="partner" onRoleSelect={setDashboardRole} />;
  if (currentPage === 'idea-owner-login') return <LoginPage navigate={navigate} type="idea-owner" onRoleSelect={setDashboardRole} />;
  if (currentPage === 'onboarding') return <OnboardingKYC navigate={navigate} />;

  // Dashboard pages - all wrapped in DashboardLayout
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
        return <DocumentsPage role={dashboardRole} />;
      case 'partners':
        return <PartnersPage navigate={navigate} />;
      case 'settings':
        return <SettingsPage />;
      case 'notifications':
        return <NotificationsPage navigate={navigate} />;
      case 'profile':
        return <ProfilePage navigate={navigate} role={dashboardRole} />;
      case 'calendar':
        return <CalendarPage role={dashboardRole} />;
      case 'discussion-rooms':
        return <DiscussionRooms role={dashboardRole} navigate={navigate} />;
      case 'ai-assistant':
        return <AIAssistant />;
      case 'vvp-assignments':
        return <VVPAssignments />;
      case 'newsletter-tracking':
        return <NewsletterTracking />;
      case 'vep-dashboard':
        return <VEPDashboard />;
      case 'mab-dashboard':
        return <MABDashboard />;
      case 'recommendations':
        return <RecommendationsPage />;
      case 'kyc-onboarding':
        return <OnboardingKYC navigate={navigate} />;
      default:
        return <DashboardHome role={dashboardRole} navigate={navigate} />;
    }
  };

  const dashboardPages: Page[] = [
    'dashboard', 'idea-submission', 'idea-ranking', 'agreements', 'documents',
    'partners', 'settings', 'notifications', 'profile', 'calendar',
    'discussion-rooms', 'ai-assistant', 'vvp-assignments', 'newsletter-tracking',
    'vep-dashboard', 'mab-dashboard', 'recommendations', 'kyc-onboarding',
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
