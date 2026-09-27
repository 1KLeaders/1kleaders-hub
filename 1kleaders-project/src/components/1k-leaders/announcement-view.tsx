'use client';
// Renders an announcement exactly as readers see it. Shared by the in-app detail page,
// the editor's Preview mode and the public External Use page, so preview == reality.
import { Badge } from '@/components/ui/badge';
import { Globe, Lock, FileText, ExternalLink, Music, Film } from 'lucide-react';
import { getBlocks, parseMediaUrl, type Announcement, type Block } from '@/lib/announcements';

type ViewableAnnouncement = Pick<Announcement,
  'title' | 'description' | 'category' | 'visibility' | 'meta' | 'attachments' | 'blocks' | 'content' | 'media_url'>;

interface Props {
  ann: ViewableAnnouncement;
  headerActions?: React.ReactNode;   // e.g. Share button
  children?: React.ReactNode;        // rendered after the body (reactions/comments)
  footerNote?: React.ReactNode;
}

export function MediaEmbedView({ url, caption }: { url: string; caption?: string }) {
  const embed = parseMediaUrl(url);
  if (!embed) {
    return <p className="text-sm text-red-500 my-4">Invalid media URL: {url}</p>;
  }

  let body: React.ReactNode;
  switch (embed.kind) {
    case 'iframe': {
      const ratio = embed.aspect === 'video' ? 'pb-[56.25%]' : embed.aspect === 'tall' ? 'pb-[100%] sm:pb-[75%]' : '';
      body = embed.aspect === 'audio' ? (
        <iframe src={embed.src} title={caption ?? embed.provider} className="w-full h-[160px] rounded-xl border-0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />
      ) : (
        <div className={`relative w-full h-0 ${ratio} overflow-hidden rounded-xl bg-[#141414]`}>
          <iframe src={embed.src} title={caption ?? embed.provider} className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
        </div>
      );
      break;
    }
    case 'video':
      body = <video src={embed.src} controls preload="metadata" className="w-full rounded-xl bg-[#141414]" />;
      break;
    case 'audio':
      body = (
        <div className="flex items-center gap-3 bg-[#141414] rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-[#e33b5f] flex items-center justify-center shrink-0"><Music className="w-5 h-5 text-white" /></div>
          <audio src={embed.src} controls preload="metadata" className="flex-1 min-w-0" />
        </div>
      );
      break;
    case 'image':
      // eslint-disable-next-line @next/next/no-img-element
      body = <img src={embed.src} alt={caption ?? ''} className="w-full rounded-xl" loading="lazy" />;
      break;
    case 'link':
      body = (
        <a href={embed.href} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-4 border border-[#e8e8e8] rounded-xl hover:border-[#e33b5f]/40 hover:bg-[#e33b5f]/5 transition group">
          <div className="w-10 h-10 rounded-lg bg-[#f6f6f6] flex items-center justify-center shrink-0"><Film className="w-5 h-5 text-[#9e9e9e] group-hover:text-[#e33b5f]" /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#222] truncate">{caption || embed.host}</p>
            <p className="text-xs text-[#9e9e9e] truncate">{embed.href}</p>
          </div>
          <ExternalLink className="w-4 h-4 text-[#9e9e9e] shrink-0" />
        </a>
      );
      break;
  }

  return (
    <figure className="my-6">
      {body}
      {caption && embed.kind !== 'link' && <figcaption className="text-xs text-[#9e9e9e] text-center mt-2">{caption}</figcaption>}
    </figure>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.type === 'media') return block.url ? <MediaEmbedView url={block.url} caption={block.caption} /> : null;
  if (!block.html?.trim()) return null;
  return <div className="announcement-body" dangerouslySetInnerHTML={{ __html: block.html }} />;
}

export default function AnnouncementView({ ann, headerActions, children, footerNote }: Props) {
  const isExternal = ann.visibility === 'external_use';
  const blocks = getBlocks(ann);

  return (
    <article className="bg-white border border-[#f0f0f0] rounded-2xl overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#e33b5f] to-[#f07969]" />

      <header className="px-5 sm:px-8 pt-8 pb-6 border-b border-[#f0f0f0]">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase">{ann.category}</span>
            {isExternal
              ? <Badge className="bg-[#e33b5f]/10 text-[#e33b5f] border-0 text-xs flex items-center gap-1"><Globe className="w-3 h-3" />External Use</Badge>
              : <Badge className="bg-[#f0f0f0] text-[#555353] border border-[#e0e0e0] text-xs flex items-center gap-1"><Lock className="w-3 h-3" />Members Only</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {headerActions}
            {ann.meta && <span className="text-xs text-[#9e9e9e]">{ann.meta}</span>}
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222] tracking-tight leading-tight break-words">
          {ann.title || <span className="text-[#c0c0c0]">Untitled announcement</span>}
        </h1>
        {ann.description && <p className="text-base text-[#7e7e7e] mt-3">{ann.description}</p>}
      </header>

      <div className="px-5 sm:px-8 py-6">
        {blocks.length === 0
          ? <p className="text-sm text-[#9e9e9e] italic">No content yet.</p>
          : blocks.map(b => <BlockView key={b.id} block={b} />)}
      </div>

      {ann.attachments && ann.attachments.length > 0 && (
        <div className="px-5 sm:px-8 pb-6">
          <div className="border-t border-[#f0f0f0] pt-5">
            <p className="text-xs font-bold tracking-widest text-[#9e9e9e] uppercase mb-3">Attachments</p>
            <div className="flex flex-wrap gap-2">
              {ann.attachments.map((att, i) => (
                <a key={i} href={att.url} download target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[#f6f6f6] border border-[#e8e8e8] rounded-lg text-sm hover:border-[#e33b5f]/40 hover:bg-[#e33b5f]/5 transition group max-w-full">
                  <FileText className="w-4 h-4 text-[#9e9e9e] group-hover:text-[#e33b5f] shrink-0" />
                  <span className="text-[#555353] font-medium truncate">{att.name}</span>
                  {att.size ? <span className="text-xs text-[#9e9e9e] shrink-0">({(att.size / 1024).toFixed(1)} KB)</span> : null}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {children}

      {footerNote && (
        <div className="px-5 sm:px-8 py-4 border-t border-[#f0f0f0] bg-[#fafafa] text-xs text-[#9e9e9e]">{footerNote}</div>
      )}

      <style>{`
        .announcement-body { font-family: Manrope, sans-serif; font-size: 1rem; color: #444; line-height: 1.8; overflow-wrap: anywhere; }
        .announcement-body h1 { font-size: 2rem; font-weight: 800; color: #222; margin: 1.5rem 0 0.75rem; line-height: 1.2; }
        .announcement-body h2 { font-size: 1.5rem; font-weight: 700; color: #222; margin: 1.25rem 0 0.6rem; }
        .announcement-body h3 { font-size: 1.25rem; font-weight: 600; color: #222; margin: 1rem 0 0.5rem; }
        .announcement-body p  { margin: 0.75rem 0; }
        .announcement-body blockquote { border-left: 3px solid #e33b5f; margin: 1.25rem 0; padding: 0.75rem 1.25rem; color: #555; font-style: italic; background: #fef9f9; border-radius: 0 8px 8px 0; }
        .announcement-body ul { list-style: disc; margin: 0.75rem 0 0.75rem 1.75rem; }
        .announcement-body ol { list-style: decimal; margin: 0.75rem 0 0.75rem 1.75rem; }
        .announcement-body li { margin: 0.35rem 0; }
        .announcement-body a  { color: #e33b5f; text-decoration: underline; }
        .announcement-body hr { border: none; border-top: 1px solid #f0f0f0; margin: 1.5rem 0; }
        .announcement-body img { max-width: 100%; border-radius: 8px; margin: 0.75rem 0; }
        .announcement-body figure { margin: 1.25rem 0; }
        .announcement-body figcaption { font-size: 0.75rem; color: #9e9e9e; text-align: center; margin-top: 6px; }
        .announcement-body video { max-width: 100%; border-radius: 8px; }
        .announcement-body iframe { max-width: 100%; border-radius: 8px; }
        .announcement-body strong { color: #222; font-weight: 700; }
      `}</style>
    </article>
  );
}
