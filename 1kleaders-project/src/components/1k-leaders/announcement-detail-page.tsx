'use client';
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Globe, Lock, Share2, FileText, Link, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Announcement = {
  id: string; created_at: string; title: string; category: string;
  visibility: string; content: string | null; meta: string | null;
  cta: string | null; media_url: string | null;
  attachments: { name: string; url: string; size?: number }[] | null;
  is_published: boolean;
};

interface Props { announcementId: string; navigate?: (p: string) => void; }

export default function AnnouncementDetailPage({ announcementId, navigate }: Props) {
  const [ann, setAnn] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    supabase.from('announcements').select('*').eq('id', announcementId).single()
      .then(({ data }) => { setAnn(data as Announcement); setLoading(false); });
  }, [announcementId]);

  function copyLink() {
    const url = `${window.location.origin}/announcements/${announcementId}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 3000);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[#9e9e9e]" />
    </div>
  );

  if (!ann) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p className="text-sm text-[#9e9e9e]">Announcement not found.</p>
      {navigate && <Button variant="outline" onClick={() => navigate('announcements')}>Back</Button>}
    </div>
  );

  const isExternal = ann.visibility === 'external_use';
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.1kleaders.com'}/announcements/${announcementId}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => navigate?.('announcements')}
        className="flex items-center gap-1.5 text-sm text-[#9e9e9e] hover:text-[#222] transition">
        <ArrowLeft className="w-4 h-4" />Back to Announcements
      </button>

      {/* Article */}
      <article className="bg-white border border-[#f0f0f0] rounded-2xl overflow-hidden">
        {/* Top bar */}
        <div className="h-1 bg-gradient-to-r from-[#e33b5f] to-[#f07969]" />

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-[#f0f0f0]">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase">{ann.category}</span>
              {isExternal
                ? <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] border-0 text-xs flex items-center gap-1"><Globe className="w-3 h-3" />External Use</Badge>
                : <Badge className="bg-[#f0f0f0] text-[#555353] border border-[#e0e0e0] text-xs flex items-center gap-1"><Lock className="w-3 h-3" />Shareholders Only</Badge>
              }
            </div>
            <div className="flex items-center gap-2">
              {isExternal && (
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowShare(s => !s)}>
                  <Share2 className="w-3.5 h-3.5 mr-1" />Share
                </Button>
              )}
              <span className="text-xs text-[#9e9e9e]">{ann.meta}</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-[#222] tracking-tight leading-tight">{ann.title}</h1>
        </div>

        {/* Share bar */}
        {showShare && (
          <div className="px-8 py-4 bg-[#f6f6f6] border-b border-[#f0f0f0] flex items-center gap-3 flex-wrap">
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

        {/* Podcast player */}
        {ann.category === 'Podcast' && ann.media_url && (
          <div className="mx-8 mt-6 bg-[#141414] rounded-xl p-5 flex items-center gap-4">
            <a href={ann.media_url} target="_blank" rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-[#e33b5f] flex items-center justify-center hover:opacity-90 transition flex-shrink-0">
              <span className="text-white text-xl">▶</span>
            </a>
            <div>
              <p className="text-sm font-semibold text-white">{ann.title}</p>
              <p className="text-xs text-white/60 mt-0.5">{ann.meta}</p>
            </div>
          </div>
        )}

        {/* Rich content — rendered as HTML */}
        {ann.content && (
          <div className="px-8 py-6 announcement-body"
            dangerouslySetInnerHTML={{ __html: ann.content }} />
        )}

        {/* Attachments */}
        {ann.attachments && ann.attachments.length > 0 && (
          <div className="px-8 pb-6 pt-0">
            <div className="border-t border-[#f0f0f0] pt-5">
              <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-3">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {ann.attachments.map((att, i) => (
                  <a key={i} href={att.url} download target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-[#f6f6f6] border border-[#e8e8e8] rounded-lg text-sm hover:border-[#e33b5f]/40 hover:bg-[#e33b5f]/5 transition group">
                    <FileText className="w-4 h-4 text-[#9e9e9e] group-hover:text-[#e33b5f]" />
                    <span className="text-[#555353] font-medium">{att.name}</span>
                    {att.size && <span className="text-xs text-[#9e9e9e]">({(att.size / 1024).toFixed(1)} KB)</span>}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-4 border-t border-[#f0f0f0] flex items-center justify-between flex-wrap gap-3 bg-[#fafafa]">
          <p className="text-xs text-[#9e9e9e]">
            {isExternal ? '🌐 This announcement can be shared publicly.' : '🔒 This announcement is for shareholders only.'}
          </p>
          <button onClick={() => navigate?.('announcements')} className="text-xs text-[#9e9e9e] hover:text-[#222] transition">
            ← Back to all announcements
          </button>
        </div>
      </article>

      <style>{`
        .announcement-body { font-family: Manrope, sans-serif; font-size: 1rem; color: #444; line-height: 1.8; }
        .announcement-body h1 { font-size: 2rem; font-weight: 800; color: #222; margin: 1.5rem 0 0.75rem; }
        .announcement-body h2 { font-size: 1.5rem; font-weight: 700; color: #222; margin: 1.25rem 0 0.6rem; }
        .announcement-body h3 { font-size: 1.25rem; font-weight: 600; color: #222; margin: 1rem 0 0.5rem; }
        .announcement-body p  { margin: 0.75rem 0; }
        .announcement-body blockquote { border-left: 3px solid #e33b5f; margin: 1.25rem 0; padding: 0.75rem 1.25rem; color: #555; font-style: italic; background: #fef9f9; border-radius: 0 8px 8px 0; }
        .announcement-body ul, .announcement-body ol { margin: 0.75rem 0 0.75rem 1.75rem; }
        .announcement-body li { margin: 0.35rem 0; }
        .announcement-body a  { color: #e33b5f; text-decoration: underline; }
        .announcement-body hr { border: none; border-top: 1px solid #f0f0f0; margin: 1.5rem 0; }
        .announcement-body img { max-width: 100%; border-radius: 8px; margin: 0.75rem 0; }
        .announcement-body figure { margin: 1.25rem 0; }
        .announcement-body figcaption { font-size: 0.75rem; color: #9e9e9e; text-align: center; margin-top: 6px; }
        .announcement-body video { max-width: 100%; border-radius: 8px; }
        .announcement-body iframe { border-radius: 8px; }
        .announcement-body strong { color: #222; font-weight: 700; }
      `}</style>
    </div>
  );
}
