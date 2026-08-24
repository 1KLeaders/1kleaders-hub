// src/app/fellowship/page.tsx
// Public page — no auth required
import FellowshipPage from '@/components/1k-leaders/fellowship-page';

export const metadata = {
  title: 'AI Venture Builder Fellowship — 1K Leaders',
  description: 'Apply to the 1K Leaders AI Venture Builder Fellowship. A six-month program for university students.',
};

export default function FellowshipRoute() {
  return <FellowshipPage />;
}
