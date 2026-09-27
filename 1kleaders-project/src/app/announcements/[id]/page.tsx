// src/app/announcements/[id]/page.tsx
// Public page — no auth required. Only published External Use announcements are shown,
// read-only (no comments/reactions), and nothing else from the Hub is exposed.
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-server';
import AnnouncementView from '@/components/1k-leaders/announcement-view';
import { excerpt, type Announcement } from '@/lib/announcements';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getPublicAnnouncement(id: string) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await supabaseAdmin
    .from('announcements')
    .select('id, title, description, category, visibility, meta, attachments, blocks, content, media_url')
    .eq('id', id)
    .eq('visibility', 'external_use')
    .eq('is_published', true)
    .maybeSingle();
  return data as Pick<Announcement, 'id' | 'title' | 'description' | 'category' | 'visibility' | 'meta' | 'attachments' | 'blocks' | 'content' | 'media_url'> | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ann = await getPublicAnnouncement(id);
  if (!ann) return { title: 'Announcement — 1K Leaders', robots: { index: false } };
  const description = excerpt(ann, 180);
  return {
    title: `${ann.title} — 1K Leaders`,
    description,
    openGraph: { title: ann.title, description, siteName: '1K Leaders', type: 'article' },
    twitter: { card: 'summary', title: ann.title, description },
  };
}

export default async function PublicAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ann = await getPublicAnnouncement(id);

  return (
    <div className="min-h-screen bg-[#f6f6f6]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif', colorScheme: 'light' }}>
      <header className="bg-[#141414]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="https://1kleaders.com">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/logos_1KL-Hub_Horizontal_Light.png" alt="1K Leaders" style={{ height: 26, width: 'auto' }} />
          </a>
          <a href="https://1kleaders.com" className="text-xs text-white/60 hover:text-white transition">1kleaders.com →</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {ann ? (
          <AnnouncementView
            ann={ann}
            footerNote={<>Shared from <a href="https://1kleaders.com" className="text-[#e33b5f] hover:underline">1000 Leaders Holdings</a>.</>}
          />
        ) : (
          <div className="bg-white border border-[#f0f0f0] rounded-2xl p-10 text-center">
            <h1 className="text-xl font-bold text-[#222] mb-2">Announcement not available</h1>
            <p className="text-sm text-[#7e7e7e]">This link may have expired, or the announcement is private to 1K Leaders members.</p>
          </div>
        )}
      </main>
    </div>
  );
}
