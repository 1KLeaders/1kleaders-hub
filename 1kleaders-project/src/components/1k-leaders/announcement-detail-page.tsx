'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Share2, Link, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AnnouncementView from './announcement-view';
import AnnouncementEngagement from './announcement-engagement';
import type { Announcement } from '@/lib/announcements';

interface Props { announcementId: string; navigate?: (p: string) => void; }

export default function AnnouncementDetailPage({ announcementId, navigate }: Props) {
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    setLoading(true);
    // RLS only returns it if this user is in the audience (or is an admin)
    supabase.from('announcements').select('*').eq('id', announcementId).maybeSingle()
      .then(({ data }) => { setAnn(data as Announcement | null); setLoading(false); });
  }, [announcementId]);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.1kleaders.com'}/announcements/${announcementId}`;

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 3000);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[#9e9e9e]" />
    </div>
  );

  if (!ann) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-[#9e9e9e]">This announcement doesn't exist or isn't available to you.</p>
      {navigate && <Button variant="outline" onClick={() => navigate('announcements')}>Back to Announcements</Button>}
    </div>
  );

  const isExternal = ann.visibility === 'external_use';
  const canInteract = !isExternal && ann.allow_comments !== false && ann.is_published;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate?.('announcements')}
        className="flex items-center gap-1.5 text-sm text-[#9e9e9e] hover:text-[#222] transition">
        <ArrowLeft className="w-4 h-4" />Back to Announcements
      </button>

      <AnnouncementView
        ann={ann}
        headerActions={isExternal && ann.is_published ? (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowShare(s => !s)}>
            <Share2 className="w-3.5 h-3.5 mr-1" />Share
          </Button>
        ) : undefined}
        footerNote={isExternal
          ? '🌐 External Use — this announcement can be shared publicly. Comments and reactions are disabled.'
          : !ann.is_published ? '📝 Draft — only admins can see this.' : undefined}
      >
        {showShare && (
          <div className="px-5 sm:px-8 py-4 bg-[#f6f6f6] border-t border-[#f0f0f0] flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white border border-[#e8e8e8] rounded-lg px-3 py-1.5 flex-1 min-w-0">
              <Link className="w-3.5 h-3.5 text-[#9e9e9e] flex-shrink-0" />
              <span className="text-xs text-[#555353] truncate">{shareUrl}</span>
            </div>
            <Button size="sm" className="bg-[#e33b5f] text-white h-8 text-xs" onClick={copyLink}>
              {copied ? <><Check className="w-3.5 h-3.5 mr-1" />Copied!</> : <><Link className="w-3.5 h-3.5 mr-1" />Copy</>}
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, '_blank')}>WhatsApp</Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => window.open(`mailto:?subject=${encodeURIComponent(ann.title)}&body=${encodeURIComponent(shareUrl)}`, '_blank')}>Email</Button>
            <button onClick={() => setShowShare(false)}><X className="w-4 h-4 text-[#9e9e9e]" /></button>
          </div>
        )}
        {canInteract && <AnnouncementEngagement announcementId={ann.id} />}
      </AnnouncementView>
    </div>
  );
}
