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
  logo_background?: 'white' | 'dark' | 'none' | null;
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

// Removes a solid (usually black) background from a logo and trims the empty padding around it.
// The background colour is read from the image's edges and flood-filled inwards, so dark parts
// *inside* the logo (e.g. black lettering) are kept. Edge pixels are softened so there's no halo.
export async function removeLogoBackground(src: string, tolerance = 48): Promise<{ blob: Blob; isLight: boolean }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not load the logo image'));
    i.src = src + (src.includes('?') ? '&' : '?') + 'cors=1'; // bypass any cached non-CORS copy
  });

  const w = img.naturalWidth, h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Background colour = average of the border pixels
  let r = 0, g = 0, b = 0, n = 0;
  const addBorder = (x: number, y: number) => { const k = (y * w + x) * 4; r += px[k]; g += px[k + 1]; b += px[k + 2]; n++; };
  for (let x = 0; x < w; x++) { addBorder(x, 0); addBorder(x, h - 1); }
  for (let y = 0; y < h; y++) { addBorder(0, y); addBorder(w - 1, y); }
  const bg = [r / n, g / n, b / n];
  const dist = (k: number) => Math.hypot(px[k] - bg[0], px[k + 1] - bg[1], px[k + 2] - bg[2]);

  // Flood fill from every border pixel that matches the background
  const isBg = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (x: number, y: number) => { const i = y * w + x; if (!isBg[i] && px[i * 4 + 3] > 0 && dist(i * 4) <= tolerance) { isBg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w, y = (i / w) | 0;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    if (isBg[i]) { px[k + 3] = 0; continue; }
    // Soften pixels touching the background: partial alpha + remove the background tint
    const x = i % w, y = (i / w) | 0;
    const touches = (x > 0 && isBg[i - 1]) || (x < w - 1 && isBg[i + 1]) || (y > 0 && isBg[i - w]) || (y < h - 1 && isBg[i + w]);
    if (!touches) continue;
    const a = Math.min(1, Math.max(0, (dist(k) - tolerance) / (tolerance * 2)));
    if (a < 1) {
      const alpha = Math.max(a, 0.15);
      for (let c = 0; c < 3; c++) px[k + c] = Math.max(0, Math.min(255, (px[k + c] - bg[c] * (1 - alpha)) / alpha));
      px[k + 3] = Math.round(px[k + 3] * alpha);
    }
  }
  ctx.putImageData(data, 0, 0);

  // Trim transparent padding (keeps a small margin) so the logo fills its tile.
  // Also measure how light the remaining logo is, to pick a tile background it stays visible on.
  let minX = w, minY = h, maxX = -1, maxY = -1, lum = 0, lumN = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = (y * w + x) * 4;
    if (px[k + 3] > 16) {
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      lum += 0.299 * px[k] + 0.587 * px[k + 1] + 0.114 * px[k + 2]; lumN++;
    }
  }
  if (maxX < 0) throw new Error('The whole image matched the background — nothing left to keep');
  const margin = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  const cx = Math.max(0, minX - margin), cy = Math.max(0, minY - margin);
  const cw = Math.min(w, maxX + margin + 1) - cx, ch = Math.min(h, maxY + margin + 1) - cy;
  const out = document.createElement('canvas');
  out.width = cw; out.height = ch;
  out.getContext('2d')!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch);

  const isLight = lumN > 0 && lum / lumN > 200;
  const blob = await new Promise<Blob>((resolve, reject) => out.toBlob(bl => bl ? resolve(bl) : reject(new Error('Could not export PNG')), 'image/png'));
  return { blob, isLight };
}

export function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Logos are shown whole on a white tile (object-contain) so they're never cropped,
// with only a thin inset so they fill the tile instead of looking zoomed out.
export function StartupLogo({ startup, size = 48, rounded = 'rounded-xl', className = '' }: {
  startup: { name: string; logo_url: string | null; accent_color?: string | null; primary_color?: string | null; logo_background?: string | null };
  size?: number; rounded?: string; className?: string;
}) {
  const pad = Math.max(2, Math.round(size * 0.06));
  const style = { width: size, height: size };
  if (startup.logo_url) {
    const tile = startup.logo_background === 'dark' ? 'bg-[#141414] border-[#141414]'
      : startup.logo_background === 'none' ? 'bg-transparent border-transparent'
      : 'bg-white border-[#eeeeee]';
    return (
      <div className={`${tile} border overflow-hidden flex items-center justify-center shrink-0 ${rounded} ${className}`} style={{ ...style, padding: pad }}>
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
