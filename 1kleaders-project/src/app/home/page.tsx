// src/app/home/page.tsx  (or src/app/page.tsx if replacing the hub root)
// This is the 1kleaders.com landing page reconstruction
import HomePage from '@/components/1k-leaders/home-page';

export const metadata = {
  title: '1000 Leaders: Venture Builder and Community - Invent, Build, Scale',
  description: 'We are a start-up venture builder that is transforming ideas into scalable start-ups through dedicated regional expertise.',
};

export default function HomeRoute() {
  return <HomePage />;
}
