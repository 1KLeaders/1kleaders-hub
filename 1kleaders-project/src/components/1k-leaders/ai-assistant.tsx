'use client';
// AI Assistant is now merged into recommendations-page.tsx
// This file redirects to the combined page
import RecommendationsPage from './recommendations-page';

type Props = Record<string, never>;

export default function AIAssistant({}: Props) {
  return <RecommendationsPage />;
}
