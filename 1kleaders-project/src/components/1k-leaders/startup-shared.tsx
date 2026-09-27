'use client';
// Shared startup UI: logo rendering, update-post attachments, uploads
import { FileText, Download, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseMediaUrl } from '@/lib/announcements';
import { MediaEmbedView } from './announcement-view';

export type TeamMember = { name: string; role: string; photo?: string; bio?: string; linkedin?: string };

export type Startup = {
  id: string; name: string; tagline: string | null; description: string | null;
  logo_url: string | null; cover_url: string | null; website: string | null; linkedin_url: string | null;
  industry: string | null; sector: string | null; stage: string | null; status: string | null; location: string | null;
  founded_year: number | null; team_size: string | null; deck_url: string | null;
  problem: string | null; solution: string | null; market_size: string | null; traction: string | null;
  team: TeamMember[] | null; primary_color: string | null; accent_color: string | null;
  is_visible: boolean; sort_order: number | null;
};

export type UpdateAttachment = {
  kind: 'image' | 'video' | 'audio' | 'file' | 'link';
  url: string; name?: string; size?: number; mime?: string;
};

export const STARTUP_BUCKET = 'startup-media';

export function kindForFile(file: File): UpdateAttachment['kind'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

export async function uploadStartupFile(startupId: string, file: File, folder: string): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${startupId}/${folder}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage.from(STARTUP_BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw new Error(error.message);
  return supabase.storage.from(STARTUP_BUCKET).getPublicUrl(path).data.publicUrl;
}

export function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Logos are shown whole on a white tile (object-contain) so they're never cropped,
// with only a thin inset so they fill the tile instead of looking zoomed out.
export function StartupLogo({ startup, size = 48, rounded = 'rounded-xl', className = '' }: {
  startup: { name: string; logo_url: string | null; accent_color?: string | null; primary_color?: string | null };
  size?: number; rounded?: string; className?: string;
}) {
  const pad = Math.max(2, Math.round(size * 0.06));
  const style = { width: size, height: size };
  if (startup.logo_url) {
    return (
      <div className={`bg-white border border-[#eeeeee] overflow-hidden flex items-center justify-center shrink-0 ${rounded} ${className}`} style={{ ...style, padding: pad }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={startup.logo_url} alt={startup.name} className="w-full h-full object-contain" loading="lazy" />
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center shrink-0 font-black text-white ${rounded} ${className}`}
      style={{ ...style, fontSize: size * 0.42, background: startup.accent_color ?? startup.primary_color ?? '#e33b5f' }}>
      {startup.name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

// Renders a post's attachments: image grid, then players, then files and links
export function UpdateAttachments({ items }: { items: UpdateAttachment[] }) {
  if (!items?.length) return null;
  const images = items.filter(a => a.kind === 'image');
  const others = items.filter(a => a.kind !== 'image');

  return (
    <div className="space-y-3 mt-3">
      {images.length > 0 && (
        <div className={`grid gap-1.5 rounded-xl overflow-hidden ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.slice(0, 4).map((img, i) => (
            <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer"
              className={`relative block bg-[#f6f6f6] ${images.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.name ?? ''} loading="lazy"
                className={`w-full ${images.length === 1 ? 'max-h-[480px] object-contain' : 'h-full min-h-40 max-h-72 object-cover'}`} />
              {i === 3 && images.length > 4 && (
                <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">+{images.length - 4}</span>
              )}
            </a>
          ))}
        </div>
      )}
      {others.map(a => {
        if (a.kind === 'video') return <video key={a.url} src={a.url} controls preload="metadata" className="w-full rounded-xl bg-[#141414] max-h-[480px]" />;
        if (a.kind === 'audio') return <audio key={a.url} src={a.url} controls preload="metadata" className="w-full" />;
        if (a.kind === 'link') {
          const embed = parseMediaUrl(a.url);
          if (embed && embed.kind !== 'link') return <MediaEmbedView key={a.url} url={a.url} caption={a.name} />;
          return (
            <a key={a.url} href={a.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border border-[#e8e8e8] rounded-xl hover:border-[#e33b5f]/40 transition">
              <ExternalLink className="w-4 h-4 text-[#9e9e9e] shrink-0" />
              <span className="text-sm text-[#555353] truncate">{a.name || a.url}</span>
            </a>
          );
        }
        const isPdf = a.mime === 'application/pdf' || a.url.toLowerCase().split('?')[0].endsWith('.pdf');
        return (
          <div key={a.url} className="border border-[#e8e8e8] rounded-xl overflow-hidden">
            {isPdf && <iframe src={a.url} title={a.name} className="w-full h-80 border-0 bg-[#f6f6f6] hidden sm:block" loading="lazy" />}
            <a href={a.url} target="_blank" rel="noopener noreferrer" download
              className="flex items-center gap-3 p-3 hover:bg-[#fafafa] transition">
              <div className="w-9 h-9 rounded-lg bg-[#e33b5f]/10 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-[#e33b5f]" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#222] truncate">{a.name ?? 'Document'}</p>
                <p className="text-xs text-[#9e9e9e]">{[a.name?.split('.').pop()?.toUpperCase(), formatBytes(a.size)].filter(Boolean).join(' · ')}</p>
              </div>
              <Download className="w-4 h-4 text-[#9e9e9e] shrink-0" />
            </a>
          </div>
        );
      })}
    </div>
  );
}
